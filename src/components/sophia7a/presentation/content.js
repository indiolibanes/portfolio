// Textos padrão (pt-BR). Tudo é substituível por props: `labels` e `bookPages`.

export const DEFAULT_LABELS = Object.freeze({
  region: 'Apresentação tridimensional interativa de Sophia',
  canvas:
    'Modelo 3D de Sophia, raposa escriba de pelagem branca e cauda azul-noite com uma constelação dourada. Arraste para girar; use as setas do teclado para orbitar.',
  loading: 'Carregando Sophia…',
  phases: {
    download: 'Baixando o modelo',
    verify: 'Verificando integridade',
    decode: 'Decodificando malha e texturas',
    upload: 'Enviando à GPU',
  },
  error: 'Não foi possível exibir o modelo 3D.',
  noWebgl: 'Este dispositivo não oferece WebGL. Exibindo a ilustração.',
  retry: 'Tentar de novo',
  contextLost: 'Contexto gráfico perdido. Restaurando…',
  contextRecoveryFailed: 'Imagem restaurada sem a iluminação de estúdio.',

  toolbar: 'Controles da apresentação',
  pause: 'Pausar',
  resume: 'Retomar',
  pauseFull: 'Pausar movimento',
  resumeFull: 'Retomar movimento',
  resetCamera: 'Câmera',
  resetCameraFull: 'Redefinir câmera',
  effects: 'Efeitos',
  effectsFull: 'Efeitos visuais (constelação, céu estrelado)',
  book: 'Livro',
  bookFull: 'Abrir o livro de Sophia',
  stats: 'Métricas',
  statsFull: 'Mostrar métricas de desempenho',

  explore: 'Explorar em 3D',
  exploreHint: 'Toque para girar e ampliar. Enquanto isso, a rolagem da página fica travada sobre a imagem.',
  exitExplore: 'Sair do 3D',
  wheelHint: 'Use Ctrl + rolagem para ampliar',

  pinBook: 'Abrir o livro de Sophia',
  pinConstellation: 'Acender a constelação',

  bookTitle: 'Livro de Sophia',
  bookClose: 'Fechar livro',
  bookPrev: 'Folha anterior',
  bookNext: 'Próxima folha',
  bookPage: (n, total) => `Folha ${n} de ${total}`,

  announce: {
    paused: 'Movimento pausado',
    resumed: 'Movimento retomado',
    reset: 'Câmera redefinida',
    effectsOn: 'Efeitos ativados',
    effectsOff: 'Efeitos desativados',
    bookOpen: 'Livro aberto',
    bookClosed: 'Livro fechado',
    quality: (lvl) => `Qualidade reduzida automaticamente para manter a fluidez (nível ${lvl})`,
    qualityUp: (lvl) => `Qualidade restaurada (nível ${lvl})`,
    pinFocusMoved: 'O marcador saiu do campo de visão; o foco foi movido para os controles.',
  },
});

// Texto de exemplo (provisório). Substitua por `bookPages` na integração.
export const DEFAULT_BOOK_PAGES = Object.freeze([
  {
    title: 'I · Sophia',
    body:
      'Raposa escriba, de pelagem de neve e cauda de noite. Traz um livro azul marcado por uma estrela e uma pena de ouro: anota o que o céu lhe dita, uma folha por vez.',
  },
  {
    title: 'II · A constelação',
    body:
      'Na cauda, uma constelação desenhada em ouro. Passe o cursor sobre ela, ou toque, para acendê-la: o brilho percorre as estrelas a partir do ponto tocado e se apaga sozinho.',
  },
  {
    title: 'III · Sobre este protótipo',
    body:
      'Nesta fase, Sophia se move como um corpo rígido: flutua, inclina e gira com a câmera. Não há esqueleto, animação corporal nem deformação. Este livro é uma interface independente — o livro do modelo não se altera.',
  },
]);
