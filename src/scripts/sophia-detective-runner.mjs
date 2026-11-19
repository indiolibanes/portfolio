// World coordinates share the SVG viewBox. The narrower hit boxes leave room
// for the fox's ears, tail and the soft edges of each obstacle.
export const FOX_X = 82;
const FLOOR = 148;
const START_X = 520;
const GRAVITY = 860;
const JUMP_SPEED = 322;
const WIDTH = { folder: 28, lamp: 35 };

export function newRun() {
  return { height: 0, velocity: 0, distance: 0, obstacle: { kind: 'folder', x: START_X }, next: 'lamp', over: false };
}

export function stepRun(run, dt, { duck, jump }) {
  if (run.over) return;
  if (jump && !duck && run.height === 0) run.velocity = JUMP_SPEED;
  if (run.velocity > 0 || run.height > 0) {
    run.height = Math.max(0, run.height + run.velocity * dt - GRAVITY * dt * dt / 2);
    run.velocity = run.height ? run.velocity - GRAVITY * dt : 0;
  }

  const travel = (210 + Math.min(100, run.distance / 18)) * dt;
  run.distance += travel;
  run.obstacle.x -= travel;
  if (run.obstacle.x + WIDTH[run.obstacle.kind] < 0) {
    run.obstacle = { kind: run.next, x: START_X + 30 };
    run.next = run.next === 'lamp' ? 'folder' : 'lamp';
  }

  const { kind, x } = run.obstacle;
  const bottom = FLOOR - run.height - 2;
  const top = bottom - (duck ? 30 : 59);
  const overlapX = x + 3 < FOX_X + 13 && x + WIDTH[kind] - 3 > FOX_X - 16;
  const obstacleTop = kind === 'folder' ? 123 : 84;
  const obstacleBottom = kind === 'folder' ? FLOOR : 109;
  run.over = overlapX && bottom > obstacleTop && top < obstacleBottom;
}

export function mountDetectiveRunner(root) {
  const find = name => root.querySelector('[data-detective-' + name + ']');
  const trigger = find('open');
  const panel = find('panel');
  const playfield = find('playfield');
  const duckButton = find('duck');
  const restart = find('restart');
  const score = find('score');
  const status = find('status');
  const fox = root.querySelector('[data-runner-fox]');
  const track = root.querySelector('[data-runner-track]');
  const obstacles = new Map([...root.querySelectorAll('[data-runner-obstacle]')]
    .map(el => [el.dataset.runnerObstacle, el]));
  let run = newRun();
  let frame = 0;
  let last = null;
  let jump = false;
  let duck = false;

  function setDuck(value) {
    duck = value;
    duckButton.setAttribute('aria-pressed', String(value));
  }

  function paint() {
    fox.setAttribute('transform', `translate(${FOX_X} ${FLOOR - run.height})`);
    fox.toggleAttribute('data-duck', duck);
    track.setAttribute('stroke-dashoffset', String(-run.distance % 16));
    for (const [kind, el] of obstacles) {
      const active = kind === run.obstacle.kind;
      el.setAttribute('visibility', active ? 'visible' : 'hidden');
      if (active) el.setAttribute('transform', `translate(${run.obstacle.x} ${kind === 'folder' ? FLOOR : 0})`);
    }
    const points = String(Math.floor(run.distance / 20));
    if (score.textContent !== points) score.textContent = points;
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
    jump = false;
    setDuck(false);
    panel.removeAttribute('data-running');
  }

  function tick(now) {
    if (last !== null) stepRun(run, Math.min((now - last) / 1000, .035), { jump, duck });
    last = now;
    jump = false;
    paint();
    if (run.over) {
      stop();
      status.textContent = `Fim da corrida. ${score.textContent} pontos.`;
      restart.textContent = 'Tentar de novo';
      restart.hidden = false;
      restart.focus();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function start() {
    stop();
    run = newRun();
    restart.hidden = true;
    panel.setAttribute('data-running', '');
    status.textContent = 'Corrida iniciada.';
    paint();
    playfield.focus({ preventScroll: true });
    frame = requestAnimationFrame(tick);
  }

  function close() {
    stop();
    panel.hidden = true;
    trigger.hidden = false;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener('click', () => {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.hidden = true;
    start();
  });
  find('close').addEventListener('click', close);
  find('jump').addEventListener('click', () => { if (frame) jump = true; });
  duckButton.addEventListener('click', () => { if (frame) setDuck(!duck); });
  restart.addEventListener('click', start);
  panel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
    if (!['ArrowUp', ' ', 'ArrowDown'].includes(event.key)) return;
    event.stopPropagation();
    // Keep native Space activation on the explicit controls.
    if (event.key === ' ' && event.target.closest('button')) return;
    event.preventDefault();
    if (!frame) return;
    if (event.key === 'ArrowDown') setDuck(true);
    else if (!event.repeat) jump = true;
  });
  panel.addEventListener('keyup', event => {
    if (event.key === 'ArrowDown') setDuck(false);
  });
  panel.addEventListener('focusout', event => {
    if (panel.contains(event.relatedTarget) || !frame) return;
    stop();
    restart.textContent = 'Recomeçar';
    restart.hidden = false;
    status.textContent = 'Corrida interrompida.';
  });
}
