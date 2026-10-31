export const SITE = {
  title: 'Kauê Alencar — Portfólio',
  description:
    'Portfólio e laboratório autoral de Kauê Alencar: escrita, documentação, interfaces e experimentação visual interativa.',
  url: 'https://kaue.pages.dev',
  ogImage: '/og-portfolio.jpg?v=20261031a',
  ogImageAlt: 'Cartão do portfólio de Kauê Alencar em azul-noturno, com constelações e Sophia à direita; à esquerda, o título e a frase Escrita, interfaces e mundos possíveis, com referências a documentação, design e experimentos 3D.',
};

export const PROFILE = {
  name: 'Kauê Alencar',
  shortName: 'Kauê',
  tagline: 'Documentação · Informação · Escrita',
  linkedin: 'https://www.linkedin.com/in/alencarkaue/',
  whatsapp: 'https://wa.me/5547989105443',
  email: 'kaue@tuta.com',
  resumePdf: '/curriculo-kaue-alencar.pdf'
};


export const SOCIALS = {
  handle: '@indiolibanes',
  github: 'https://github.com/indiolibanes',
  portfolioRepo: 'https://github.com/indiolibanes/portfolio',
  githubAvatar: '/assets/github-avatar.webp',
  lastfm: 'https://last.fm/user/kauealencar123',
  lastfmHandle: '@kauealencar123',

  // Preencha quando quiser expor os perfis públicos diretamente.
  appleMusic: '',
  spotify: '',
};

export const MUSIC = {
  // O Last.fm fornece “agora tocando” / “ouvido recentemente”.
  // As playlists continuam sendo links públicos do próprio Apple Music.
  publicPlaylists: [] as Array<{
    name: string;
    url: string;
    artwork?: string;
    note?: string;
  }>,
};
