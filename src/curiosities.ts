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
export const CURIOSITIES_UPDATED = '2026-10-17';

export const CURIOSITIES: Curiosity[] = [
  {
    id: 'prisma',
    tag: 'Música',
    title: 'Um prisma na porta de entrada',
    text: 'O prisma que abre a página inicial é um aceno a The Dark Side of the Moon. Pink Floyd é minha banda favorita, e a imagem funciona como um pequeno aviso sobre o resto do site: algo simples que organiza a luz.',
    why: 'Um bom álbum é um bom sistema: abertura, tensão e fecho sob uma só ideia.',
    accent: 'violet',
  },
  {
    id: 'blocos',
    tag: 'Jogos',
    title: 'Tijolos e um triângulo dourado',
    text: 'Meu nome na home é montado com blocos de Super Mario, e a Triforce de Zelda também aparece por aqui. São dois jogos que fazem parte do meu repertório visual.',
    why: 'Interface pode ter humor, desde que não atrapalhe quem só quer ler.',
    accent: 'sun',
  },
  {
    id: 'idiomas',
    tag: 'Línguas',
    title: 'Português, inglês e um italiano em construção',
    text: 'Trabalho em português e inglês e estudo italiano, sem certificado e em algum ponto entre o A2 e o B1. Prefiro ler o original a depender de tradução automática.',
    why: 'Quem lê no idioma de origem percebe o que uma tradução precisou decidir.',
    accent: 'blue',
  },
  {
    id: 'traducao',
    tag: 'Palavra',
    title: 'Um livro ainda a meio caminho',
    text: 'Estou traduzindo The Big Picture, de Sean Carroll, do inglês para o português. O trabalho não terminou, e este portfólio diz isso com todas as letras em vez de fingir o contrário.',
    why: 'Traduzir ensina a ler devagar; terminar ensina a decidir o que fica.',
    accent: 'rose',
    link: { href: '/#lab', label: 'Ver no Laboratório' },
  },
  {
    id: 'ideia-central',
    tag: 'Escrita',
    title: 'Uma ideia por texto',
    text: 'Escrevo de modo reflexivo e abstrato, com muitas citações, e procuro um eixo único para cada texto. O resto é incubação: algumas ideias só ficam prontas depois de esperar.',
    why: 'Texto bom costuma ter uma ideia só e espaço para ela respirar.',
    accent: 'peach',
  },
  {
    id: 'medida',
    tag: 'Tipografia',
    title: 'A medida da linha',
    text: 'Para leitura longa, prefiro linhas de 60 a 70 caracteres e entrelinha perto de 1,7. É a regra que sigo quando decido como um texto deve parecer na tela.',
    why: 'Legibilidade é uma forma de cortesia com quem lê.',
    accent: 'mint',
  },
  {
    id: 'interesses',
    tag: 'Interesses',
    title: 'Perguntas que não cabem numa área só',
    text: 'Filosofia, linguística, física, neurobiologia, livros, anime e jogos. A lista não tem ordem, e é nas conexões entre esses temas que costumo achar o que escrever.',
    why: 'Curiosidade dispersa vira método quando ganha um lugar para registrar.',
    accent: 'violet',
  },
  {
    id: 'ferramentas',
    tag: 'Método',
    title: 'Notas em Markdown, publicação por Git',
    text: 'As notas nascem no Obsidian e chegam ao Horologiarius por um fluxo com revisão manual antes de ir ao ar. Prefiro ferramentas abertas, que eu possa levar comigo.',
    why: 'Se a escrita sobrevive à ferramenta, ela vale mais do que a ferramenta.',
    accent: 'blue',
    link: { href: 'https://horologiarius.com/', label: 'Abrir o Horologiarius', external: true },
  },
  {
    id: 'sophia',
    tag: 'Arquivo',
    title: 'A raposa que mora no site',
    text: 'Sophia é uma pequena raposa de procedência incerta que aparece pelo Laboratório, pelo rodapé e por cantos inesperados. Não trabalha aqui, mas tem página própria.',
    why: 'Todo arquivo ganha com uma presença que não explica nada.',
    accent: 'rose',
    link: { href: '/sophia/', label: 'Conhecer Sophia' },
    wide: true,
  },
];
