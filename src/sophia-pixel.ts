/**
 * Sophia em pixel art — fonte única dos sprites da página 404.
 *
 * Tudo aqui é texto: cada letra é um pixel. Para retocar um sprite, edite as
 * linhas e recarregue; nada depende de imagem. As formas viram <path> no build
 * (uma por tom), então o resultado é SVG nítido, sem arquivo extra.
 *
 * Paleta monocromática (a cena é sempre escura):
 *   W pelagem clara   g pelagem em sombra   m pelagem escura (pontas, patas)
 *   w branco puro     K tinta (olhos, nariz, estrela)   . vazio
 *
 * Marcas de Sophia que os sprites carregam: orelhas altas de ponta escura,
 * tufos nas bochechas, estrela de quatro pontas na testa, olhos alados e a
 * cauda grande de ponta escura.
 */

export const TONE = {
  W: '#f3f3f0',
  w: '#ffffff',
  g: '#b4b4ae',
  m: '#77776f',
  K: '#0d0d0d',
} as const;

export type Rows = string[];

export interface PixelPath {
  fill: string;
  d: string;
}

/** Uma tela de pixels: cada célula guarda uma cor (#rrggbb) ou nada. */
export class Pixels {
  readonly w: number;
  readonly h: number;
  private cells: (string | null)[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: w * h }, () => null);
  }

  set(x: number, y: number, fill: string | null): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = fill;
    return this;
  }

  get(x: number, y: number): string | null {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y * this.w + x] : null;
  }

  rect(x: number, y: number, w: number, h: number, fill: string | null): this {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.set(x + i, y + j, fill);
    return this;
  }

  /** Linhas retas (horizontal/vertical/diagonal simples) por Bresenham. */
  line(x0: number, y0: number, x1: number, y1: number, fill: string): this {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, fill);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }

  /** Cola outro sprite; células vazias do sprite colado não apagam nada. */
  stamp(other: Pixels, x: number, y: number): this {
    for (let j = 0; j < other.h; j += 1) {
      for (let i = 0; i < other.w; i += 1) {
        const c = other.get(i, j);
        if (c) this.set(x + i, y + j, c);
      }
    }
    return this;
  }

  /** Desloca cada linha por f(linha); serve para inclinar a cabeça sem borrar. */
  shearRows(f: (row: number) => number): Pixels {
    const out = new Pixels(this.w, this.h);
    for (let j = 0; j < this.h; j += 1) {
      const dx = f(j);
      for (let i = 0; i < this.w; i += 1) out.set(i + dx, j, this.get(i, j));
    }
    return out;
  }

  shift(dx: number, dy: number): Pixels {
    const out = new Pixels(this.w, this.h);
    for (let j = 0; j < this.h; j += 1) for (let i = 0; i < this.w; i += 1) out.set(i + dx, j + dy, this.get(i, j));
    return out;
  }

  /** Um <path> por cor, com corridas horizontais fundidas. */
  paths(): PixelPath[] {
    const byFill = new Map<string, string[]>();
    for (let y = 0; y < this.h; y += 1) {
      let x = 0;
      while (x < this.w) {
        const c = this.get(x, y);
        if (!c) { x += 1; continue; }
        let run = 1;
        while (x + run < this.w && this.get(x + run, y) === c) run += 1;
        if (!byFill.has(c)) byFill.set(c, []);
        byFill.get(c)!.push(`M${x} ${y}h${run}v1h-${run}z`);
        x += run;
      }
    }
    return [...byFill.entries()].map(([fill, parts]) => ({ fill, d: parts.join('') }));
  }
}

/** Lê linhas de texto; cada letra usa a paleta, '.' e ' ' são vazios. */
export function fromRows(rows: Rows, palette: Record<string, string> = TONE): Pixels {
  const w = Math.max(...rows.map((r) => r.length));
  const px = new Pixels(w, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = palette[ch];
      if (fill) px.set(x, y, fill);
    });
  });
  return px;
}

/** Espelha metade (a última coluna é o eixo) numa largura ímpar. */
export function mirror(half: Rows): Rows {
  return half.map((row) => row + [...row.slice(0, -1)].reverse().join(''));
}

/** Pixels de pelagem clara que ficam sobre o vazio (em baixo) ganham sombra. */
export function shadeUnderside(px: Pixels): Pixels {
  const out = new Pixels(px.w, px.h);
  for (let y = 0; y < px.h; y += 1) {
    for (let x = 0; x < px.w; x += 1) {
      const c = px.get(x, y);
      out.set(x, y, c === TONE.W && !px.get(x, y + 1) ? TONE.g : c);
    }
  }
  return out;
}
