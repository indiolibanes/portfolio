import { Component, useEffect, useRef, useState } from 'react';
import maskUrl from './presentation/assets/constellation-mask.png?url';

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="sophia7a-scene-error">
      <img className="sophia7a-error-poster" src="/sophia-7a/poster.webp" alt="Sophia com seu livro e a constelação" />
      <p>Não foi possível iniciar a cena 3D neste navegador. Feche a prévia para tentar novamente.</p>
    </div>;
    return this.props.children;
  }
}

// SSR-safe shell: the engine and its CSS are fetched only after explicit intent.
export default function SophiaPreview() {
  const [Presentation, setPresentation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const startButton = useRef(null);
  const scene = useRef(null);
  useEffect(() => {
    alive.current = true;
    setDiagnostics(new URLSearchParams(location.search).get('diagnostics') === '1');
    return () => { alive.current = false; generation.current++; };
  }, []);
  async function start() {
    const token = ++generation.current;
    setLoading(true); setError('');
    try {
      const [module] = await Promise.all([
        import('./presentation/SophiaPresentation.jsx'),
        import('./presentation/sophia-presentation.css'),
      ]);
      if (!alive.current || token !== generation.current) return;
      setPresentation(() => module.SophiaPresentation); setActive(true);
    } catch {
      if (alive.current && token === generation.current) setError('Não foi possível carregar a cena. Tente novamente.');
    } finally {
      if (alive.current && token === generation.current) setLoading(false);
    }
  }
  function close() {
    generation.current++; setActive(false); setLoading(false);
    requestAnimationFrame(() => startButton.current?.focus());
  }
  return <section className="sophia7a-preview" aria-label="Prévia interativa de Sophia">
    {active && Presentation ? <>
      <button type="button" onClick={close}>Fechar prévia e liberar recursos</button>
      <div className="sophia7a-stage">
        <SceneBoundary><Presentation ref={scene} maskUrl={maskUrl} modelUrl="/sophia-7a/sophia.glb"
          posterUrl="/sophia-7a/poster.webp"
          expectedSha256="b0f2c2e9106768b74b0582a703cf5b1c4d4ac2aac57b461ddc22f5696791c53a"
          expectedBytes={17054692} wheelZoom="ctrl" debug={diagnostics}
          onReady={() => scene.current?.engine?.container?.closest('.sp7a-root')?.focus()} /></SceneBoundary>
      </div>
    </> : <div className="sophia7a-fallback">
      <img src="/sophia-7a/poster.webp" width="800" height="800" alt="Sophia com seu livro e a constelação" />
      <p>Uma cena 3D interativa. Carregamento de aproximadamente 17 MB; requer WebGL.</p>
      <button ref={startButton} type="button" onClick={start} disabled={loading}>
        {loading ? 'Carregando a cena…' : 'Carregar prévia 3D'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>}
  </section>;
}
