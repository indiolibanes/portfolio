import { useEffect, useId, useRef, useState } from 'react';
import { IconClose, IconChevronLeft, IconChevronRight, IconStar } from './icons.jsx';

/**
 * Interface INDEPENDENTE do livro: um painel HTML. A geometria do livro do modelo
 * nunca é tocada; o 3D só enquadra a câmera no livro enquanto o painel está aberto.
 * Teclado: ← → viram a folha, Esc fecha. Foco vai ao painel ao abrir e volta ao
 * gatilho ao fechar.
 */
export function BookPanel({ labels, pages, open, onClose, returnFocusRef }) {
  const [i, setI] = useState(0);
  const panelRef = useRef(null);
  const titleId = useId();
  const last = pages.length - 1;

  useEffect(() => {
    if (open) {
      setI(0);
      // foco no painel (não no botão de fechar, para não "pular" o conteúdo)
      const id = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(id);
    }
    returnFocusRef?.current?.focus?.({ preventScroll: true });
    return undefined;
  }, [open, returnFocusRef]);

  if (!open) return null;
  const page = pages[i];

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { setI((v) => Math.min(last, v + 1)); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowLeft') { setI((v) => Math.max(0, v - 1)); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'Escape') { onClose(); e.preventDefault(); e.stopPropagation(); }
    else if (['ArrowUp', 'ArrowDown', '+', '-', '=', '_', '0'].includes(e.key)) e.stopPropagation();
  };

  return (
    <section
      ref={panelRef}
      className="sp7a-book"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <header className="sp7a-book-head">
        <span className="sp7a-book-seal"><IconStar size={16} /></span>
        <h2 id={titleId} className="sp7a-book-title">{labels.bookTitle}</h2>
        <button type="button" className="sp7a-icon-btn" onClick={onClose} aria-label={labels.bookClose} title={labels.bookClose}>
          <IconClose />
        </button>
      </header>

      <article key={i} className="sp7a-page">
        <h3 className="sp7a-page-title">{page.title}</h3>
        <p className="sp7a-page-body">{page.body}</p>
      </article>

      <footer className="sp7a-book-foot">
        <button type="button" className="sp7a-icon-btn" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} aria-label={labels.bookPrev} title={labels.bookPrev}>
          <IconChevronLeft />
        </button>
        <span className="sp7a-page-no" aria-live="polite">{labels.bookPage(i + 1, pages.length)}</span>
        <button type="button" className="sp7a-icon-btn" onClick={() => setI((v) => Math.min(last, v + 1))} disabled={i === last} aria-label={labels.bookNext} title={labels.bookNext}>
          <IconChevronRight />
        </button>
      </footer>
    </section>
  );
}
