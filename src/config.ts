export const SITE = {
  title: 'Kauê Alencar — Portfólio',
  description:
    'Portfólio pessoal de Kauê Alencar: documentação, organização da informação, escrita e publicação digital.',
  url: 'https://kaue.pages.dev',
  ogImage: '/og-portfolio.jpg',
};

export const PROFILE = {
  name: 'Kauê Alencar',
  shortName: 'Kauê',
  tagline: 'Documentação · Informação · Escrita',
  linkedin: 'https://www.linkedin.com/in/alencarkaue/',
  whatsapp: 'https://wa.me/5547989105443',
  email: 'kaue@tuta.com'
};


export const SOCIALS = {
  handle: '@indiolibanes',
  github: 'https://github.com/indiolibanes',
  portfolioRepo: 'https://github.com/indiolibanes/portfolio',
  githubAvatar: 'https://avatars.githubusercontent.com/u/32935701?v=4',
  lastfm: 'https://last.fm/user/kauealencar123',

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
