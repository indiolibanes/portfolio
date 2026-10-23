// Reveal ao rolar, nos dois sentidos — mesmo princípio do Horologiarius, adaptado ao portfólio.
// Elementos com data-reveal ficam escondidos até entrarem na tela. A cada entrada sorteia-se um efeito
// novo (nunca o mesmo duas vezes seguidas), com duração e atraso próprios; ao sair, o elemento volta ao
// estado escondido e o efeito toca de novo na próxima vez. Quem entra junto é ordenado da esquerda para a
// direita (depois de cima para baixo) com um escalonamento lento e levemente irregular. Só anima sozinho
// o que já está na tela ao carregar; o resto espera o primeiro gesto de rolagem real.
// data-reveal="iris" abre a imagem a partir do centro. Melhoria progressiva: sem JS, sem
// IntersectionObserver ou com movimento reduzido, nada é escondido. O CSS (reveal.css) só aplica
// o estado escondido no modo Autoral.
(() => {
  const root = document.documentElement;
  let enabled = false;
  try {
    enabled = 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {}
  if (!enabled) return;

  const effects = ['rise', 'drop', 'slide-l', 'slide-r', 'unfold', 'bloom', 'spin', 'flip', 'dim', 'lighten', 'blur'];
  // Seções "estáticas" (Curiosidades, Música) sorteiam num conjunto próprio, mais teatral.
  const sectionEffects = ['epicenter', 'dissolve', 'emerge', 'appear'];
  const stepMs = 260;
  const jitterMs = 110;
  const maxDelayMs = 2000;
  const minDurMs = 1000;
  const maxDurMs = 1600;
  const exitMs = 800;

  root.classList.add('reveal-on');

  let ready = false;
  // Rede de segurança: se o script da página nunca iniciar, mostra tudo.
  setTimeout(() => { if (!ready) root.classList.remove('reveal-on'); }, 4000);

  let userScrolled = false;
  let loaded = false;
  let held = [];
  let queue = [];
  let frame = 0;
  const inView = new WeakMap();
  const lastEffect = new WeakMap();

  const between = (min, max) => min + Math.random() * (max - min);
  const pick = (element, list = effects) => {
    const previous = list.indexOf(lastEffect.get(element));
    const pool = list.length - (previous >= 0 ? 1 : 0);
    let index = Math.min(pool - 1, (Math.random() * pool) | 0);
    if (previous >= 0 && index >= previous) index += 1;
    const next = list[index];
    lastEffect.set(element, next);
    return next;
  };

  const enter = (element) => {
    const iris = element.getAttribute('data-reveal') === 'iris';
    const section = element.getAttribute('data-reveal') === 'section';
    const effect = iris ? 'iris' : pick(element, section ? sectionEffects : effects);
    element.setAttribute('data-rv', effect);
    if (effect === 'epicenter') {
      // Epicentro sorteado; a magnitude (0.6–1.4) escala o tremor que acompanha a abertura.
      element.style.setProperty('--rv-x', `${Math.round(between(18, 82))}%`);
      element.style.setProperty('--rv-y', `${Math.round(between(20, 80))}%`);
      element.style.setProperty('--rv-mag', between(0.6, 1.4).toFixed(2));
    }
    element.style.setProperty('--rv-dur', `${iris ? 2200 : section && effect === 'epicenter' ? 1900 : Math.round(between(minDurMs, maxDurMs))}ms`);
    void element.offsetWidth; // consolida o estado escondido antes de entrar
    element.classList.add('is-in');
  };

  const leave = (element) => {
    element.style.setProperty('--rv-delay', '0ms');
    element.style.setProperty('--rv-dur', `${exitMs}ms`);
    element.classList.remove('is-in');
  };

  const flush = () => {
    frame = 0;
    const batch = queue.filter((item) => inView.get(item.element));
    queue = [];
    batch.sort((a, b) => a.x - b.x || a.y - b.y);
    batch.forEach(({ element }, index) => {
      const delay = Math.min(index * stepMs + Math.round(between(-jitterMs, jitterMs)), maxDelayMs);
      element.style.setProperty('--rv-delay', `${Math.max(0, delay)}ms`);
      enter(element);
    });
  };

  const enqueue = (items) => {
    queue.push(...items);
    if (queue.length && !frame) frame = requestAnimationFrame(flush);
  };

  const observer = new IntersectionObserver((entries) => {
    const entering = [];
    for (const entry of entries) {
      const element = entry.target;
      const now = entry.isIntersecting;
      const was = inView.get(element) ?? false;
      inView.set(element, now);
      if (now && !was) {
        entering.push({ element, x: Math.round(entry.boundingClientRect.left / 16), y: entry.boundingClientRect.top });
      } else if (!now && was) {
        held = held.filter((item) => item.element !== element);
        queue = queue.filter((item) => item.element !== element);
        leave(element);
      }
    }
    if (!loaded) {
      loaded = true;
      if (entering.length) enqueue(entering);
      return;
    }
    if (!entering.length) return;
    if (userScrolled) enqueue(entering);
    else held.push(...entering);
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

  const gestures = ['wheel', 'touchmove', 'keydown', 'pointerdown'];
  const onUserScroll = () => {
    if (userScrolled) return;
    userScrolled = true;
    gestures.forEach((type) => window.removeEventListener(type, onUserScroll));
    window.removeEventListener('scroll', onUserScroll);
    if (held.length) { enqueue(held); held = []; }
  };

  const init = () => {
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    if (window.scrollY > 0) userScrolled = true; // posição de rolagem restaurada conta como rolagem
    if (!userScrolled) {
      gestures.forEach((type) => window.addEventListener(type, onUserScroll, { passive: true }));
      window.addEventListener('scroll', onUserScroll, { passive: true });
    }
    ready = true;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
