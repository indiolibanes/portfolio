/**
 * Curiosidades — fonte única da página /curiosidades/.
 *
 * Para acrescentar um item, copie um bloco abaixo e coloque-o onde quiser na lista.
 * - tag:    tema curto (Música, Jogos, Palavra…).
 * - text:   a curiosidade em si, em 1–3 frases.
 * - why:    por que ela importa — uma frase, sempre para o leitor, nunca só para o autor.
 * - accent: cor de apoio da paleta quente do site.
 * - link:   opcional. `external: true` abre em nova aba (rel e aviso de acessibilidade já vêm no componente).
 * - wide:   opcional. Ocupa a largura inteira da grade (use no máximo um, no fim).
 *
 * Ao atualizar a lista, atualize também CURIOSITIES_UPDATED.
 * Mantenha fora daqui o que é íntimo: família, saúde, crenças e posições políticas.
 */

export type CuriosityAccent = 'sun' | 'rose' | 'blue' | 'mint' | 'peach' | 'violet';

export interface Curiosity {
  id: string;
  tag: string;
  title: string;
  text: string;
  why: string;
  accent: CuriosityAccent;
  link?: { href: string; label: string; external?: boolean };
  wide?: boolean;
}

/** Data da última adição, em ISO (AAAA-MM-DD). */
export const CURIOSITIES_UPDATED = '2026-10-26';

export const CURIOSITIES: Curiosity[] = [
  {
    id: 'prisma',
    tag: 'Música',
    title: 'Um prisma na porta de entrada',
    text: 'O prisma que abre a página inicial é uma referência explícita ao The Dark Side of the Moon, da banda britânica Pink Floyd. Trata-se da minha banda favorita, portanto, a imagem funciona como um prefácio para o resto do site: algo simples que organiza a luz — ou a trilha sonora para o que virá.',
    why: 'Um bom álbum é um sistema de referência: abertura, tensão e fecho sob uma só ideia.',
    accent: 'violet',
  },
  {
    id: 'triangulo',
    tag: 'Jogos',
    title: 'Um triângulo dourado',
    text: 'O sistema heliocêntrico, estabelecido por Copérnico, aqui ganha a sua nova luz. Substituímos a figura central do sol por algo mais moderno: a Triforce de Zelda. O repertório visual é reimaginado para àqueles que devem — ou deveriam conhecer — Ocarina of Time ou Breath of the Wild.',
    why: 'Interface pode ter algum peso, desde que seja clara em seu propósito.',
    accent: 'sun',
  },
  {
    id: 'idiomas',
    tag: 'Línguas',
    title: 'Português, inglês e um espanhol e um italiano em construção',
    text: 'Escrevo em português e inglês e estudo espanhol e italiano por conta própria, sem certificação. No italiano, situo-me aproximadamente entre os níveis A2 e B1. Às vezes, prefiro ler no idioma original a depender da qualidade da tradução automática.',
    why: 'Quem lê no idioma de origem percebe o que uma tradução precisou decidir.',
    accent: 'blue',
  },
  {
    id: 'traducao',
    tag: 'Palavra',
    title: 'Uma tradução ainda a meio caminho',
    text: 'Estou traduzindo The Big Picture, de Sean Carroll, do inglês para o português. O trabalho ainda está em fase inicial, e este portfólio é transparente ao admiti-lo. Conceitos densos da física teórica e da filosofia da ciência exigem um esforço considerável de compreensão — especialmente em um idioma estrangeiro.',
    why: 'Traduzir ensina a virtude da paciência; terminar ensina a decidir o que fica.',
    accent: 'rose',
    link: { href: '/#lab', label: 'Ver no Laboratório' },
  },
  {
    id: 'ideia-central',
    tag: 'Escrita',
    title: 'Uma ideia por texto',
    text: 'Geralmente escrevo em uma linguagem impessoal e abstrata, com diversas citações, que alguns leitores podem considerar pedante. No entanto, sempre procuro uma ideia central; os temas se conectam no final, pois algumas ideias só ficam prontas para a cerimônia de encerramento.',
    why: 'Texto bom costuma ter uma ideia só e espaço para ela respirar.',
    accent: 'peach',
  },
  {
    id: 'medida',
    tag: 'Tipografia',
    title: 'A medida da linha',
    text: 'Para leitura longa, prefiro linhas de 60 a 70 caracteres — quisera eu ser da escola do aforismo — e entrelinha perto de 1,7. É a conduta que sigo quando decido como um texto deve parecer na tela.',
    why: 'Legibilidade é uma forma de cortesia com quem lê.',
    accent: 'mint',
  },
  {
    id: 'interesses',
    tag: 'Interesses',
    title: 'Perguntas que não cabem numa área só',
    text: 'Filosofia, linguística, física, neurobiologia e referências culturais encontradas em livros, anime e jogos. A lista não possui uma ordem definida, e é na ressonância afetiva com esses temas que costumo encontrar o que escrever.',
    why: 'Curiosidade dispersa vira método quando ganha um lugar para registrar.',
    accent: 'violet',
  },
  {
    id: 'ferramentas',
    tag: 'Método',
    title: 'Notas em Markdown, publicação por Git',
    text: 'As notas se originam no Obsidian e passam por revisão manual antes da publicação — um processo de curadoria humana. Há também um mecanismo silencioso que converte Markdown em HTML para que essas notas ganhem vida, mas essa responsabilidade é do front-end, não minha.',
    why: 'Se a escrita sobrevive ao processo, logo, vale mais do que suas engrenagens.',
    accent: 'blue',
  },
  {
    id: 'sophia',
    tag: 'Arquivo',
    title: 'A raposa que reside no site',
    text: 'Sophia é uma pequena raposa de procedência incerta que aparece em algumas seções ou em cantos inesperados. Não se sabe ao certo o que faz, mas tem página própria.',
    why: 'Todo arquivo ganha com uma presença que nada explica.',
    accent: 'rose',
    link: { href: '/sophia/', label: 'Conhecer Sophia' },
    wide: true,
  },
];

