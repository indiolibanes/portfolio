// RHEA language switch: the page is written in English; a double tap (or double
// click) turns every letter clockwise into Brazilian Portuguese, and the next one
// turns them back counter-clockwise. A visible button does the same for people
// who cannot double tap.
//
// Markup contract:
//   data-pt="…"               the Portuguese for this element's own text
//   data-pt-aria-label="…"    the Portuguese for its aria-label
// English stays in the HTML (search engines, no-JS); Portuguese lives in attributes.
//
// The choice is remembered in localStorage (rhea.lang).

import { motionOn, readOwnText, turn } from './rhea-kinetic.mjs';

const root = document.documentElement;
const IGNORE = 'a, button, input, textarea, select, summary, label, pre, code, [contenteditable]';

/**
 * @param {{ button?: HTMLElement|null, onChange?: (lang: 'en'|'pt', dir: 1|-1, animate: boolean) => void }} options
 */
export function initRheaLang({ button = null, onChange } = {}) {
  const hosts = [...document.querySelectorAll('[data-pt]')];
  const labelled = [...document.querySelectorAll('[data-pt-aria-label]')];
  const english = new Map(hosts.map((host) => [host, readOwnText(host)]));
  const englishLabels = new Map(labelled.map((node) => [node, node.getAttribute('aria-label')]));

  let lang = 'en';
  let busy = false;
  let lastAt = 0;

  const reflect = () => {
    root.lang = lang === 'pt' ? 'pt-BR' : 'en';
    if (!button) return;
    // The button names the language it will switch to, in that language.
    button.textContent = lang === 'pt' ? 'EN' : 'PT';
    button.lang = lang === 'pt' ? 'en' : 'pt-BR';
    button.setAttribute('aria-label', lang === 'pt' ? 'Read this page in English' : 'Ler esta página em português');
  };

  async function set(next, { animate = true } = {}) {
    if (next === lang || busy) return;
    busy = true;
    lang = next;
    const dir = next === 'pt' ? 1 : -1;
    reflect();
    for (const node of labelled) {
      node.setAttribute('aria-label', next === 'pt' ? node.dataset.ptAriaLabel : englishLabels.get(node));
    }
    try {
      onChange?.(next, dir, animate);
      await Promise.all(
        hosts.map((host) => turn(host, next === 'pt' ? host.dataset.pt : english.get(host), animate ? dir : 0)),
      );
    } finally {
      busy = false;
    }
    try {
      localStorage.setItem('rhea.lang', next);
    } catch {}
  }

  const toggle = () => {
    const now = performance.now();
    if (busy || now - lastAt < 700) return;
    lastAt = now;
    getSelection()?.removeAllRanges();
    set(lang === 'en' ? 'pt' : 'en');
  };

  // Mouse: a double click. Touch and pen: two quick taps close together
  // (dblclick is not reliable on every touch browser).
  addEventListener('dblclick', (event) => {
    if (!event.target.closest(IGNORE)) toggle();
  });
  let lastTap = 0;
  let lastX = 0;
  let lastY = 0;
  addEventListener(
    'pointerup',
    (event) => {
      if (event.pointerType === 'mouse') return;
      if (event.target.closest(IGNORE)) {
        lastTap = 0;
        return;
      }
      if (event.timeStamp - lastTap < 350 && Math.hypot(event.clientX - lastX, event.clientY - lastY) < 40) {
        lastTap = 0;
        toggle();
      } else {
        lastTap = event.timeStamp;
        lastX = event.clientX;
        lastY = event.clientY;
      }
    },
    { passive: true },
  );

  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => {
      lastAt = performance.now();
      set(lang === 'en' ? 'pt' : 'en');
    });
  }
  reflect();

  let saved = null;
  try {
    saved = localStorage.getItem('rhea.lang');
  } catch {}
  if (saved === 'pt') set('pt', { animate: false });

  return { get lang() { return lang; }, set, toggle, motionOn };
}
