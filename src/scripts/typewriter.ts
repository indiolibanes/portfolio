/**
 * Máquina de escrever para títulos e textos marcados com `data-typewriter`.
 *
 * - Sem JavaScript, ou com prefers-reduced-motion, o DOM não muda: o texto aparece inteiro.
 * - Cada elemento recebe um "fantasma" invisível com o texto final, na mesma célula do grid,
 *   para que a página não pule enquanto as letras aparecem.
 * - Leitores de tela ouvem o texto completo uma vez (.tw-sr); a parte digitada é aria-hidden.
 * - Os elementos são digitados em ordem, a partir do primeiro que entra na tela, e só uma vez.
 */

const SPEED = 30;
const PAUSE = 180;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

interface Job {
  el: HTMLElement;
  text: string;
  typed: HTMLElement;
  textNode: Text;
}

function prepare(el: HTMLElement): Job | null {
  if (el.dataset.typewriterReady === 'true') return null;
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  el.dataset.typewriterReady = 'true';
  el.textContent = '';
  el.classList.add('tw');

  const sr = document.createElement('span');
  sr.className = 'tw-sr';
  sr.textContent = text;

  const ghost = document.createElement('span');
  ghost.className = 'tw-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.textContent = text;

  const typed = document.createElement('span');
  typed.className = 'tw-typed';
  typed.setAttribute('aria-hidden', 'true');
  const textNode = document.createTextNode('');
  const caret = document.createElement('span');
  caret.className = 'tw-caret';
  typed.append(textNode, caret);

  el.append(sr, ghost, typed);
  return { el, text, typed, textNode };
}

function type(job: Job): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      i += 1;
      job.textNode.data = job.text.slice(0, i);
      if (i >= job.text.length) {
        job.el.classList.add('tw-done');
        resolve();
        return;
      }
      const ch = job.text.charAt(i - 1);
      const wait = /[.,;:!?—]/.test(ch) ? SPEED * 6 : SPEED + Math.random() * 18;
      window.setTimeout(tick, wait);
    };
    window.setTimeout(tick, PAUSE / 2);
  });
}

function start() {
  if (reduce.matches) return;
  const jobs = [...document.querySelectorAll<HTMLElement>('[data-typewriter]')]
    .map(prepare)
    .filter((job): job is Job => job !== null);
  if (!jobs.length) return;

  let started = false;
  const run = async () => {
    if (started) return;
    started = true;
    for (const job of jobs) {
      await type(job);
      await new Promise((r) => window.setTimeout(r, PAUSE));
    }
  };

  if (!('IntersectionObserver' in window)) {
    run();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        io.disconnect();
        run();
      }
    },
    { threshold: 0.4 },
  );
  jobs.forEach((job) => io.observe(job.el));
}

start();
