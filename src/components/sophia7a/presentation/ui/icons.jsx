// Ícones SVG inline (sem dependências). 24×24, traço currentColor.
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };

export const IconPause = () => (<svg {...base}><path d="M9 5v14M15 5v14" /></svg>);
export const IconPlay = () => (<svg {...base}><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" /></svg>);
export const IconCamera = () => (<svg {...base}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.4" /></svg>);
export const IconSparkles = () => (<svg {...base}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>);
export const IconBook = () => (<svg {...base}><path d="M5 4.5h8.5A3.5 3.5 0 0 1 17 8v12H8.5A3.5 3.5 0 0 1 5 16.5z" /><path d="M17 8h2v12h-2M8.5 20A3.5 3.5 0 0 1 5 16.5" /><path d="M10.5 8.5l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" strokeWidth="1.2" /></svg>);
export const IconGauge = () => (<svg {...base}><path d="M4 16a8 8 0 1 1 16 0" /><path d="M12 16l4-5" /><circle cx="12" cy="16" r="1" fill="currentColor" /></svg>);
export const IconClose = () => (<svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconChevronLeft = () => (<svg {...base}><path d="M14.5 6l-6 6 6 6" /></svg>);
export const IconChevronRight = () => (<svg {...base}><path d="M9.5 6l6 6-6 6" /></svg>);
export const IconCube = () => (<svg {...base}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></svg>);
export const IconStar = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2c.6 4.8 2.2 8.4 5 9.5-2.8 1.1-4.4 4.7-5 9.5-.6-4.8-2.2-8.4-5-9.5 2.8-1.1 4.4-4.7 5-9.5z" fill="currentColor" />
  </svg>
);
