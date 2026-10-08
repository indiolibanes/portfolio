/**
 * Ordem editorial canônica. As etapas internas de Método e os cartões
 * do Laboratório possuem numeração própria e não entram nesta sequência.
 */
export const SECTION_ORDER = [
  'sobre',
  'lab',
  'metodo',
  'bastidores',
  'percurso',
  'musica',
  'contato',
] as const;

export type SectionId = (typeof SECTION_ORDER)[number];

export function sectionNumber(section: SectionId): string {
  return String(SECTION_ORDER.indexOf(section) + 1).padStart(2, '0');
}
