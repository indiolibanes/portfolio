export const SITE = {
  title: 'Kauê Alencar | Escrita técnica e documentação',
  description:
    'Portfólio de Kauê Alencar: escrita técnica, documentação, arquitetura da informação, UX e projetos interativos em tecnologia e 3D.',
  url: 'https://kaue.pages.dev',
  ogImage: '/og-portfolio.jpg?v=20261031-og2',
  ogImageAlt: 'Sophia, raposa cósmica de óculos redondos e pata erguida junto ao rosto, em cartão azul-noite estrelado de Kauê Alencar: Escrita, sistemas e mundos possíveis; documentação, interfaces e experiências interativas.',
};

export const PROFILE = {
  name: 'Kauê Alencar',
  shortName: 'Kauê',
  tagline: 'Escrita · Documentação · Experimentos interativos',
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
