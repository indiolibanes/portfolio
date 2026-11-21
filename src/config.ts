export const SITE = {
  title: 'Kauê Alencar | Escrita técnica e documentação',
  description:
    'Portfólio de Kauê Alencar: escrita técnica, documentação, arquitetura da informação, UX e projetos interativos em tecnologia e 3D.',
  url: 'https://indiolibanes.dev',
  ogImage: '/og-portfolio.jpg?v=20261121-domain',
  ogImageAlt: 'Sophia, raposa cósmica de óculos redondos e pata erguida junto ao rosto, em cartão azul-noite estrelado de Kauê Alencar: Escrita, sistemas e mundos possíveis; documentação, interfaces e experiências interativas.',
};

export const RSS = {
  path: '/rss.xml',
  title: 'Portfólio de Kauê Alencar — RSS',
};

export const PUBLIC_PAGES = {
  curiosidades: {
    path: '/curiosidades/',
    title: 'Curiosidades — Portfólio de Kauê Alencar',
    description: 'Pequenas curiosidades que não cabem em um currículo, mas ajudam a entender o tom deste portfólio: música, jogos, línguas, escrita e método.',
  },
  sophia: {
    path: '/sophia/',
    title: 'Sophia — Portfólio de Kauê Alencar',
    description: 'Sophia, uma pequena raposa associada à curiosidade, à sabedoria e aos espaços ainda incompletos deste portfólio.',
  },
  rhea: {
    path: '/rhea/',
    title: 'RHEA: Google Drive for MCP assistants, within one folder',
    description: 'RHEA is an open-source, self-hosted workspace that connects Google Drive to MCP-compatible assistants through one dedicated folder, with revocable grants and reviewed changes.',
  },
};

export const PROFILE = {
  name: 'Kauê Alencar',
  shortName: 'Kauê',
  tagline: 'Escrita · Documentação · Experimentos interativos',
  linkedin: 'https://www.linkedin.com/in/alencarkaue/',
  whatsapp: 'https://wa.me/5547989105443',
  email: 'contact@indiolibanes.dev',
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
