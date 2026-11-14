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

// ---------------------------------------------------------------------------------------------------------------------
// Ciclo do laboratório (clipes R2, v1.2): reproduz os 12 s da ilustração 2D com um corpo 3D que se move de verdade.
//   0–8 %  escreve   8–40 %  anda (esq.)   40–52 %  pensa   52–54 %  vira   54–86 %  anda (dir.)   86–98 %  pensa   98–100 %  vira
// Tempos em segundos (ciclo de 12 s). O clipe de andar é "no lugar": quem move a raiz é o diretor, à velocidade declarada em
// extras.rootMotion.speedModelUnitsPerSecond (pés plantados sem deslizar). Os clipes são obrigatórios em conjunto.
export const CYCLE_CONTRACT_VERSION = 1;
export const CYCLE_CLIPS = Object.freeze({
  hold: 'Lab_HoldBook_P1', // repouso segurando o caderno (laço)
  walk: 'Lab_Walk_Book_R2', // laço de 3,84 s (4 ciclos de 0,96 s; 2 passos por ciclo)
  write: 'Lab_Write_Notes_R2', // laço de 1,92 s (golpes a cada 0,24 s)
  think: 'Lab_Think_Chin_R2', // 1,44 s: poses 1-2-3-4-3-2-1 do 2D (caneta ao queixo)
  notice: 'Lab_Notice_R2', // 0,92 s: pulinho ao perceber o visitante (o 2D usa 720 ms)
  turn: 'Lab_Turn_R2', // 0,24 s (o 2D inverte com scaleX(-1) em 240 ms)
});
export const CYCLE_ONE_SHOT = Object.freeze([CYCLE_CLIPS.think, CYCLE_CLIPS.notice, CYCLE_CLIPS.turn]);
export const CYCLE_PROPS = Object.freeze(['book', 'pen']);

// Linha do tempo do ciclo. `at` em segundos desde o início; `dir` = sentido do passo (-1 esquerda, +1 direita, 0 parado);
// `yaw` = direção do olhar do corpo (rad): 0 = de frente para a câmera, ±1,45 = de perfil quase puro.
export const CYCLE_TIMELINE = Object.freeze([
  { id: 'write-a', clip: CYCLE_CLIPS.write, secs: 0.96, dir: 0, yaw: -0.5 },
  { id: 'walk-left', clip: CYCLE_CLIPS.walk, secs: 3.84, dir: -1, yaw: -1.45 },
  { id: 'think-left', clip: CYCLE_CLIPS.think, secs: 1.44, dir: 0, yaw: -0.5 },
  { id: 'turn-right', clip: CYCLE_CLIPS.turn, secs: 0.24, dir: 0, yaw: 0.5 },
  { id: 'walk-right', clip: CYCLE_CLIPS.walk, secs: 3.84, dir: 1, yaw: 1.45 },
  { id: 'think-right', clip: CYCLE_CLIPS.think, secs: 1.44, dir: 0, yaw: 0.5 },
  { id: 'turn-left', clip: CYCLE_CLIPS.turn, secs: 0.24, dir: 0, yaw: -0.5 },
]);
export const CYCLE_SECONDS = CYCLE_TIMELINE.reduce((s, p) => s + p.secs, 0); // 12

export function cycleCapability(hasClip) {
  const missing = Object.values(CYCLE_CLIPS).filter((n) => !hasClip(n));
  return { available: missing.length === 0, missing };
}
