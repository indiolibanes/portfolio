// sophia-clip-contract.js — contrato (v1) dos clipes OPCIONAIS da Sophia do laboratório com caderno e caneta.
//
// Estes nomes são EXPECTATIVAS combinadas com a produção (Blendstra), não evidência de que os clipes existam. O runtime
// só os usa se TODOS os obrigatórios estiverem no GLB e se o modelo ligar `bookScene: true` em MODELS (sophia-actor.js).
// Sem isso nada muda: o ator segue com a biblioteca atual e a ilustração 2D continua como reserva. Este módulo não cria
// animação nenhuma: só descreve e valida. Documentação: docs/characters/sophia-pre-r2/clip-contract.md.
export const BOOK_CONTRACT_VERSION = 1;

// kind: 'oneShot' termina sozinho (o ator avisa em onEnd) · 'loop' repete e o diretor decide quando sair (tempo simulado)
// props: adereços do GLB (nós Prop_*) que devem aparecer enquanto o clipe toca; todos ficam ocultos fora da cena.
export const BOOK_CLIPS = Object.freeze({
  equip: Object.freeze({ name: 'Lab_Book_Equip_P1', kind: 'oneShot', required: true, props: ['book'] }),
  hold: Object.freeze({ name: 'Lab_HoldBook_P1', kind: 'loop', required: true, props: ['book'] }),
  write: Object.freeze({ name: 'Lab_Write_P1', kind: 'loop', required: true, props: ['book', 'pen'] }),
  pause: Object.freeze({ name: 'Lab_PauseRead_P1', kind: 'loop', required: false, props: ['book', 'pen'] }),
  unequip: Object.freeze({ name: 'Lab_Book_Unequip_P1', kind: 'oneShot', required: true, props: ['book'] }),
});

export const BOOK_ONE_SHOT = Object.freeze(Object.values(BOOK_CLIPS).filter((c) => c.kind === 'oneShot').map((c) => c.name));

// hasClip: (nome) => boolean. Devolve o que falta; `available` só é true com todos os obrigatórios presentes.
export function bookCapability(hasClip) {
  const missing = Object.values(BOOK_CLIPS).filter((c) => c.required && !hasClip(c.name)).map((c) => c.name);
  return { available: missing.length === 0, missing, usesPause: Boolean(hasClip(BOOK_CLIPS.pause.name)) };
}

// Fases da cena (tempo simulado, em segundos). Equip → Hold → Write → [Pause → Write] → Unequip.
// `secs: null` = a fase acaba quando o clipe de uma execução termina.
export function bookPhases(capability, rng = Math.random, { hold = [1.5, 2.5], write = [5, 8], pause = [2, 3.5] } = {}) {
  if (!capability?.available) return [];
  const span = ([a, b]) => a + rng() * (b - a);
  const phases = [
    { id: 'equip', clip: BOOK_CLIPS.equip.name, secs: null, props: BOOK_CLIPS.equip.props },
    { id: 'hold', clip: BOOK_CLIPS.hold.name, secs: span(hold), props: BOOK_CLIPS.hold.props },
    { id: 'write', clip: BOOK_CLIPS.write.name, secs: span(write), props: BOOK_CLIPS.write.props },
  ];
  if (capability.usesPause) {
    phases.push({ id: 'pause', clip: BOOK_CLIPS.pause.name, secs: span(pause), props: BOOK_CLIPS.pause.props });
    phases.push({ id: 'write2', clip: BOOK_CLIPS.write.name, secs: span(write), props: BOOK_CLIPS.write.props });
  }
  phases.push({ id: 'unequip', clip: BOOK_CLIPS.unequip.name, secs: null, props: BOOK_CLIPS.unequip.props });
  return phases;
}
