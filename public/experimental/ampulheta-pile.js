// ampulheta-pile.js — os grãos caem na mesa quando o vidro quebra e ficam ali.
// Dinâmica por posição (PBD) com esferas: gravidade, contato entre grãos (grade espacial)
// e contato com a mesa (y = 0). Quando tudo repousa, a simulação para de vez.

const G = 9.8;

export class SandPile {
  // pos: Float32Array N*3 em coordenadas do mundo (metros). r: raio do grão.
  constructor(pos, r) {
    this.N = pos.length / 3;
    this.r = r;
    this.p = Float32Array.from(pos);
    this.v = new Float32Array(this.N * 3);
    this.rest = new Uint8Array(this.N);
    this.cell = 2 * r;
    this.settled = false;
    // grade espacial: cabeça por célula + próximo por grão
    this.head = new Int32Array(0);
    this.next = new Int32Array(this.N);
    this.cells = 0;
  }

  step(dt) {
    if (this.settled) return;
    const h = Math.min(dt, 1 / 30) / 2; // dois subpassos por quadro
    for (let s = 0; s < 2; s++) this.substep(h);
    // repouso: nenhum grão se mexe mais que um décimo do raio por quadro
    let moving = 0;
    for (let i = 0; i < this.N; i++) {
      const sp = Math.hypot(this.v[i * 3], this.v[i * 3 + 1], this.v[i * 3 + 2]);
      if (sp > this.r * 0.5) moving++;
    }
    if (moving === 0) this.settled = true;
  }

  substep(h) {
    const { p, v, N, r } = this;
    for (let i = 0; i < N * 3; i += 3) {
      v[i + 1] -= G * h;
      p[i] += v[i] * h;
      p[i + 1] += v[i + 1] * h;
      p[i + 2] += v[i + 2] * h;
    }
    // uma passada de restrições por subpasso
    this.buildGrid();
    this.solveContacts();
    this.solvePlane();
    // velocidade derivada da posição (PBD) e atrito simples no chão
    for (let i = 0; i < N * 3; i += 3) {
      v[i] *= 0.995; v[i + 1] *= 0.995; v[i + 2] *= 0.995;
    }
  }

  buildGrid() {
    const { p, N } = this;
    const c = this.cell;
    let minX = Infinity, minZ = Infinity, minY = Infinity, maxX = -Infinity, maxZ = -Infinity, maxY = -Infinity;
    for (let i = 0; i < N; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    this.ox = minX - c; this.oy = minY - c; this.oz = minZ - c;
    this.nx = Math.ceil((maxX - this.ox) / c) + 2;
    this.ny = Math.ceil((maxY - this.oy) / c) + 2;
    this.nz = Math.ceil((maxZ - this.oz) / c) + 2;
    const total = this.nx * this.ny * this.nz;
    if (this.head.length !== total) this.head = new Int32Array(total);
    this.head.fill(-1);
    for (let i = 0; i < N; i++) {
      const cx = Math.floor((p[i * 3] - this.ox) / c);
      const cy = Math.floor((p[i * 3 + 1] - this.oy) / c);
      const cz = Math.floor((p[i * 3 + 2] - this.oz) / c);
      const k = (cz * this.ny + cy) * this.nx + cx;
      this.next[i] = this.head[k];
      this.head[k] = i;
    }
  }

  solveContacts() {
    const { p, v, N, r, head, next, nx, ny, nz } = this;
    const d2min = (2 * r) * (2 * r);
    const c = this.cell;
    for (let i = 0; i < N; i++) {
      const ix = Math.floor((p[i * 3] - this.ox) / c);
      const iy = Math.floor((p[i * 3 + 1] - this.oy) / c);
      const iz = Math.floor((p[i * 3 + 2] - this.oz) / c);
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx, cy = iy + dy, cz = iz + dz;
        if (cx < 0 || cy < 0 || cz < 0 || cx >= nx || cy >= ny || cz >= nz) continue;
        for (let j = head[(cz * ny + cy) * nx + cx]; j !== -1; j = next[j]) {
          if (j <= i) continue;
          const ax = p[j * 3] - p[i * 3], ay = p[j * 3 + 1] - p[i * 3 + 1], az = p[j * 3 + 2] - p[i * 3 + 2];
          const d2 = ax * ax + ay * ay + az * az;
          if (d2 >= d2min || d2 < 1e-16) continue;
          const d = Math.sqrt(d2);
          const corr = (2 * r - d) * 0.5 / d;
          const ux = ax * corr, uy = ay * corr, uz = az * corr;
          p[i * 3] -= ux; p[i * 3 + 1] -= uy; p[i * 3 + 2] -= uz;
          p[j * 3] += ux; p[j * 3 + 1] += uy; p[j * 3 + 2] += uz;
          // amortece a velocidade relativa na direção do contato
          const rvx = v[j * 3] - v[i * 3], rvy = v[j * 3 + 1] - v[i * 3 + 1], rvz = v[j * 3 + 2] - v[i * 3 + 2];
          const vn = (rvx * ax + rvy * ay + rvz * az) / d;
          if (vn < 0) {
            const k = vn * 0.5 / d;
            v[i * 3] += ax * k; v[i * 3 + 1] += ay * k; v[i * 3 + 2] += az * k;
            v[j * 3] -= ax * k; v[j * 3 + 1] -= ay * k; v[j * 3 + 2] -= az * k;
          }
        }
      }
    }
  }

  // mesa: y ≥ r; o contato com o chão absorve quase toda a energia (grão de areia não quica)
  solvePlane() {
    const { p, v, N, r } = this;
    for (let i = 0; i < N; i++) {
      if (p[i * 3 + 1] < r) {
        p[i * 3 + 1] = r;
        if (v[i * 3 + 1] < 0) v[i * 3 + 1] = 0;
        v[i * 3] *= 0.7; v[i * 3 + 2] *= 0.7;
      }
    }
  }
}
