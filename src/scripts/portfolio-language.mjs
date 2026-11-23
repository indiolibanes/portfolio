import { englishCopy, normalizeCopy } from './portfolio-copy.mjs';
import { dissolveCopy } from './portfolio-language-particles.mjs';

const STORAGE_KEY = 'portfolio.lang';
const attributes = ['alt', 'aria-label', 'aria-description', 'title', 'placeholder', 'label'];
const attributeSelector = attributes.map((name) => `[${name}]`).join(',');
const skipCopy = 'script, style, code, noscript, [data-sk-diagnostics], [data-locale-static], [data-nav-language], .tw-typed';
const skipGesture = [
  'a', 'button', 'input', 'textarea', 'select', 'summary', 'label', 'canvas', 'video', 'audio',
  'iframe', 'pre', 'code', '[contenteditable]', '[role="button"]', '[tabindex]:not([tabindex="-1"])',
  '[data-locale-ignore-gesture]', '[aria-modal="true"]',
].join(',');

export function initPortfolioLanguage(button) {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const textState = new WeakMap();
  const attributeState = new WeakMap();
  const description = document.querySelector('meta[name="description"]');
  let language = 'pt-BR';
  let busy = false;
  let lastToggle = -Infinity;

  function isLocalizable(element) {
    if (!element || element.closest(skipCopy)) return false;
    const declared = element.closest('[lang]');
    return !declared || declared === root || /^pt(?:-BR)?$/i.test(declared.lang || declared.getAttribute('lang'));
  }

  // Only restore values still owned by this switch. A player or scene can
  // replace its status at any time and supply a new Portuguese source string.
  function replacement(current, prior, target, englishOverride) {
    const original = prior?.translated === current ? prior.original : current;
    if (target !== 'en') return { original, translated: original };
    const translated = englishOverride ?? englishCopy(original);
    if (translated === original) return { original, translated };
    const leading = original.match(/^\s*/)[0];
    const trailing = original.match(/\s*$/)[0];
    return { original, translated: leading + translated + trailing };
  }

  function patchText(node, target, commit) {
    if (!node.isConnected || !normalizeCopy(node.data) || !isLocalizable(node.parentElement)) return false;
    const parent = node.parentElement;
    const override = parent.childNodes.length === 1 ? parent.getAttribute('data-locale-en') : null;
    const patch = replacement(node.data, textState.get(node), target, override);
    if (patch.translated === node.data) return false;
    if (commit) {
      if (target === 'en') textState.set(node, patch);
      else textState.delete(node);
      node.data = patch.translated;
    }
    return true;
  }

  function patchAttribute(element, name, target) {
    if (!element.isConnected || !isLocalizable(element)) return;
    const current = element.getAttribute(name);
    if (!current) return;
    const state = attributeState.get(element);
    const patch = replacement(current, state?.get(name), target);
    if (patch.translated === current) return;
    if (target === 'en') {
      const next = state ?? new Map();
      next.set(name, patch);
      attributeState.set(element, next);
    } else {
      state?.delete(name);
    }
    element.setAttribute(name, patch.translated);
  }

  function walkText(scope, visit) {
    if (scope.nodeType === Node.TEXT_NODE) {
      visit(scope);
      return;
    }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) visit(walker.currentNode);
  }

  function patchTree(scope, target) {
    walkText(scope, (node) => patchText(node, target, true));
    if (scope.nodeType !== Node.ELEMENT_NODE || scope.closest(skipCopy)) return;
    if (scope.matches(attributeSelector)) attributes.forEach((name) => patchAttribute(scope, name, target));
    for (const element of scope.querySelectorAll(attributeSelector)) {
      attributes.forEach((name) => patchAttribute(element, name, target));
    }
  }

  const observer = new MutationObserver((records) => {
    if (language !== 'en') return;
    for (const record of records) {
      if (record.type === 'attributes') {
        patchAttribute(record.target, record.attributeName, 'en');
      } else if (record.type === 'characterData') {
        patchText(record.target, 'en', true);
      } else {
        for (const added of record.addedNodes) patchTree(added, 'en');
      }
    }
  });

  function apply(target) {
    language = target;
    root.lang = target;
    patchTree(document.body, target);
    if (document.querySelector('title')) patchTree(document.querySelector('title'), target);
    if (description) patchAttribute(description, 'content', target);
    button.textContent = target === 'en' ? 'PT' : 'EN';
    button.lang = target === 'en' ? 'pt-BR' : 'en';
    button.setAttribute('aria-label', target === 'en' ? 'Ler em português do Brasil' : 'Read in English');
    try { localStorage.setItem(STORAGE_KEY, target); } catch {}
    window.dispatchEvent(new CustomEvent('portfolio:language', { detail: { language } }));
  }

  async function toggle() {
    const now = performance.now();
    if (busy || now - lastToggle < 450) return;
    lastToggle = now;
    const target = language === 'en' ? 'pt-BR' : 'en';
    if (reducedMotion.matches) {
      apply(target);
      return;
    }
    busy = true;
    const nodes = [];
    walkText(document.body, (node) => {
      if (patchText(node, target, false)) nodes.push(node);
    });
    try {
      await dissolveCopy(nodes, () => apply(target), reducedMotion);
    } catch {
      if (language !== target) apply(target);
    } finally {
      busy = false;
    }
  }

  const isBackground = (event) =>
    event.target instanceof Element && !event.target.closest(skipGesture);

  addEventListener('dblclick', (event) => {
    if (!event.defaultPrevented && isBackground(event)) {
      getSelection()?.removeAllRanges();
      void toggle();
    }
  });

  let contact;
  let previousTap;
  addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || !isBackground(event) || !['touch', 'pen'].includes(event.pointerType)) {
      contact = previousTap = undefined;
      return;
    }
    contact = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp };
  }, { passive: true });
  addEventListener('pointercancel', () => { contact = previousTap = undefined; }, { passive: true });
  addEventListener('pointerup', (event) => {
    if (!contact || event.pointerId !== contact.id) return;
    const { clientX: x, clientY: y, timeStamp: at } = event;
    const tap = !event.defaultPrevented && isBackground(event) &&
      at - contact.at < 350 && Math.hypot(x - contact.x, y - contact.y) < 16;
    contact = undefined;
    if (tap && previousTap && at - previousTap.at < 350 && Math.hypot(x - previousTap.x, y - previousTap.y) < 38) {
      previousTap = undefined;
      void toggle();
    } else {
      previousTap = tap ? { x, y, at } : undefined;
    }
  }, { passive: true });

  button.addEventListener('click', () => void toggle());
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
  if (saved === 'en') apply('en');
  button.hidden = false;
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const target = saved === 'en' ? 'en' : 'pt-BR';
      if (target !== language) apply(target);
    } catch {}
  });
}
