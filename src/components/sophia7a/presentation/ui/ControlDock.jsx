import { IconPause, IconPlay, IconCamera, IconSparkles, IconBook, IconGauge } from './icons.jsx';

/**
 * Barra de controles. Todos os botões são <button> reais, com rótulo acessível,
 * alvo ≥ 44 px e foco visível. Não conhece three.js.
 */
export function ControlDock({ labels, paused, effects, bookOpen, showStats, statsOpen, onTogglePause, onResetCamera, onToggleEffects, onToggleBook, onToggleStats }) {
  return (
    <div className="sp7a-dock" role="toolbar" aria-label={labels.toolbar}>
      <button type="button" className="sp7a-btn" onClick={onTogglePause} aria-label={paused ? labels.resumeFull : labels.pauseFull} title={paused ? labels.resumeFull : labels.pauseFull}>
        {paused ? <IconPlay /> : <IconPause />}
        <span className="sp7a-btn-label">{paused ? labels.resume : labels.pause}</span>
      </button>
      <button type="button" className="sp7a-btn" onClick={onResetCamera} aria-label={labels.resetCameraFull} title={labels.resetCameraFull}>
        <IconCamera />
        <span className="sp7a-btn-label">{labels.resetCamera}</span>
      </button>
      <button type="button" className="sp7a-btn" data-sp-action="effects" onClick={onToggleEffects} aria-pressed={effects} aria-label={labels.effectsFull} title={labels.effectsFull}>
        <IconSparkles />
        <span className="sp7a-btn-label">{labels.effects}</span>
      </button>
      <button type="button" className="sp7a-btn" data-sp-action="book" onClick={onToggleBook} aria-pressed={bookOpen} aria-label={labels.bookFull} title={labels.bookFull}>
        <IconBook />
        <span className="sp7a-btn-label">{labels.book}</span>
      </button>
      {showStats && (
        <button type="button" className="sp7a-btn" onClick={onToggleStats} aria-pressed={statsOpen} aria-label={labels.statsFull} title={labels.statsFull}>
          <IconGauge />
          <span className="sp7a-btn-label">{labels.stats}</span>
        </button>
      )}
    </div>
  );
}