/**
 * Processo criativo — bloco de texto corrido abaixo da lista de curiosidades.
 * Cada etapa tem um rótulo curto (label) e o texto (body). Em `intro`, o parágrafo de abertura.
 */
export interface CreativeStep {
  label: string;
  body: string;
}

export const CREATIVE_PROCESS: { title: string; intro: string; steps: CreativeStep[] } = {
  title: 'Como nasce um projeto',
  intro:
    'Por questão de pensamento lateral, meus projetos raramente nascem prontos ou respeitam algum tipo de linearidade. São camadas que se ajuntam e formam um panorama tridimensional — ou quadrimensional se considerarmos o tempo, o elemento central das minhas sinapses.',
  steps: [
    {
      label: 'Experiência e referências.',
      body: 'Quando uma ideia não está necessariamente maturada — se é que virá em algum momento —, aplico um princípio emergencial bastante simples: “copia, mas faz melhor”. Referências existem justamente para permitir progresso e evolução. Desde o avatar de anime ao widget musical de sua respectiva seção. O modo leitura foi “emprestado” de um dos meus jogos favoritos — e desafio-lhes a acertar.',
    },
    {
      label: 'Captura.',
      body: 'Sempre anoto as ideias fragmentadas ou esboços iniciais, sendo de madrugada ao acordar ou durante uma prova; o importante é jamais perdê-los. Elementos como composição, forma de hierarquia, tipografia, paleta de cores e animações aleatórias. Registro tudo em vez de decidir na hora.',
    },
    {
      label: 'Conexão.',
      body: 'A partir dessas anotações, procuro conexões impensadas entre temas aparentemente impossíveis: astrofísica, tempo, tipografia, música, componentes da tabela periódica como menu. Quando agrega à identidade, é implementada; caso contrário, sequer lembro que existiu.',
    },
    {
      label: 'Incubação.',
      body: 'Tempo de maturação de ideias. Muitas soluções só apareceram após um intervalo — como uma latência considerável — e não por esforço direto. Outros elementos posteriores podem contribuir para esse raciocínio. Jamais tratarei esse tempo como improdutivo, pois é a essência do método.',
    },
    {
      label: 'Composição.',
      body: 'Montei as seções, as cenas animadas, os fluxogramas, paleta de cores e easter eggs, priorizando espaçamento, alinhamento e uma composição integrada, em vez de elementos avulsos e que ferem a simetria.',
    },
    {
      label: 'Revisão.',
      body: 'Testo cada mudança em desktop, mobile, movimento otimizado e nos quatro modos (sim, há uma nova versão experimental <i>alpha</i> a caminho) disponíveis. A auditoria tende à profundidade acima da velocidade: corrigir o que pode ser melhorado, mesmo que esteja “utilizável”.',
    },
    {
      label: 'Publicação.',
      body: 'Publiquei em branches dedicadas, mesclando à main quando aplicáveis, com disponibilidade do histórico das decisões. Mantive a documentação para que outras pessoas — ou eu mesmo no futuro — consigam verificar por que o site é como é.',
    },
  ],
};
