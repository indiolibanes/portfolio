import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadSophiaModel, loadMaskTexture, uploadTexture } from './loader.js';
import { createStudioEnvironment } from './environment.js';
import { AbortError, ResourceScope, isAbortError, throwIfAborted } from './ownership.js';
import { GpuTimer } from './gpuTimer.js';
import { createLightRig } from './lighting.js';
import { createStarfield } from './starfield.js';
import { createConstellationFx } from './constellation.js';
import { CameraRig } from './cameraRig.js';
import { MotionState } from './motion.js';
import { PerformanceGovernor, QUALITY_LEVELS, QUALITY_PRESETS, pickQuality } from './governor.js';
import { FrameStats, estimateTextureBytes, mb } from './stats.js';
import { rayHitSpheres } from './raycast.js';
import { clamp, damp, fitDistance, safeAreaOffsetX, safeAreaOffsetY, DEG } from './math.js';

const GL_SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i;
const MODEL_HEIGHT = 1;
const MODEL_WIDTH = 0.84;
const FOV = 30;

const INERT_SUPPORTED = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;
const DEFAULT_BOOK = { position: [-0.23, 0.4, 0.2], normal: [0, 0.45, 0.89] };

/**
 * Motor imperativo da apresentação. O React só instancia, liga eventos e
 * repassa comandos; nada do laço de quadros passa pelo React.
 *
 * Invariantes (Fase 7A):
 *  - o GLB é carregado como está; nenhuma geometria/UV/material é alterado;
 *  - o único movimento do modelo é o do grupo-pivô (translação Y + rotações);
 *  - efeitos (shader/halos/céu) são externos e removíveis.
 */
