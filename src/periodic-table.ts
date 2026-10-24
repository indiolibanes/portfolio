// Tabela periódica compartilhada pelo menu do modo-experimental.
// (O cabeçalho público mantém a própria cópia; unificar só quando o experimento for aprovado.)

const ELEMENTS =
  'H:Hidrogênio,He:Hélio,Li:Lítio,Be:Berílio,B:Boro,C:Carbono,N:Nitrogênio,O:Oxigênio,F:Flúor,Ne:Neônio,Na:Sódio,Mg:Magnésio,Al:Alumínio,Si:Silício,P:Fósforo,S:Enxofre,Cl:Cloro,Ar:Argônio,K:Potássio,Ca:Cálcio,Sc:Escândio,Ti:Titânio,V:Vanádio,Cr:Cromo,Mn:Manganês,Fe:Ferro,Co:Cobalto,Ni:Níquel,Cu:Cobre,Zn:Zinco,Ga:Gálio,Ge:Germânio,As:Arsênio,Se:Selênio,Br:Bromo,Kr:Criptônio,Rb:Rubídio,Sr:Estrôncio,Y:Ítrio,Zr:Zircônio,Nb:Nióbio,Mo:Molibdênio,Tc:Tecnécio,Ru:Rutênio,Rh:Ródio,Pd:Paládio,Ag:Prata,Cd:Cádmio,In:Índio,Sn:Estanho,Sb:Antimônio,Te:Telúrio,I:Iodo,Xe:Xenônio,Cs:Césio,Ba:Bário,La:Lantânio,Ce:Cério,Pr:Praseodímio,Nd:Neodímio,Pm:Promécio,Sm:Samário,Eu:Európio,Gd:Gadolínio,Tb:Térbio,Dy:Disprósio,Ho:Hólmio,Er:Érbio,Tm:Túlio,Yb:Itérbio,Lu:Lutécio,Hf:Háfnio,Ta:Tântalo,W:Tungstênio,Re:Rênio,Os:Ósmio,Ir:Irídio,Pt:Platina,Au:Ouro,Hg:Mercúrio,Tl:Tálio,Pb:Chumbo,Bi:Bismuto,Po:Polônio,At:Astato,Rn:Radônio,Fr:Frâncio,Ra:Rádio,Ac:Actínio,Th:Tório,Pa:Protactínio,U:Urânio,Np:Netúnio,Pu:Plutônio,Am:Amerício,Cm:Cúrio,Bk:Berquélio,Cf:Califórnio,Es:Einstênio,Fm:Férmio,Md:Mendelévio,No:Nobélio,Lr:Laurêncio,Rf:Rutherfórdio,Db:Dúbnio,Sg:Seabórgio,Bh:Bóhrio,Hs:Hássio,Mt:Meitnério,Ds:Darmstádio,Rg:Roentgênio,Cn:Copernício,Nh:Nihônio,Fl:Fleróvio,Mc:Moscóvio,Lv:Livermório,Ts:Tenesso,Og:Oganessônio';

type Cat = 'nm' | 'hl' | 'ng' | 'alk' | 'ae' | 'md' | 'ln' | 'ac' | 'pt' | 'tm';

const category = (sym: string, z: number): Cat =>
  ['H', 'C', 'N', 'O', 'P', 'S', 'Se'].includes(sym) ? 'nm'
  : ['F', 'Cl', 'Br', 'I', 'At', 'Ts'].includes(sym) ? 'hl'
  : ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'].includes(sym) ? 'ng'
  : ['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'].includes(sym) ? 'alk'
  : ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'].includes(sym) ? 'ae'
  : ['B', 'Si', 'Ge', 'As', 'Sb', 'Te'].includes(sym) ? 'md'
  : z >= 57 && z <= 71 ? 'ln'
  : z >= 89 && z <= 103 ? 'ac'
  : ['Al', 'Ga', 'In', 'Sn', 'Tl', 'Pb', 'Bi', 'Po', 'Nh', 'Fl', 'Mc', 'Lv'].includes(sym) ? 'pt'
  : 'tm';

/**
 * Cor do brilho de cada elemento: a cor real que ele tem ao brilhar ou ao ser
 * visto (descarga de gás, chama, fosforescência, aspecto do metal). Onde não há
 * cor conhecida (elementos sintéticos), vale a cor da categoria. Edite aqui.
 */
