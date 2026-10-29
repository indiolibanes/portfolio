const f = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d));

/** Painel de métricas (dev/QA). Só renderiza quando aberto; não participa do laço de quadros. */
export function StatsPanel({ metrics, onCopy }) {
  if (!metrics) return null;
  const t = metrics.timings ?? {};
  const fps = metrics.fps;
  const mem = metrics.memory;
  return (
    <aside className="sp7a-stats" aria-label="Métricas de desempenho">
      <dl>
        <dt>GPU</dt>
        <dd>
          {metrics.gl.renderer.replace(/^ANGLE \((.*)\)$/, '$1').slice(0, 64)}
          {metrics.gl.software && <strong className="sp7a-warn"> · software (sem GPU real)</strong>}
        </dd>
        <dt>Carga</dt>
        <dd>
          rede {f(t.downloadMs, 0)} · hash {f(t.verifyMs, 0)} · decod. {f(t.decodeMs, 0)} · GPU {f(t.uploadMs, 0)} ms
        </dd>
        <dt>Prontidão</dt>
        <dd>1º quadro {f(t.firstFrameMs, 0)} ms · pronto em {f(t.readyMs, 0)} ms</dd>
        <dt>Quadros</dt>
        <dd>
          {f(fps.fps, 1)} fps · médio {f(fps.avgMs)} ms · p95 {f(fps.p95Ms)} · p99 {f(fps.p99Ms)}
          {metrics.idle && ' · ocioso'}
        </dd>
        <dt>Memória</dt>
        <dd>
          heap JS {f(mem.jsHeapMB, 0)} MB · GPU est. {f(mem.estGpuTotalMB, 0)} MB (tex {f(mem.estGpuTexturesMB, 0)})
        </dd>
        <dt>Cena</dt>
        <dd>
          {metrics.renderer.calls} draws · {Math.round(metrics.renderer.triangles / 1000)} mil tri · {metrics.renderer.textures} tex
        </dd>
        <dt>Qualidade</dt>
        <dd>
          {metrics.quality.tier} · nível {metrics.quality.level} · dpr {f(metrics.quality.pixelRatio ?? metrics.quality.dpr, 2)}
          {metrics.quality.governor ? ' · governador' : ' · fixo'}
        </dd>
        {metrics.model?.sha256 && (
          <>
            <dt>GLB</dt>
            <dd>
              {(metrics.model.bytes / 1048576).toFixed(2)} MB · sha256 {metrics.model.sha256.slice(0, 10)}… {metrics.model.integrityOk ? '✓' : '✗'}
            </dd>
          </>
        )}
      </dl>
      <button type="button" className="sp7a-link" onClick={onCopy}>Copiar JSON</button>
    </aside>
  );
}