export class SophiaEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.opts = {
      modelUrl: '/models/sophia.glb',
      maskUrl: null,
      anchors: null,
      expectedBytes: 0,
      expectedSha256: null,
      quality: 'auto',
      governor: true,
      wheelZoom: 'always', // 'always' | 'ctrl'
      enablePan: false,
      debug: false,
      continuous: false, // benchmark: renderiza todo quadro
      initialPaused: false,
      initialEffects: true,
      effectIntensity: 1,
      touchGuard: false,
      ...options,
    };
    this.state = {
      paused: !!this.opts.initialPaused,
      effects: !!this.opts.initialEffects,
      reduced: !!this.opts.reducedMotion,
      touchGuard: !!this.opts.touchGuard,
      bookFocused: false,
      qualityLevel: 0,
      ready: false,
    };
    this._listeners = new Map();
    this._hotspots = [];
    this._running = false;
    this._disposed = false;
    this._dirty = true;
    this._inView = true;
    this._pointer = { inside: false, x: 0, y: 0, ndc: new THREE.Vector2(), type: 'mouse', dirty: false };
    this._down = null;
    this._safe = { target: { left: 0, right: 0, top: 0, bottom: 0 }, x: 0, y: 0 };
    this._counters = { ticks: 0, rendered: 0, skippedIdle: 0, skippedHidden: 0 };
    this._lastRenderAt = null;
    this._lastTickAt = null;
    this._timings = {};
    this._tmp = { v: new THREE.Vector3(), v2: new THREE.Vector3(), ray: new THREE.Ray(), inv: new THREE.Matrix4(), n: new THREE.Vector3() };
    if (this.opts.debug) this.THREE = THREE; // só para testes/QA
    this.motion = new MotionState();
    this.frameStats = new FrameStats(300);
    this.cpuStats = new FrameStats(300);
    this.governor = new PerformanceGovernor({
      enabled: !!this.opts.governor,
      // no nível mais baixo o próprio limitador de taxa molda o intervalo dos quadros: só a sondagem mede o aparelho
      isPacedLevel: (lvl) => QUALITY_LEVELS[lvl].fxFpsCapMs > 0,
    });
    this._pacedSkips = 0;
    this._interacting = false; // usuário arrastando/zoom (o limitador de taxa nunca atua durante a interação)
    // cancelamento e posse: criados no construtor para que dispose() antes/durante start() seja seguro
    this._abort = new AbortController();
    this._abortPromise = new Promise((_, reject) => {
      this._abort.signal.addEventListener('abort', () => reject(new AbortError()), { once: true });
    });
    this._abortPromise.catch(() => {});
    this._scope = new ResourceScope('motor');
    this._started = false;
    // recuperação de contexto WebGL
    this._contextLost = false;
    this._recovering = false;
    this._ctx = { epoch: 0, lost: 0, restored: 0, recovered: 0, failed: 0, degraded: false, lastError: null, lastAttempts: 0 };
  }

  // ------------------------------------------------------------------ eventos
  on(name, fn) {
    if (!this._listeners.has(name)) this._listeners.set(name, new Set());
    this._listeners.get(name).add(fn);
    return () => this._listeners.get(name)?.delete(fn);
  }
  _emit(name, payload) {
    this._listeners.get(name)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  }

  // ------------------------------------------------------------------ ciclo de vida
  /**
   * Inicia o motor. Resolve `true` quando pronto e `false` se foi descartado/cancelado antes
   * (cancelamento nunca rejeita). Falhas reais (rede, GLB inválido, WebGL ausente) rejeitam.
   */
  async start() {
    if (this._disposed || this._started) return false;
    this._started = true;
    try {
      await this._start();
      return !this._disposed;
    } catch (e) {
      if (this._disposed || isAbortError(e)) return false;
      throw e;
    }
  }

  _assertAlive() {
    if (this._disposed) throw new AbortError();
    throwIfAborted(this._abort.signal);
  }

  /** Espera `promise` mas desiste (AbortError) se o motor for descartado antes. */
  async _alive(promise) {
    Promise.resolve(promise).catch(() => {}); // se perder a corrida, uma rejeição tardia não vira "unhandled"
    const v = await Promise.race([promise, this._abortPromise]);
    this._assertAlive();
    return v;
  }

  /** Se o contexto estiver perdido/recuperando, espera a restauração antes de tocar na GPU. */
  _whenContextUsable() {
    if (!this._contextLost && !this._recovering) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const off = this.on('contextRestored', () => { off(); resolve(); });
      this._abort.signal.addEventListener('abort', () => { off(); reject(new AbortError()); }, { once: true });
    });
  }

  async _start() {
    this._tStart = performance.now();
    this._createRenderer();
    this._resolveQuality();
    this._createScene();
    this._bindEvents();
    this._resize(true);

    const tier = this._tier;
    const model = await loadSophiaModel({
      url: this.opts.modelUrl,
      renderer: this.renderer,
      signal: this._abort.signal,
      expectedBytes: this.opts.expectedBytes,
      expectedSha256: this.opts.expectedSha256,
      textureCap: QUALITY_PRESETS[tier].textureCap,
      onPhase: (p) => this._emit('phase', p),
      onProgress: (p, got, total) => this._emit('progress', { progress: p, received: got, total }),
      // F-I0-02: recursos em voo (texturas já enviadas) passam a ser liberados por dispose() ANTES de renderer.dispose()
      onScope: (s) => this._scope.track(() => s.disposeAll()),
    });
    if (this._disposed) { model.dispose(); throw new AbortError(); }
    this._model = model;
    this._scope.track(() => model.dispose());
    await this._whenContextUsable();
    this._assertAlive();
    this._mountModel(model);

    let maskTexture = null;
    if (this.opts.maskUrl) {
      try {
        maskTexture = await loadMaskTexture(this.opts.maskUrl, { signal: this._abort.signal });
      } catch (e) {
        if (isAbortError(e)) throw e;
        throw new Error(`Não foi possível carregar a máscara da constelação (${this.opts.maskUrl}).`, { cause: e });
      }
      // posse ANTES de qualquer upload: se o motor for descartado agora, o escopo libera a textura
      this._maskTexture = this._scope.track(maskTexture);
      this._assertAlive();
      maskTexture.flipY = false; // mesma convenção de UV do glTF
      maskTexture.colorSpace = THREE.NoColorSpace;
      maskTexture.anisotropy = 4;
      maskTexture.generateMipmaps = true;
      maskTexture.minFilter = THREE.LinearMipmapLinearFilter;
      maskTexture.magFilter = THREE.LinearFilter;
      await this._whenContextUsable();
      this._assertAlive();
      uploadTexture(this.renderer, maskTexture, this._abort.signal);
    }
    this._assertAlive();
    if (maskTexture) {
      this.fx = createConstellationFx({
        material: model.mesh.material,
        maskTexture,
        anchors: this.opts.anchors,
        root: this.root,
      });
      this.fx.setReduced(this.state.reduced);
      this.fx.setEnabled(this.state.effects);
      this.fx.setIntensity(this.opts.effectIntensity);
    }
    this._applyEffectsVisibility();

    const tCompile = performance.now();
    await this._whenContextUsable();
    if (this.renderer.compileAsync) await this._alive(this.renderer.compileAsync(this.scene, this.camera));
    this._timings.compileMs = performance.now() - tCompile;
    this._assertAlive();
    await this._whenContextUsable();
    this._assertAlive();

    // Primeiro quadro (com gl.finish só aqui, para medir de fato o custo inicial)
    const tFirst = performance.now();
    this._updateScene(0.016, true);
    this._renderOnce();
    this.renderer.getContext().finish();
    this._timings.firstFrameMs = performance.now() - tFirst;
    this._timings.readyMs = performance.now() - this._tStart;

    this.state.ready = true;
    this._running = true;
    this.renderer.setAnimationLoop(this._tick);
    this._emit('ready', this.getMetrics());
    this._startMetrics();
  }

  /**
   * Descarta tudo, de forma idempotente e na ordem certa: cancela o que está em andamento, para o laço,
   * solta eventos, libera recursos (cada passo isolado: um erro não impede os demais) e só então
   * destrói o renderer. Depois de `dispose()` nenhuma chamada WebGL de alocação/upload/desenho ocorre.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._running = false;
    this._recovering = false;
    const errors = (this.disposeErrors = []);
    const step = (fn) => { try { fn(); } catch (e) { errors.push(e); } };
    step(() => this._abort.abort());
    step(() => clearInterval(this._metricsTimer));
    step(() => clearTimeout(this._recoverTimer));
    step(() => this.renderer?.setAnimationLoop(null));
    step(() => this._unbindEvents());
    step(() => this.fx?.dispose());
    step(() => this.controls?.dispose());
    step(() => this.starfield?.dispose());
    step(() => this._shadow?.geometry.dispose());
    step(() => this._shadow?.material.map?.dispose());
    step(() => this._shadow?.material.dispose());
    step(() => this._env?.dispose());
    step(() => this._gpuTimer?.dispose());
    step(() => { this._scopeReport = this._scope.disposeAll(); }); // máscara + modelo (sem duplicidade)
    step(() => this.renderer?.dispose());
    step(() => this.renderer?.forceContextLoss());
    step(() => this.renderer?.domElement.remove());
    this._listeners.clear();
    this._hotspots.length = 0;
  }

  _disposeModel(model) { model.dispose(); }

  // ------------------------------------------------------------------ construção
  _createRenderer() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        preserveDrawingBuffer: !!this.opts.debug, // só para capturas de teste
      });
    } catch (e) {
      // Erros arbitrários do construtor não são prova de ausência de WebGL.
      if (!/WebGL context could not be created|Error creating WebGL context|WebGL is not supported/i.test(String(e?.message || e))) throw e;
      const err = new Error('WebGL indisponível neste navegador/dispositivo.');
      err.code = 'webgl-unavailable';
      err.cause = e;
      throw err;
    }
    this.renderer = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping; // preserva as cores-base (sem dessaturar como o ACES)
    renderer.toneMappingExposure = 1.0;
    const canvas = renderer.domElement;
    canvas.className = 'sp7a-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
    this.container.appendChild(canvas);

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendorStr = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    this.gl = {
      renderer: String(rendererStr),
      vendor: String(vendorStr),
      version: String(gl.getParameter(gl.VERSION)),
      webgl2: renderer.capabilities.isWebGL2,
      maxTextureSize: renderer.capabilities.maxTextureSize,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      software: GL_SOFTWARE_RE.test(String(rendererStr)),
    };
  }

  _resolveQuality() {
    let tier = this.opts.quality;
    if (tier === 'auto') {
      tier = pickQuality({
        coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
        deviceMemory: navigator.deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
      });
    }
    this._tier = QUALITY_PRESETS[tier] ? tier : 'high';
    this._applyPixelRatio();
  }

  _applyPixelRatio() {
    const preset = QUALITY_PRESETS[this._tier];
    const level = QUALITY_LEVELS[this.state.qualityLevel];
    const device = window.devicePixelRatio || 1;
    const dpr = Math.max(Math.min(1, device), Math.min(device, preset.dprCap) * level.dprScale);
    this._dpr = dpr;
    this.renderer.setPixelRatio(dpr);
  }

  _createScene() {
    const scene = (this.scene = new THREE.Scene());
    const camera = (this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60));
    camera.position.set(0, 0.5, 2.4);

    // pivô animado (movimento rígido) + raiz do modelo em coordenadas originais do GLB
    this.pivot = new THREE.Group();
    this.pivot.name = 'sophia-pivot';
    this.root = new THREE.Group();
    this.root.name = 'sophia-root';
    this.pivot.add(this.root);
    scene.add(this.pivot);

    // luz
    this._env = createStudioEnvironment(this.renderer);
    scene.environment = this._env.texture;
    scene.environmentIntensity = 0.8;
    this.lights = createLightRig();
    scene.add(this.lights.group);

    // sombra de contato (blob) — externa ao modelo
    this._shadow = this._createShadow();
    scene.add(this._shadow);

    // céu estrelado
    this.starfield = createStarfield();
    scene.add(this.starfield.object);

    // controles
    const controls = (this.controls = new OrbitControls(camera, this.renderer.domElement));
    controls.enableDamping = !this.state.reduced;
    controls.dampingFactor = 0.085;
    controls.enablePan = !!this.opts.enablePan;
    controls.screenSpacePanning = false;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.8;
    controls.minPolarAngle = 0.1 * Math.PI;
    controls.maxPolarAngle = 0.56 * Math.PI;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.addEventListener('start', () => { this._interacting = true; this.rig.cancel(); this._markUserCamera(); this._dirty = true; });
    controls.addEventListener('end', () => { this._interacting = false; this._dirty = true; });
    controls.addEventListener('change', () => { this._dirty = true; });
    this.rig = new CameraRig(camera, controls);
    this._setTouchGuard(this.state.touchGuard, false);
  }

  _createShadow() {
    const s = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, 'rgba(0,0,0,0.62)');
    rg.addColorStop(0.55, 'rgba(0,0,0,0.26)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
    mesh.name = 'sophia-contact-shadow';
    mesh.renderOrder = -5;
    mesh.position.y = 0.0008;
    this._shadowBase = { opacity: 0.85, sx: 0.98, sz: 0.74, cx: 0.02, cz: -0.06 };
    mesh.scale.set(this._shadowBase.sx, 1, this._shadowBase.sz);
    mesh.position.x = this._shadowBase.cx;
    mesh.position.z = this._shadowBase.cz;
    mat.opacity = this._shadowBase.opacity;
    return mesh;
  }

  _mountModel(model) {
    const { box, root: modelRoot } = model;
    const center = box.getCenter(new THREE.Vector3());
    this._modelBox = box;
    this._pivotRest = new THREE.Vector3(center.x, center.y, center.z);
    this.pivot.position.copy(this._pivotRest);
    this.root.position.set(-center.x, -center.y, -center.z); // composição = identidade em repouso
    this.root.add(modelRoot);
    modelRoot.frustumCulled = true;
    this._setDefaultPose();
    this.lights.update(this.camera, this.controls.target);
  }

  // ------------------------------------------------------------------ câmera
  _fit() {
    const aspect = this._w / Math.max(1, this._h);
    return fitDistance({ height: MODEL_HEIGHT, width: MODEL_WIDTH, fovDeg: FOV, aspect });
  }

  _defaultPose() {
    const d = this._fit();
    return { target: new THREE.Vector3(0, 0.485, 0), radius: d, phi: 1.43, theta: 0.2 };
  }

  _setDefaultPose() {
    const d = this._fit();
    this.controls.minDistance = d * 0.28;
    this.controls.maxDistance = d * 1.7;
    this.rig.setPose(this._defaultPose());
    this._userMovedCamera = false;
  }

  _markUserCamera() {
    this._userMovedCamera = true;
    if (this.state.bookFocused) this._bookUserMoved = true; // o usuário assumiu a câmera com o livro aberto
  }

  _bookAnchor() {
    const b = this.opts.anchors?.book ?? DEFAULT_BOOK;
    return {
      position: new THREE.Vector3(...b.position),
      normal: new THREE.Vector3(...b.normal).normalize(),
    };
  }

  _bookPose() {
    const { position, normal } = this._bookAnchor();
    const d = this._fit();
    const target = position.clone();
    // olha o livro de frente, levemente a partir de cima; azimute segue a normal projetada em XZ
    const theta = Math.atan2(normal.x, normal.z) * 0.6 + 0.08;
    return { target, radius: Math.max(this.controls.minDistance * 1.25, d * 0.36), phi: 1.28, theta };
  }

  _duration(seconds) { return this.state.reduced ? 0 : seconds; }

  resetCamera() {
    this.rig.flyTo(this._defaultPose(), this._duration(0.85));
    this.state.bookFocused = false;
    this._userMovedCamera = false;
    this._dirty = true;
    this._requestRender();
  }

  focusBook(on) {
    if (on) {
      if (!this.state.bookFocused) { this._preBookPose = this.rig.getPose(); this._bookUserMoved = false; }
      this.rig.flyTo(this._bookPose(), this._duration(1.0));
      this.state.bookFocused = true;
    } else if (this.state.bookFocused) {
      // sem intervenção do usuário, a pose "de antes" pode ser de outra proporção de tela (houve resize): usa a atual
      const back = this._userMovedCamera ? (this._preBookPose ?? this._defaultPose()) : this._defaultPose();
      this.rig.flyTo(back, this._duration(0.9));
      this.state.bookFocused = false;
    }
    this._dirty = true;
    this._requestRender();
  }

  nudgeCamera(dTheta, dPhi, zoomFactor = 1) {
    const p = this.rig.getPose();
    p.theta += dTheta;
    p.phi = clamp(p.phi + dPhi, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    p.radius = clamp(p.radius * zoomFactor, this.controls.minDistance, this.controls.maxDistance);
    this.rig.flyTo(p, this._duration(0.18));
    this._markUserCamera();
    this._dirty = true;
  }

  setSafeArea(area) {
    Object.assign(this._safe.target, { left: 0, right: 0, top: 0, bottom: 0 }, area);
    this._dirty = true;
    this._requestRender();
  }

  // ------------------------------------------------------------------ estado
  setPaused(v) {
    if (this._disposed) return;
    this.state.paused = !!v; this._dirty = true; this._requestRender();
  }
  setEffects(v) {
    if (this._disposed) return;
    this.state.effects = !!v;
    this.fx?.setEnabled(this.state.effects);
    this._applyEffectsVisibility();
    this._dirty = true;
    this._requestRender();
  }
  setReducedMotion(v) {
    if (this._disposed) return;
    this.state.reduced = !!v;
    if (this.state.ready && !this.controls) throw new Error('Controles ausentes no motor pronto.');
    if (this.controls) this.controls.enableDamping = !v;
    this.fx?.setReduced(v);
    this._dirty = true;
    this._requestRender();
  }
  /** Suspende/retoma o laço de renderização por completo (diferente de pausar o movimento). */
  setSuspended(v) {
    this._suspended = !!v;
    if (!v) { this._lastTickAt = null; this._lastRenderAt = null; this._dirty = true; }
  }
  setEffectIntensity(v) {
    if (this._disposed) return;
    this.opts.effectIntensity = v;
    this.fx?.setIntensity(v);
    this._dirty = true; this._requestRender();
  }

  setTouchGuard(v) { if (!this._disposed) this._setTouchGuard(v, true); }
  _setTouchGuard(locked, emit) {
    this.state.touchGuard = !!locked;
    if (this.state.ready && (!this.controls || !this.renderer)) throw new Error('Controles ou renderer ausentes no motor pronto.');
    if (this.controls) this.controls.enabled = !locked;
    // 'pan-y': rolagem vertical da página passa pelo canvas enquanto travado
    if (this.renderer) this.renderer.domElement.style.touchAction = locked ? 'pan-y' : 'none';
    if (emit) this._emit('touchGuard', this.state.touchGuard);
  }

  _applyEffectsVisibility() {
    // A preferência existe antes do renderer e do céu; _createScene a aplica quando ambos existem.
    if (!this.starfield) {
      if (this.state.ready) throw new Error('Céu estrelado ausente no motor pronto.');
      return;
    }
    const lvl = QUALITY_LEVELS[this.state.qualityLevel];
    const on = this.state.effects;
    this.starfield.object.visible = on && lvl.starfield;
    this.fx?.setHalosVisible(on && lvl.halos);
  }

  _requestRender() { /* o laço de animação já roda; apenas marca sujo */ this._dirty = true; }

  // ------------------------------------------------------------------ hotspots
  /**
   * Registra um elemento HTML que acompanha uma âncora 3D (atualizado fora do React).
   * Idempotente por identidade do nó: registrar o mesmo elemento de novo não duplica nada.
   * Enquanto o ponto não está visível (ou ainda não foi posicionado) o elemento fica `inert` +
   * `aria-hidden`: some da ordem de Tab e da árvore de acessibilidade, e não aceita foco programático.
   *
   * @param {HTMLElement} el
   * @param {'book'|'constellation'} kind
   * @param {{focusFallback?: () => (HTMLElement|null|undefined)}} [opts]
   *        focusFallback: para onde levar o foco se este elemento ficar oculto enquanto focado.
   * @returns {() => void} cancela o registro
   */
  registerHotspot(el, kind, opts = {}) {
    if (this._disposed || !el) return () => {};
    const existing = this._hotspots.find((h) => h.el === el);
    if (existing) { existing.kind = kind; existing.focusFallback = opts.focusFallback ?? existing.focusFallback; return existing.off; }
    const entry = { el, kind, visible: null, focusFallback: opts.focusFallback ?? null };
    if (kind === 'book') {
      const b = this._bookAnchor();
      entry.local = b.position; entry.normal = b.normal;
    } else {
      const s = this.opts.anchors?.tail?.stars?.[0];
      entry.local = new THREE.Vector3(...(s?.position ?? [0.3, 0.3, -0.25]));
      entry.normal = new THREE.Vector3(...(s?.normal ?? [0.6, 0, 0.3])).normalize();
    }
    entry.off = () => {
      const i = this._hotspots.indexOf(entry);
      if (i >= 0) this._hotspots.splice(i, 1);
    };
    this._hotspots.push(entry);
    this._setHotspotVisible(entry, false); // até a primeira projeção: oculto e fora da ordem de foco
    this._dirty = true;
    return entry.off;
  }

  /** Mostra/oculta um hotspot de forma acessível; ao ocultar o que está focado, move o foco antes. */
  _setHotspotVisible(hs, visible) {
    if (hs.visible === visible) return;
    const el = hs.el;
    if (visible) {
      if (INERT_SUPPORTED) el.inert = false;
      else { el.removeAttribute('tabindex'); if ('disabled' in el && el.dataset.spDisabledByEngine) { el.disabled = false; delete el.dataset.spDisabledByEngine; } }
      el.removeAttribute('aria-hidden');
      delete el.dataset.hidden;
    } else {
      // 1) o foco sai ANTES de aria-hidden/inert (nunca esconder o elemento focado)
      if (el.contains(document.activeElement)) this._moveFocusFromHotspot(hs);
      el.dataset.hidden = '1';
      el.setAttribute('aria-hidden', 'true');
      if (INERT_SUPPORTED) el.inert = true;
      else { el.setAttribute('tabindex', '-1'); if ('disabled' in el && !el.disabled) { el.disabled = true; el.dataset.spDisabledByEngine = '1'; } }
    }
    hs.visible = visible;
  }

  _moveFocusFromHotspot(hs) {
    const candidates = [];
    try { candidates.push(hs.focusFallback?.()); } catch { /* ignora */ }
    candidates.push(this.container?.closest?.('[tabindex]'));
    for (const c of candidates) {
      if (!c || c === hs.el || hs.el.contains(c) || !c.isConnected) continue;
      c.focus({ preventScroll: true });
      if (document.activeElement === c) { this._emit('hotspotFocusMoved', { kind: hs.kind, to: c }); return true; }
    }
    document.activeElement?.blur?.();
    this._emit('hotspotFocusMoved', { kind: hs.kind, to: null });
    return false;
  }

  _updateHotspots() {
    if (!this._hotspots.length) return;
    const { v, v2, n } = this._tmp;
    const w = this._w, h = this._h;
    // nós que saíram do documento (desmontados pelo React sem cancelar o registro) são descartados aqui também
    if (this._hotspots.some((hs) => !hs.el.isConnected)) this._hotspots = this._hotspots.filter((hs) => hs.el.isConnected);
    for (const hs of this._hotspots) {
      v.copy(hs.local).applyMatrix4(this.root.matrixWorld);
      v2.copy(this.camera.position).sub(v).normalize();
      n.copy(hs.normal).transformDirection(this.root.matrixWorld);
      const facing = n.dot(v2) > 0.12;
      v.project(this.camera);
      const visible = facing && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      hs.el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px, 0)`;
      this._setHotspotVisible(hs, visible);
    }
  }

  // ------------------------------------------------------------------ eventos DOM
  _bindEvents() {
    const canvas = this.renderer.domElement;
    this._onResize = () => this._resize(false);
    this._ro = new ResizeObserver(this._onResize);
    this._ro.observe(this.container);

    this._io = new IntersectionObserver((entries) => {
      this._inView = entries[entries.length - 1].isIntersecting;
      if (this._inView) { this._dirty = true; this._lastTickAt = null; this._lastRenderAt = null; }
    }, { threshold: 0.01 });
    this._io.observe(this.container);

    this._onVis = () => { this._lastTickAt = null; this._lastRenderAt = null; this._dirty = true; };
    document.addEventListener('visibilitychange', this._onVis);

    this._onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const p = this._pointer;
      p.type = e.pointerType || 'mouse';
      p.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      p.inside = true;
      p.dirty = true;
      p.x = p.ndc.x; p.y = p.ndc.y;
      this._dirty = true;
    };
    this._onLeave = () => { this._pointer.inside = false; this._pointer.dirty = true; this._dirty = true; };
    this._onDown = (e) => {
      this._down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      this._onMove(e);
    };
    this._onUp = (e) => {
      const d = this._down;
      this._down = null;
      if (!d || d.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (moved < 7 && performance.now() - d.t < 600) this._onTap(e);
    };
    this._onWheel = (e) => {
      if (this.opts.wheelZoom === 'ctrl' && !(e.ctrlKey || e.metaKey)) {
        e.stopImmediatePropagation(); // deixa a página rolar
        this._emit('wheelHint');
      } else {
        this.rig.cancel();
        this._markUserCamera();
      }
    };
    this._onCtx = (e) => {
      e.preventDefault();
      this._ctx.lost += 1;
      this._ctx.epoch += 1; // invalida qualquer recuperação em andamento
      this._contextLost = true;
      this._recovering = false;
      clearTimeout(this._recoverTimer);
      this._gpuTimer = null; // as consultas de GPU morrem com o contexto
      this._emit('contextLost');
    };
    this._onCtxRestored = () => {
      if (this._disposed) return;
      this._ctx.restored += 1;
      // O three.js já reinicializou seu estado interno (ouvinte registrado antes do nosso); o CONTEÚDO de
      // render targets (o PMREM do ambiente) não volta sozinho e precisa ser regenerado, em ordem.
      this._recovering = true;
      this._recoverContext(this._ctx.epoch, 1);
    };

    canvas.addEventListener('pointermove', this._onMove);
    canvas.addEventListener('pointerleave', this._onLeave);
    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointerup', this._onUp);
    canvas.addEventListener('pointercancel', this._onLeave);
    canvas.addEventListener('wheel', this._onWheel, { capture: true, passive: false });
    canvas.addEventListener('webglcontextlost', this._onCtx);
    canvas.addEventListener('webglcontextrestored', this._onCtxRestored);
  }

  /**
   * Recria o que a perda de contexto destruiu: o ambiente PMREM (render targets não são
   * reenviados pelo three.js). Etapas: (1) confirma que o contexto está vivo; (2) reaplica estado do
   * renderer; (3) gera o novo ambiente e VERIFICA que tem conteúdo; (4) só então troca e libera o antigo;
   * (5) retoma o laço. Falhas: nova tentativa com recuo exponencial; esgotadas, modo degradado
   * (sem IBL, mas visível) e evento `contextRecoveryFailed`. Eventos repetidos (perder de novo no meio)
   * cancelam a tentativa atual via `epoch`.
   */
  _recoverContext(epoch, attempt) {
    if (this._disposed || epoch !== this._ctx.epoch) return;
    const gl = this.renderer.getContext();
    const MAX = 3;
    let env = null;
    try {
      if (gl.isContextLost()) return; // outra perda já em curso: o próximo 'restored' recomeça
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setSize(this._w, this._h, false);
      env = createStudioEnvironment(this.renderer);
      if (gl.isContextLost() || epoch !== this._ctx.epoch || this._disposed) { env.dispose(); return; }
      const verdict = env.probe();
      if (verdict.ok === false) throw new Error('PMREM regenerado sem conteúdo.');
      const old = this._env;
      this._env = env;
      this.scene.environment = env.texture;
      try { old?.dispose(); } catch { /* o alvo antigo já pode ter sido invalidado */ }
      this._ctx.degraded = false;
      this._ctx.lastError = null;
      this._finishRecovery(true, attempt);
    } catch (err) {
      try { env?.dispose(); } catch { /* ignora */ }
      this._ctx.lastError = String(err?.message || err);
      if (attempt < MAX) {
        this._recoverTimer = setTimeout(() => this._recoverContext(epoch, attempt + 1), 150 * 2 ** (attempt - 1));
        return;
      }
      // esgotado: melhor um modelo visível sem IBL do que um PMREM em branco
      try { this._env?.dispose(); } catch { /* ignora */ }
      this._env = null;
      this.scene.environment = null;
      this._ctx.degraded = true;
      this._finishRecovery(false, attempt);
    }
  }

  _finishRecovery(recovered, attempts) {
    if (recovered) this._ctx.recovered += 1; else this._ctx.failed += 1;
    this._ctx.lastAttempts = attempts;
    this._recovering = false;
    this._contextLost = false;
    this._lastTickAt = null;
    this._lastRenderAt = null;
    this.governor.reset(performance.now());
    this._dirty = true;
    if (!recovered) this._emit('contextRecoveryFailed', { error: this._ctx.lastError, attempts });
    this._emit('contextRestored', { recovered, attempts });
  }

  _unbindEvents() {
    const canvas = this.renderer?.domElement;
    this._ro?.disconnect();
    this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    if (!canvas) return;
    canvas.removeEventListener('pointermove', this._onMove);
    canvas.removeEventListener('pointerleave', this._onLeave);
    canvas.removeEventListener('pointerdown', this._onDown);
    canvas.removeEventListener('pointerup', this._onUp);
    canvas.removeEventListener('pointercancel', this._onLeave);
    canvas.removeEventListener('wheel', this._onWheel, { capture: true });
    canvas.removeEventListener('webglcontextlost', this._onCtx);
    canvas.removeEventListener('webglcontextrestored', this._onCtxRestored);
  }

  _resize(initial) {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (!initial && w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.controls && this._model) {
      const d = this._fit();
      this.controls.minDistance = d * 0.28;
      this.controls.maxDistance = d * 1.7;
      if (this.state.bookFocused) {
        // livro aberto: reenquadra o livro para a NOVA proporção (a distância de ajuste depende dela)
        if (!this._bookUserMoved) this.rig.flyTo(this._bookPose(), this._duration(0.35));
      } else if (!this._userMovedCamera) this.rig.setPose(this._defaultPose());
    }
    this._applyViewOffset(true);
    this._dirty = true;
  }

  /**
   * Desloca a projeção (não o modelo) para que ele fique centrado na área livre
   * quando um painel ocupa parte da tela. Animado, exceto sob reduced-motion.
   */
  _applyViewOffset(force) {
    const t = this._safe.target;
    const tx = safeAreaOffsetX(t), ty = safeAreaOffsetY(t);
    const s = this._safe;
    let moving = false;
    if (Math.abs(s.x - tx) > 0.3 || Math.abs(s.y - ty) > 0.3) {
      moving = true;
      if (this.state.reduced || this._lastDt === undefined) {
        s.x = tx; s.y = ty;
      } else {
        s.x = damp(s.x, tx, 9, this._lastDt);
        s.y = damp(s.y, ty, 9, this._lastDt);
        if (Math.abs(s.x - tx) < 0.3) s.x = tx;
        if (Math.abs(s.y - ty) < 0.3) s.y = ty;
      }
    }
    if (moving || force) {
      if (Math.abs(s.x) < 0.3 && Math.abs(s.y) < 0.3) this.camera.clearViewOffset();
      else this.camera.setViewOffset(this._w, this._h, s.x, s.y, this._w, this._h);
    }
    return moving;
  }

  // ------------------------------------------------------------------ interação com a constelação
  _pointerRayLocal() {
    const { ray, inv } = this._tmp;
    const p = this._pointer;
    const origin = new THREE.Vector3(p.ndc.x, p.ndc.y, -1).unproject(this.camera);
    const dir = new THREE.Vector3(p.ndc.x, p.ndc.y, 0.5).unproject(this.camera).sub(origin).normalize();
    ray.set(origin, dir);
    inv.copy(this.root.matrixWorld).invert();
    ray.applyMatrix4(inv); // para o espaço local do GLB
    return ray;
  }

  _hitTail() {
    const spheres = this.opts.anchors?.tail?.spheres;
    if (!spheres?.length) return null;
    const ray = this._pointerRayLocal();
    return rayHitSpheres(
      [ray.origin.x, ray.origin.y, ray.origin.z],
      [ray.direction.x, ray.direction.y, ray.direction.z],
      spheres,
      0.9,
    );
  }

  _onTap() {
    if (!this.state.effects || !this.fx) return;
    const hit = this._hitTail();
    if (hit) {
      this.fx.pulse(new THREE.Vector3(...hit.point), 1);
      this._emit('constellation', { point: hit.point });
      this._dirty = true;
    }
  }

  /** Acende a constelação a partir da maior estrela (usado pelo pin e pela API pública). */
  pulseConstellation() {
    if (!this.fx || !this.state.effects) return false;
    const star = this.opts.anchors?.tail?.stars?.[0];
    const p = star ? new THREE.Vector3(...star.position) : new THREE.Vector3(0.3, 0.3, -0.2);
    this.fx.pulse(p, 1);
    this._dirty = true;
    return true;
  }

  _updatePointer() {
    const p = this._pointer;
    if (!p.dirty) return;
    p.dirty = false;
    if (!this.fx || !this.state.effects || !p.inside || p.type === 'touch') {
      this.fx?.setHover(null);
      this._setCursor('');
      return;
    }
    const hit = this._hitTail();
    this.fx.setHover(hit ? new THREE.Vector3(...hit.point) : null);
    this._setCursor(hit ? 'pointer' : '');
  }

  _setCursor(c) {
    const el = this.renderer.domElement;
    if (el.style.cursor !== c) el.style.cursor = c;
  }

  // ------------------------------------------------------------------ laço
  _updateScene(dt, force = false) {
    this._lastDt = dt;
    const p = this._pointer;
    const lean = p.inside && p.type !== 'touch' && !this.state.touchGuard ? { x: p.x, y: p.y } : null;
    const m = this.motion.step(dt, { paused: this.state.paused, reduced: this.state.reduced, pointer: lean });
    this.pivot.position.set(this._pivotRest.x, this._pivotRest.y + m.y, this._pivotRest.z);
    this.pivot.rotation.set(m.pitch, m.yaw, m.roll, 'YXZ');

    if (this._shadow) {
      const k = 1 - (m.y / 0.0115) * 0.05;
      this._shadow.material.opacity = this._shadowBase.opacity * clamp(k, 0.7, 1.1);
      this._shadow.scale.set(this._shadowBase.sx * (2 - clamp(k, 0.7, 1.1)), 1, this._shadowBase.sz * (2 - clamp(k, 0.7, 1.1)));
    }
    this._updatePointer();
    this.fx?.update(dt);
    this.starfield.update(performance.now() / 1000, this._dpr, this.state.reduced);
    this._cameraMoved = this.rig.update(dt);
    const changed = this.controls.update(dt);
    const viewMoving = this._applyViewOffset(force);

    // luzes e ambiente acompanham a câmera (aspecto estável ao orbitar)
    this.lights.update(this.camera, this.controls.target);
    const az = Math.atan2(this.camera.position.x - this.controls.target.x, this.camera.position.z - this.controls.target.z);
    this.scene.environmentRotation.set(0, az, 0);

    return (
      m.envelope > 1e-3 || this.motion.active || this.fx?.active || this._cameraMoved || changed || viewMoving ||
      this._dirty || this.rig.active
    );
  }

  _renderOnce() {
    this.renderer.render(this.scene, this.camera);
    this._updateHotspots();
    this._dirty = false;
  }

  _tick = (now) => {
    if (!this._running || this._disposed) return;
    this._counters.ticks++;
    if (this._contextLost || this._recovering || this._suspended) return;
    if (document.hidden || !this._inView) { this._counters.skippedHidden++; this.governor.abortProbe(); return; }
    const prevTick = this._lastTickAt;
    this._lastTickAt = now;
    const dtMs = prevTick === null ? 16.7 : now - prevTick;
    const dt = Math.min(dtMs, 100) / 1000;

    const t0 = performance.now();
    const needs = this._updateScene(dt) || this.opts.continuous;
    if (!needs) { this._counters.skippedIdle++; this._idle = true; this._lastRenderAt = null; this.governor.abortProbe(); return; }

    // Sondagem: nos níveis com limitador de taxa o intervalo dos quadros mede o limitador, não o aparelho.
    // Periodicamente o governador abre uma janela curta SEM o limite para medir a capacidade real.
    const probing = this.governor.beginProbeIfDue(now);
    const cap = QUALITY_LEVELS[this.state.qualityLevel].fxFpsCapMs;
    if (!probing && cap && this._lastRenderAt !== null && now - this._lastRenderAt < cap - 2 && !this._cameraMoved && !this._interacting && !this._dirty) {
      // (antes: `!this.controls.state` — OrbitControls usa -1 para "nenhum", logo a condição era SEMPRE falsa em repouso
      // e o limitador de ~33 ms nunca atuava; só atuava durante ROTATE, o oposto do pretendido. Ver RELATORIO F-I1-A.)
      this._pacedSkips++;
      return; // limita a taxa quando só há efeitos/flutuação (nível mais baixo)
    }

    this._idle = false;
    if (probing) this._beginGpuSample();
    this._renderOnce();
    if (probing) this._endGpuSample();
    const cpuMs = performance.now() - t0;
    this._counters.rendered++;
    if (this._lastRenderAt !== null) {
      const frameMs = now - this._lastRenderAt;
      if (frameMs < 3000) this.frameStats.push(frameMs);
      this.cpuStats.push(cpuMs);
      const paced = this._pacedSkips > 0 && !probing;
      // o governador decide sozinho o que é pausa isolada, lentidão sustentada, quadro limitado ou sondagem
      const lvl = this.governor.push(frameMs, now, { paced, cpuMs, gpuMs: this._takeGpuSample() });
      if (lvl !== null) this._setQualityLevel(lvl);
    }
    this._pacedSkips = 0;
    this._lastRenderAt = now;
  };

  // --- tempo de GPU (opcional): só durante a sondagem, e só se a extensão existir --------------------
  _beginGpuSample() {
    if (this._gpuTimer === undefined || this._gpuTimer === null) {
      try { this._gpuTimer = new GpuTimer(this.renderer.getContext()); } catch { this._gpuTimer = false; }
    }
    if (this._gpuTimer && this._gpuTimer.supported) this._gpuTimer.begin();
  }
  _endGpuSample() { if (this._gpuTimer && this._gpuTimer.supported) this._gpuTimer.end(); }
  _takeGpuSample() {
    const t = this._gpuTimer;
    if (!t || !t.supported) return null;
    const ready = t.poll();
    return ready.length ? ready[ready.length - 1] : null;
  }

  _setQualityLevel(level) {
    this.state.qualityLevel = level;
    this._applyPixelRatio();
    this.renderer.setSize(this._w, this._h, false);
    this._applyEffectsVisibility();
    this._dirty = true;
    this._emit('quality', { level, dpr: this._dpr });
  }

  // ------------------------------------------------------------------ teclado
  /** Atalhos quando o contêiner tem foco. Devolve true se tratou a tecla. */
  handleKey(e) {
    const step = 8 * DEG;
    switch (e.key) {
      case 'ArrowLeft': this.nudgeCamera(-step, 0); return true;
      case 'ArrowRight': this.nudgeCamera(step, 0); return true;
      case 'ArrowUp': this.nudgeCamera(0, -4 * DEG); return true;
      case 'ArrowDown': this.nudgeCamera(0, 4 * DEG); return true;
      case '+': case '=': this.nudgeCamera(0, 0, 0.88); return true;
      case '-': case '_': this.nudgeCamera(0, 0, 1 / 0.88); return true;
      case '0': this.resetCamera(); return true;
      default: return false;
    }
  }

  // ------------------------------------------------------------------ métricas
  _startMetrics() {
    this._metricsTimer = setInterval(() => this._emit('metrics', this.getMetrics()), 1000);
  }

  getMetrics() {
    const info = this.renderer.info;
    const m = this._model;
    const texBytes = m ? m.textures.reduce((s, t) => s + t.estGpuBytes, 0) : 0;
    const maskBytes = this._maskTexture ? estimateTextureBytes(this._maskTexture.image.width, this._maskTexture.image.height) : 0;
    const geoBytes = m?.stats.geometryBytes ?? 0;
    const heap = performance.memory?.usedJSHeapSize ?? null;
    return {
      timings: { ...(m?.timings ?? {}), ...this._timings },
      model: m ? { bytes: m.bytes, sha256: m.sha256, integrityOk: m.integrityOk, ...m.stats, textures: m.textures } : null,
      fps: this.frameStats.snapshot(),
      idle: !!this._idle,
      counters: { ...this._counters },
      quality: { tier: this._tier, level: this.state.qualityLevel, dpr: this._dpr, governor: this.governor.enabled, probe: this.governor.snapshot() },
      cpu: this.cpuStats.snapshot(),
      context: { ...this._ctx, lost_now: this._contextLost, recovering: this._recovering },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? null,
      },
      memory: {
        jsHeapMB: heap === null ? null : mb(heap),
        estGpuTexturesMB: mb(texBytes + maskBytes),
        estGpuGeometryMB: mb(geoBytes),
        estGpuTotalMB: mb(texBytes + maskBytes + geoBytes),
        note: 'GPU = estimativa a partir de dimensões (RGBA8 + mips) e buffers; não é leitura do driver.',
      },
      gl: this.gl,
      state: { ...this.state },
      canvas: { cssWidth: this._w, cssHeight: this._h, pixelRatio: this._dpr },
    };
  }

  // ------------------------------------------------------------------ utilitários de teste/depuração
  /** Renderiza agora e devolve o PNG do canvas (precisa de `debug: true`). */
  capture(type = 'image/png') {
    this._updateScene(0, true);
    this._renderOnce();
    return this.renderer.domElement.toDataURL(type);
  }
}