const REAL_GLOW =
  'H:#e05cff,He:#ff9d6e,Li:#e5254b,Be:#b8c4bf,B:#6fdc3a,C:#ff8a3d,N:#6a6cff,O:#52b6ff,F:#e8f25a,Ne:#ff4a1c,Na:#ffc61a,Mg:#ffffff,Al:#c9d3dc,Si:#8d9bb0,P:#7dff7a,S:#ffe21f,Cl:#c8e83a,Ar:#a96bff,K:#b78cff,Ca:#ff7a24,Sc:#d6dbe0,Ti:#b9c2cb,V:#8aa0b8,Cr:#b4c3d0,Mn:#d6609a,Fe:#e8683a,Co:#3a6dff,Ni:#8fd1a1,Cu:#e2773a,Zn:#8ec6ff,Ga:#9fd2ff,Ge:#9aa6b2,As:#8f9a82,Se:#e24a3a,Br:#d4422b,Kr:#d6fff0,Rb:#c4358c,Sr:#e8123f,Y:#d8dde2,Zr:#c6ccd2,Nb:#6f9bff,Mo:#a0a8b0,Tc:#9aa4af,Ru:#aeb7c0,Rh:#dfe6ee,Pd:#cfd5dc,Ag:#e6ecf3,Cd:#ffd84a,In:#d6dfea,Sn:#cdd6df,Sb:#a9b4c2,Te:#7a7f86,I:#8a35c9,Xe:#7f8bff,Cs:#6e7bff,Ba:#9be22a,La:#dfe5ea,Ce:#d9dfe6,Pr:#9ad86a,Nd:#c77dd6,Pm:#7bf0d0,Sm:#ffd36b,Eu:#ff3d4f,Gd:#d0d8e0,Tb:#4dff88,Dy:#ffe66b,Ho:#ffb27a,Er:#ff8fb0,Tm:#69b4ff,Yb:#d9e0e6,Lu:#d3dae1,Hf:#a9b4c0,Ta:#7f93a8,W:#ffcf6a,Re:#aeb6bf,Os:#7aa6c8,Ir:#d6dde6,Pt:#e8eef4,Au:#ffc233,Hg:#9fb4ff,Tl:#9aff7a,Pb:#8fb4ff,Bi:#ff9ccf,Po:#7ad7ff,At:#8a7aa6,Rn:#ff6a3d,Fr:#d6c2ff,Ra:#7dffb2,Ac:#6fd8ff,Th:#cfd8e0,Pa:#d6dbe0,U:#8bff3f,Pu:#ff7a3a,Am:#8fbfff,Cm:#a678ff,Es:#7fe0ff';

const CATEGORY_GLOW: Record<Cat, string> = {
  nm: '#58b868',
  md: '#a8bf3a',
  tm: '#e8934a',
  ae: '#e9bb3a',
  ln: '#c273d6',
  hl: '#4ea8d6',
  ng: '#8f6fe0',
  alk: '#f0805a',
  pt: '#8f9fb0',
  ac: '#e06fa6',
};

/** Brilho das letras soltas (as que não formam símbolo): ouro quente, discreto. */
export const LOOSE_GLOW = '#d5aa37';

export type ElementInfo = { sym: string; z: number; name: string; cat: Cat; glow: string };
export type Seg = ElementInfo | { ch: string };
export const isElement = (seg: Seg): seg is ElementInfo => 'sym' in seg;

const glowBySymbol = new Map(REAL_GLOW.split(',').map((entry) => entry.split(':') as [string, string]));
const TABLE = new Map<string, Omit<ElementInfo, 'sym'>>();
ELEMENTS.split(',').forEach((entry, idx) => {
  const [sym, name] = entry.split(':');
  const z = idx + 1;
  const cat = category(sym, z);
  TABLE.set(sym.toLowerCase(), { z, name, cat, glow: glowBySymbol.get(sym) ?? CATEGORY_GLOW[cat] });
});

/** Escreve a palavra com símbolos reais, maximizando as letras cobertas; as sobras ficam soltas. */
export function spell(word: string): Seg[] {
  const low = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const n = low.length;
  const best: { score: number; segs: Seg[] }[] = Array.from({ length: n + 1 }, () => ({ score: -1, segs: [] }));
  best[n] = { score: 0, segs: [] };
  for (let i = n - 1; i >= 0; i -= 1) {
    let pick = { score: best[i + 1].score, segs: [{ ch: word[i].toUpperCase() } as Seg, ...best[i + 1].segs] };
    for (const len of [1, 2]) {
      const key = low.slice(i, i + len);
      const el = key.length === len ? TABLE.get(key) : undefined;
      if (!el) continue;
      const score = best[i + len].score + len;
      if (score > pick.score) pick = { score, segs: [{ sym: key[0].toUpperCase() + key.slice(1), ...el } as Seg, ...best[i + len].segs] };
    }
    best[i] = pick;
  }
  return best[0].segs;
}
