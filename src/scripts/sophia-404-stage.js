/**
 * Progressive enhancement for the 404 mascots.
 * Does not touch Tetris mechanics; the 2D illustrations are always available.
 * Loads Three.js and the large GLB only when a scene actually enters view.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = navigator.connection?.saveData === true;
const stages = [...document.querySelectorAll('[data-sophia-stage]')];
// Mark intended 3D stages before asynchronous imports; the old SVG is a
// fallback, never a transient "first frame" that gets swapped after seconds.
if (!reduce.matches && !saveData && document.documentElement.dataset.sophia404 === 'loading') {
  for (const root of stages) root.dataset.sophiaLoading = 'true';
}
const visible = new Set();
const mounted = new Map();
const pending = new Set();

const quiet = () => document.documentElement.dataset.legacyMode === 'true'
  || document.documentElement.dataset.seriousMode === 'true';

async function wake(root) {
  if (mounted.has(root) || pending.has(root) || root.dataset.sophiaFailed) return;
  if (reduce.matches || saveData || quiet()) return;
  pending.add(root);
  try {
    const { mountSophia404 } = await import('./sophia-404-renderer.js');
    if (!root.isConnected) return;
    const stage = await mountSophia404(root);
    mounted.set(root, stage);
    delete root.dataset.sophiaLoading;
    stage.react(root.dataset.sophiaMood || 'idle');
    stage.setActive(visible.has(root) && !document.hidden && !quiet() && !reduce.matches && !saveData);
  } catch (error) {
    // An unavailable GLB, WebGL failure or context loss leaves original SVG visible.
    root.dataset.sophiaFailed = 'true';
    root.dataset.sophiaReady = 'false';
    delete root.dataset.sophiaLoading;
    console.warn('[Sophia 404] 3D indisponível; preservando ilustração.', error);
  } finally {
    pending.delete(root);
  }
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const root = entry.target;
    if (entry.isIntersecting) {
      visible.add(root);
      if (!quiet()) void wake(root);
    } else {
      visible.delete(root);
    }
    mounted.get(root)?.setActive(visible.has(root) && !document.hidden && !quiet() && !reduce.matches && !saveData);
  }
}, { rootMargin: '160px 0px', threshold: 0.02 });
for (const stage of stages) observer.observe(stage);

document.addEventListener('sophia:tetris', (event) => {
  const root = document.querySelector('[data-sophia-stage="portrait"]');
  if (!root) return;
  const mood = event.detail?.mood || 'idle';
  root.dataset.sophiaMood = mood;
  mounted.get(root)?.react(mood);
  // Lounge reacts to a completed game, too, without altering the game itself.
  if (mood === 'cheer' || mood === 'over') {
    const lounge = document.querySelector('[data-sophia-stage="lounge"]');
    if (lounge) {
      lounge.dataset.sophiaMood = mood;
      mounted.get(lounge)?.react(mood);
    }
  }
});

const syncVisibility = () => {
  for (const root of stages) {
    const active = visible.has(root) && !document.hidden && !quiet() && !reduce.matches && !saveData;
    mounted.get(root)?.setActive(active);
    // CSS keeps the SVG in editorial/legacy, even when WebGL has loaded.
    if (active && !mounted.has(root)) void wake(root);
  }
};
document.addEventListener('visibilitychange', syncVisibility);
new MutationObserver(syncVisibility).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-serious-mode', 'data-legacy-mode'],
});
reduce.addEventListener?.('change', syncVisibility);
window.addEventListener('pagehide', () => {
  observer.disconnect();
  for (const stage of mounted.values()) stage.dispose();
  mounted.clear();
}, { once: true });
