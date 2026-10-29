import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { SophiaEngine } from './core/engine.js';
import { computeBookReserve, sameReserve } from './core/layout.js';
import { defaultMaskUrl, defaultAnchors, ORIGINAL_GLB_BYTES } from './assets.js';
import { DEFAULT_LABELS, DEFAULT_BOOK_PAGES } from './content.js';
import { useMediaQuery } from './hooks.js';
import { ControlDock } from './ui/ControlDock.jsx';
import { BookPanel } from './ui/BookPanel.jsx';
import { StatsPanel } from './ui/StatsPanel.jsx';
import { IconCube, IconBook, IconStar } from './ui/icons.jsx';

/**
 * <SophiaPresentation /> — apresentação 3D interativa da Sophia (Fase 7A).
 *
 * Isolado: depende só de `react` e `three`. O contêiner ocupa 100 % do pai
 * (dê altura ao pai). O GLB é o original do Tripo, servido sem modificações.
 *
 * Movimento: apenas transformações RÍGIDAS do objeto inteiro (flutuação,
 * inclinação, câmera). Sem rig, skinning, morph targets ou deformação.
 */
export const SophiaPresentation = forwardRef(function SophiaPresentation(props, ref) {
  const {
    modelUrl = '/models/sophia.glb',
    maskUrl = defaultMaskUrl,
    anchors = defaultAnchors,
    posterUrl = null,
    expectedSha256 = null,
    expectedBytes = ORIGINAL_GLB_BYTES,
    bookPages = DEFAULT_BOOK_PAGES,
    labels: labelOverrides,
    quality = 'auto',
    governor = true,
    wheelZoom = 'always',
    enablePan = false,
    touchGuard = 'auto',
    defaultPaused,
    defaultEffects = true,
    effectIntensity = 1,
    showControls = true,
    showHotspots = true,
    showStats = false,
    debug = false,
    continuous = false,
    className = '',
    style,
    onReady,
    onMetrics,
    onError,
    onBookToggle,
  } = props;

  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides, phases: { ...DEFAULT_LABELS.phases, ...labelOverrides?.phases }, announce: { ...DEFAULT_LABELS.announce, ...labelOverrides?.announce } }), [labelOverrides]);

  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const guardActive = touchGuard === 'auto' ? coarse : !!touchGuard;

  const uid = useId();
  const keysId = `${uid}-keys`;
  const hintId = `${uid}-hint`;
  const lastLevel = useRef(0);
  const rootRef = useRef(null);
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const bookBtnRef = useRef(null);
  // Hotspots: o registro no motor segue a identidade REAL de cada nó (ref de callback), não o ciclo do efeito.
  const pinNodes = useRef({ book: null, constellation: null });
  const pinRegs = useRef(new Map()); // kind -> { engine, el, off }
  const cb = useRef({});
  cb.current = { onReady, onMetrics, onError, onBookToggle, labels, anchors };

  const [status, setStatus] = useState('loading'); // loading | ready | error | nowebgl
  const [phase, setPhase] = useState('download');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [paused, setPaused] = useState(() => (defaultPaused !== undefined ? defaultPaused : reduced));
  const [effects, setEffects] = useState(defaultEffects);
  const [bookOpen, setBookOpen] = useState(false);
  const [explore, setExplore] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [toast, setToast] = useState('');
  const [live, setLive] = useState('');
  const [ctxLost, setCtxLost] = useState(false);

  const announce = useCallback((msg) => { setLive(''); requestAnimationFrame(() => setLive(msg)); }, []);

  // Foco de reserva quando um pin fica oculto estando focado: o controle visível equivalente na barra.
  const fallbackFor = useCallback((kind) => () => {
    const root = rootRef.current;
    if (!root) return null;
    const action = kind === 'book' ? 'book' : 'effects';
    return root.querySelector(`[data-sp-action="${action}"]`) || root;
  }, []);

  /** Reconcilia UM pin: cancela registro de nó antigo/outro motor e registra o nó vivo atual (sem duplicar). */
  const syncPin = useCallback((kind) => {
    const engine = engineRef.current;
    const el = pinNodes.current[kind];
    const cur = pinRegs.current.get(kind);
    if (cur && (cur.engine !== engine || cur.el !== el || !el?.isConnected)) { cur.off(); pinRegs.current.delete(kind); }
    if (engine && el && el.isConnected && !pinRegs.current.has(kind)) {
      pinRegs.current.set(kind, { engine, el, off: engine.registerHotspot(el, kind, { focusFallback: fallbackFor(kind) }) });
    }
  }, [fallbackFor]);
  const pinRefs = useMemo(() => ({
    book: (el) => { pinNodes.current.book = el; syncPin('book'); },
    constellation: (el) => { pinNodes.current.constellation = el; syncPin('constellation'); },
  }), [syncPin]);
  const initial = useRef({});
  initial.current = { paused, effects, reduced, guard: guardActive && !explore, effectIntensity };

  // ------------------------------------------------------------ ciclo de vida do motor
  useEffect(() => {
    const host = hostRef.current;
    setStatus('loading');
    setProgress(0);
    setPhase('download');
    const engine = new SophiaEngine(host, {
      modelUrl, maskUrl, anchors: cb.current.anchors, expectedBytes, expectedSha256, quality, governor,
      wheelZoom, enablePan, debug, continuous,
      initialPaused: initial.current.paused,
      initialEffects: initial.current.effects,
      reducedMotion: initial.current.reduced,
      touchGuard: initial.current.guard,
      effectIntensity: initial.current.effectIntensity,
    });
    engineRef.current = engine;
    if (debug) window.__sophia = { engine };
    syncPin('book');
    syncPin('constellation');

    const offs = [
      engine.on('progress', ({ progress: p }) => setProgress(p)),
      engine.on('phase', (p) => setPhase(p)),
      engine.on('wheelHint', () => { setToast(cb.current.labels.wheelHint); clearTimeout(engine._toastT); engine._toastT = setTimeout(() => setToast(''), 1600); }),
      engine.on('quality', ({ level }) => {
        const prev = lastLevel.current;
        lastLevel.current = level;
        announce(level > prev ? cb.current.labels.announce.quality(level) : cb.current.labels.announce.qualityUp(level));
      }),
      engine.on('contextLost', () => setCtxLost(true)),
      engine.on('contextRestored', ({ recovered } = {}) => { setCtxLost(false); if (recovered === false) { setToast(cb.current.labels.contextRecoveryFailed); clearTimeout(engine._toastT); engine._toastT = setTimeout(() => setToast(''), 4000); } }),
      engine.on('hotspotFocusMoved', () => announce(cb.current.labels.announce.pinFocusMoved)),
      engine.on('metrics', (m) => { cb.current.onMetrics?.(m); setMetrics(m); if (debug) window.__SOPHIA_METRICS__ = m; }),
    ];

    engine.start().then((started) => {
      if (engine._disposed || started === false) return;
      engine.setPaused(initial.current.paused);
      setStatus('ready');
      if (debug) window.__sophiaReady = true;
      cb.current.onReady?.(engine.getMetrics());
    }).catch((err) => {
      if (engine._disposed || err?.name === 'AbortError') return;
      console.error('[SophiaPresentation]', err);
      setErrorMsg(String(err?.message || err));
      setStatus(err?.code === 'webgl-unavailable' ? 'nowebgl' : 'error');
      if (debug) window.__sophiaError = String(err?.message || err);
      cb.current.onError?.(err);
    });

    return () => {
      offs.forEach((o) => o());
      clearTimeout(engine._toastT);
      for (const reg of pinRegs.current.values()) reg.off();
      pinRegs.current.clear();
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // O motor só é recriado quando mudam as entradas que exigem recarregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, maskUrl, quality, governor, wheelZoom, enablePan, expectedSha256, expectedBytes, debug, continuous, retryKey]);

  // ------------------------------------------------------------ estado → motor
  useEffect(() => { engineRef.current?.setPaused(paused); }, [paused, status]);
  useEffect(() => { engineRef.current?.setEffects(effects); }, [effects, status]);
  useEffect(() => { engineRef.current?.setEffectIntensity(effectIntensity); }, [effectIntensity, status]);
  useEffect(() => { engineRef.current?.setReducedMotion(reduced); }, [reduced, status]);
  useEffect(() => { if (reduced) setPaused(true); }, [reduced]);
  useEffect(() => { engineRef.current?.setTouchGuard(guardActive && !explore); }, [guardActive, explore, status]);
  useEffect(() => { if (!guardActive) setExplore(false); }, [guardActive]);

  // hotspots (fora do React: o motor posiciona os elementos a cada quadro). Os refs de callback já
  // registram/cancelam na montagem/desmontagem de cada nó; este efeito só reconcilia depois que o
  // conjunto de pins muda (pins ligados/desligados, efeitos, motor pronto), sem registros duplicados.
  useEffect(() => {
    syncPin('book');
    syncPin('constellation');
  }, [status, showHotspots, effects, syncPin]);

  // sair do modo "explorar" ao tocar fora do componente
  useEffect(() => {
    if (!explore) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setExplore(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [explore]);

  // Área segura do livro: mede o painel REAL (não assume breakpoint) e remede em qualquer mudança de
  // tamanho do contêiner/painel, de breakpoint (media query), de orientação ou de zoom. Ao fechar, trocar de
  // motor ou desmontar, a reserva volta a zero. Só chama o motor (que muda a projeção, não o layout): sem laço.
  useEffect(() => {
    if (!bookOpen || status !== 'ready') return undefined;
    const root = rootRef.current;
    const engine = engineRef.current;
    if (!root || !engine) return undefined;
    if (!engine.state.bookFocused) engine.focusBook(true); // motor recriado com o livro aberto: ressincroniza a câmera
    let raf = 0;
    let last = {};
    const measure = () => {
      raf = 0;
      const panel = root.querySelector('.sp7a-book');
      // offset*: medidas de layout, imunes à animação de entrada (transform) do painel
      const rel = panel && panel.offsetParent === root ? { left: panel.offsetLeft, top: panel.offsetTop, width: panel.offsetWidth, height: panel.offsetHeight } : null;
      const rect = panel && !rel ? (() => { const a = root.getBoundingClientRect(), b = panel.getBoundingClientRect(); return { left: b.left - a.left, top: b.top - a.top, width: b.width, height: b.height }; })() : rel;
      const area = computeBookReserve({ width: root.clientWidth, height: root.clientHeight }, rect);
      if (sameReserve(area, last)) return;
      last = area;
      engine.setSafeArea(area);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    const panelEl = root.querySelector('.sp7a-book');
    if (panelEl) ro.observe(panelEl);
    const mq = typeof matchMedia === 'function' ? matchMedia('(max-width: 759px)') : null;
    mq?.addEventListener('change', schedule);
    window.addEventListener('orientationchange', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mq?.removeEventListener('change', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      if (!engine._disposed) engine.setSafeArea({});
    };
  }, [bookOpen, status]);

  // ------------------------------------------------------------ ações
  const openBook = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setBookOpen(true);
    engine.focusBook(true);
    announce(cb.current.labels.announce.bookOpen);
    cb.current.onBookToggle?.(true);
  }, [announce]);

  const closeBook = useCallback(() => {
    const engine = engineRef.current;
    setBookOpen(false);
    engine?.setSafeArea({});
    engine?.focusBook(false);
    announce(cb.current.labels.announce.bookClosed);
    cb.current.onBookToggle?.(false);
  }, [announce]);

  const togglePause = useCallback(() => {
    announce(paused ? cb.current.labels.announce.resumed : cb.current.labels.announce.paused);
    setPaused(!paused);
  }, [announce, paused]);
  const resetCamera = useCallback(() => {
    engineRef.current?.resetCamera();
    announce(cb.current.labels.announce.reset);
  }, [announce]);
  const toggleEffects = useCallback(() => {
    announce(effects ? cb.current.labels.announce.effectsOff : cb.current.labels.announce.effectsOn);
    setEffects(!effects);
  }, [announce, effects]);
  const toggleBook = useCallback(() => (bookOpen ? closeBook() : openBook()), [bookOpen, closeBook, openBook]);

  useImperativeHandle(ref, () => ({
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    resetCamera,
    setEffects,
    openBook,
    closeBook,
    getMetrics: () => engineRef.current?.getMetrics() ?? null,
    get engine() { return engineRef.current; },
  }), [resetCamera, openBook, closeBook]);

  const onKeyDown = (e) => {
    if (e.target !== rootRef.current) return; // só quando o próprio contêiner tem foco
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p') { togglePause(); e.preventDefault(); return; }
    if (k === 'e') { toggleEffects(); e.preventDefault(); return; }
    if (k === 'b') { toggleBook(); e.preventDefault(); return; }
    if (k === 'escape') { if (explore) setExplore(false); return; }
    if (engineRef.current?.handleKey(e)) e.preventDefault();
  };

  const ready = status === 'ready';
  const showPoster = posterUrl && (status !== 'ready');

  return (
    <div
      ref={rootRef}
      className={`sp7a-root ${className}`}
      style={style}
      data-status={status}
      data-fx={effects ? 'on' : 'off'}
      data-explore={explore ? '1' : '0'}
      data-guard={guardActive && !explore ? '1' : '0'}
      data-reduced={reduced ? '1' : '0'}
      role="region"
      aria-label={labels.region}
      aria-roledescription="visualizador 3D"
      aria-describedby={keysId}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="sp7a-stage" aria-hidden="true">
        <div className="sp7a-moon" />
      </div>

      {showPoster && <img className="sp7a-poster" src={posterUrl} alt="" decoding="async" />}

      <div ref={hostRef} className="sp7a-host" role="img" aria-label={labels.canvas} />

      <p id={keysId} className="sp7a-sr">
        Teclado: setas giram a câmera, + e − ampliam, 0 redefine, P pausa o movimento, E alterna efeitos, B abre o livro.
      </p>

      {/* Pins ancorados em pontos 3D (posição atualizada pelo motor, fora do React) */}
      {showHotspots && (
        <div className="sp7a-pins" hidden={!ready}>
          <button ref={pinRefs.book} type="button" className="sp7a-pin" data-hidden="1" aria-label={labels.pinBook} title={labels.pinBook} onClick={(e) => { bookBtnRef.current = e.currentTarget; openBook(); }}>
            <span className="sp7a-pin-dot"><IconBook /></span>
          </button>
          {effects && (
            <button ref={pinRefs.constellation} type="button" className="sp7a-pin" data-hidden="1" aria-label={labels.pinConstellation} title={labels.pinConstellation} onClick={() => engineRef.current?.pulseConstellation()}>
              <span className="sp7a-pin-dot"><IconStar size={16} /></span>
            </button>
          )}
        </div>
      )}

      {/* Trava de rolagem em dispositivos de toque */}
      {ready && guardActive && !explore && (
        <button type="button" className="sp7a-explore" onClick={() => setExplore(true)} aria-describedby={hintId}>
          <IconCube /> {labels.explore}
        </button>
      )}
      {ready && guardActive && explore && (
        <button type="button" className="sp7a-exit" onClick={() => setExplore(false)}>{labels.exitExplore}</button>
      )}
      <p id={hintId} className="sp7a-sr">{labels.exploreHint}</p>

      {ready && showControls && (
        <ControlDock
          labels={labels}
          paused={paused}
          effects={effects}
          bookOpen={bookOpen}
          showStats={showStats}
          statsOpen={statsOpen}
          onTogglePause={togglePause}
          onResetCamera={resetCamera}
          onToggleEffects={toggleEffects}
          onToggleBook={(e) => { bookBtnRef.current = e?.currentTarget ?? bookBtnRef.current; toggleBook(); }}
          onToggleStats={() => setStatsOpen((v) => !v)}
        />
      )}

      <BookPanel labels={labels} pages={bookPages} open={bookOpen && ready} onClose={closeBook} returnFocusRef={bookBtnRef} />

      {showStats && statsOpen && (
        <StatsPanel metrics={metrics} onCopy={() => navigator.clipboard?.writeText(JSON.stringify(engineRef.current?.getMetrics(), null, 2))} />
      )}

      {status === 'loading' && (
        <div className="sp7a-loading" role="status" aria-live="polite">
          <div className="sp7a-spinner" aria-hidden="true" />
          <p className="sp7a-loading-title">{labels.loading}</p>
          <div className="sp7a-bar" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} /></div>
          <p className="sp7a-loading-phase">
            {labels.phases[phase]}
            {phase === 'download' && progress > 0 ? ` · ${Math.round(progress * 100)}%` : ''}
          </p>
        </div>
      )}

      {(status === 'error' || status === 'nowebgl') && (
        <div className="sp7a-fail" role="alert">
          <p>{status === 'nowebgl' ? labels.noWebgl : labels.error}</p>
          {status === 'error' && <p className="sp7a-fail-detail">{errorMsg}</p>}
          {status === 'error' && <button type="button" className="sp7a-btn" onClick={() => setRetryKey((k) => k + 1)}>{labels.retry}</button>}
        </div>
      )}

      {ctxLost && <div className="sp7a-toast" role="status">{labels.contextLost}</div>}
      {toast && <div className="sp7a-toast" role="status">{toast}</div>}
      <div className="sp7a-sr" aria-live="polite" role="status">{live}</div>
    </div>
  );
});
