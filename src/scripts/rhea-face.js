// RHEA face: gaze, glances and reactions for every svg[data-rhea-face].
// No dependencies. One shared pointer listener, work only while a face is
// on screen, and nothing that moves when the reader prefers reduced motion.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(any-pointer: fine)').matches;
const clamp = (value) => Math.max(-1, Math.min(1, value));

const faces = new Set();
const visible = new Set();
let pointer = null;
let frame = 0;
let glanceTimer = 0;

function setGaze(face, x, y) {
  face.style.setProperty('--rhea-x', x.toFixed(2));
  face.style.setProperty('--rhea-y', y.toFixed(2));
}

function followPointer() {
  frame = 0;
  if (!pointer) return;
  for (const face of visible) {
    const box = face.getBoundingClientRect();
    const reach = Math.max(box.width, 120) * 2.2;
    setGaze(face, clamp((pointer.x - (box.left + box.width / 2)) / reach),
      clamp((pointer.y - (box.top + box.height / 2)) / reach));
  }
}

function onPointerMove(event) {
  if (event.pointerType !== 'mouse' || reduced()) return;
  pointer = { x: event.clientX, y: event.clientY };
  if (!frame) frame = requestAnimationFrame(followPointer);
}

// Without a mouse, Rhea looks around now and then instead of staring.
function scheduleGlance() {
  clearTimeout(glanceTimer);
  if (reduced() || !visible.size) return;
  glanceTimer = setTimeout(() => {
    if (!pointer) {
      for (const face of visible) {
        const look = Math.random() < 0.35;
        setGaze(face, look ? (Math.random() * 2 - 1) * 0.9 : 0, look ? (Math.random() * 2 - 1) * 0.5 : 0);
      }
    }
    scheduleGlance();
  }, 2600 + Math.random() * 3800);
}

function react(face) {
  if (reduced()) {
    face.classList.add('is-attentive');
    setTimeout(() => face.classList.remove('is-attentive'), 900);
    return;
  }
  face.classList.remove('is-spark');
  // Restart the orbit even when tapped twice in a row.
  void face.getBoundingClientRect();
  face.classList.add('is-wink', 'is-spark');
  setTimeout(() => face.classList.remove('is-wink'), 420);
  setTimeout(() => face.classList.remove('is-spark'), 1150);
  face.dispatchEvent(new CustomEvent('rhea:react', { bubbles: true }));
}

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('is-paused', !entry.isIntersecting);
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    scheduleGlance();
  })
  : null;

export function initRheaFaces(root = document) {
  for (const face of root.querySelectorAll('svg[data-rhea-face]')) {
    if (faces.has(face)) continue;
    faces.add(face);
    if (observer) observer.observe(face);
    else visible.add(face);
    face.addEventListener('pointerdown', () => react(face));
    const host = face.closest('[data-rhea-host]');
    if (host) host.addEventListener('rhea:poke', () => react(face));
  }
  if (finePointer()) window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', () => {
    for (const face of faces) face.classList.toggle('is-paused', document.hidden || (observer && !visible.has(face)));
  });
  scheduleGlance();
}
