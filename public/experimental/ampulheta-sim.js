// ampulheta-sim.js — lógica da ampulheta sem desenho (testável em Node).
// Coordenadas locais em metros: base do vidro em y=0, gargalo no meio, topo em ~0,13.
// A pilha de baixo (em pé) são as posições do próprio GLB, apoiadas na base.
// A pilha de cima tem a mesma distribuição de alturas, apoiada no gargalo.
// Ao virar, a câmara que ficou em cima passa a ser a da areia, e ela cai pelo gargalo.

export const GRAIN_R = 0.00095;
export const CYCLE_S = 60; // tempo de uma ampulheta cheia (s)
export const FLIGHT_S = 0.38; // queda de um grão pelo gargalo (s)
export const FLIP_S = 1.2; // inversão (s)

// Perfil do vidro: raio máximo por fatia de altura, lido dos vértices.
export function buildProfile(glassPos, binMm = 0.5) {
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 1; i < glassPos.length; i += 3) {
    if (glassPos[i] < yMin) yMin = glassPos[i];
    if (glassPos[i] > yMax) yMax = glassPos[i];
  }
  const bin = binMm / 1000;
  const n = Math.ceil((yMax - yMin) / bin) + 1;
  const rMax = new Float64Array(n);
  for (let i = 0; i < glassPos.length; i += 3) {
    const b = Math.round((glassPos[i + 1] - yMin) / bin);
    const r = Math.hypot(glassPos[i], glassPos[i + 2]);
    if (r > rMax[b]) rMax[b] = r;
  }
  const span = yMax - yMin;
  let neckY = yMin + span / 2, neckR = Infinity;
  for (let b = 0; b < n; b++) {
    const y = yMin + b * bin;
    if (y < yMin + span * 0.35 || y > yMin + span * 0.65) continue;
    if (rMax[b] > 0 && rMax[b] < neckR) { neckR = rMax[b]; neckY = y; }
  }
  const wall = 0.0008 + GRAIN_R; // parede de 0,8 mm + folga do grão
  const rAt = (y) => {
    const f = (y - yMin) / bin;
    const b0 = Math.max(0, Math.min(n - 1, Math.floor(f)));
    const b1 = Math.min(n - 1, b0 + 1);
    const t = Math.min(1, Math.max(0, f - b0));
    return Math.max(0, rMax[b0] * (1 - t) + rMax[b1] * t - wall);
  };
  return { yMin, yMax, mid: (yMin + yMax) / 2, neckY, neckR, rAt };
}

// Mistura determinística (semente fixa: a mesma pilha em todo carregamento).
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function sortByY(arr) {
  const n = arr.length / 3;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[a * 3 + 1] - arr[b * 3 + 1]);
  const out = new Float32Array(arr.length);
  idx.forEach((s, d) => {
    out[d * 3] = arr[s * 3]; out[d * 3 + 1] = arr[s * 3 + 1]; out[d * 3 + 2] = arr[s * 3 + 2];
  });
  return out;
}

function mirrorY(arr, c) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i += 3) {
    out[i] = arr[i]; out[i + 1] = 2 * c - arr[i + 1]; out[i + 2] = arr[i + 2];
  }
  return out;
}

// Espalha pontos num disco de raio rAt(y), na altura y de cada um.
function scatterAt(heights, profile) {
  const rnd = rng(11);
  const out = new Float32Array(heights.length * 3);
  for (let i = 0; i < heights.length; i++) {
    const y = heights[i];
    const R = profile.rAt(y);
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * R;
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(a) * r;
  }
  return out;
}

// Duas orientações. Em cada uma: source (câmara de onde a areia sai) e dest (onde ela pousa).
// Os arrays de dest vêm ordenados do chão para cima (índice = ordem de chegada).
export function buildLayouts(lowRest, profile) {
  const N = lowRest.length / 3;
  const low = sortByY(lowRest); // em pé: pilha de baixo, crescente em y (base em y≈0)
  const up = sortByY(scatterAt(
    Array.from({ length: N }, (_, i) => profile.neckY + 0.0012 + (low[i * 3 + 1] - profile.yMin)),
    profile,
  ));
  // em pé: origem = cima (sobre o gargalo); destino = baixo (sobre a base)
  const upright = { flipped: false, source: up, dest: low };
  // invertido: o espelho em torno do gargalo põe a areia da base na câmara de cima…
  const flipSource = mirrorY(up, profile.neckY); // …abaixo do gargalo: era a câmara de cima
  const flipDest = mirrorY(low, profile.mid); // …encostada no teto: era a base
  const inverted = {
    flipped: true,
    source: flipSource,
    // o chão agora é o teto original: ordena por distância do chão (y decrescente)
    dest: sortByWorld(flipDest, true, profile.mid),
  };
  return { N, layouts: [upright, inverted] };
}

// Ordena índices por altura no mundo: crescente se for do chão para cima.
export function sortByWorld(arr, flipped, mid) {
  const n = arr.length / 3;
  const wy = (i) => (flipped ? 2 * mid - arr[i * 3 + 1] : arr[i * 3 + 1]);
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => wy(a) - wy(b));
  const out = new Float32Array(arr.length);
  idx.forEach((s, d) => {
    out[d * 3] = arr[s * 3]; out[d * 3 + 1] = arr[s * 3 + 1]; out[d * 3 + 2] = arr[s * 3 + 2];
  });
  return out;
}

// Ordem de saída de cima para baixo (maior altura no mundo primeiro).
function departureOrder(src, flipped, mid) {
  const n = src.length / 3;
  const wy = (i) => (flipped ? 2 * mid - src[i * 3 + 1] : src[i * 3 + 1]);
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => wy(b) - wy(a));
}

export class Sand {
  constructor(lowRest, profile) {
    this.profile = profile;
    const { N, layouts } = buildLayouts(lowRest, profile);
    this.N = N;
    this.layouts = layouts;
    this.pos = new Float32Array(N * 3); // posição atual de cada grão (locais)
    this.flipped = false;
    this.flips = 0;
    this.cycleT = 0; // tempo dentro do ciclo atual
    this.flipT = -1; // tempo da inversão em curso (<0 = parado)
    this.enter(0);
  }

  // Prepara o ciclo com a orientação `k` (0 = em pé, 1 = invertida).
  enter(k) {
    const L = this.layouts[k];
    this.flipped = L.flipped;
    this.src = L.source;
    this.dst = L.dest;
    this.order = departureOrder(this.src, this.flipped, this.profile.mid);
    this.departed = 0;
    this.flight = [];
    for (let m = 0; m < this.N; m++) {
      const g = this.order[m];
      this.pos[g * 3] = this.src[m * 3];
      this.pos[g * 3 + 1] = this.src[m * 3 + 1];
      this.pos[g * 3 + 2] = this.src[m * 3 + 2];
    }
  }

  get inFlight() { return this.flight.length; }
  get remaining() { return this.N - this.departed; }

  update(dt) {
    if (this.flipT >= 0) return this.updateFlip(dt);
    this.cycleT = Math.min(CYCLE_S, this.cycleT + dt);
    const want = Math.floor(this.N * (this.cycleT / CYCLE_S));
    while (this.departed < want && this.departed < this.N) this.launch();
    for (let k = this.flight.length - 1; k >= 0; k--) {
      const f = this.flight[k];
      f.t += dt;
      const p = Math.min(1, f.t / FLIGHT_S);
      this.placeFlight(f, p);
      if (p >= 1) this.flight.splice(k, 1);
    }
    if (this.cycleT >= CYCLE_S && this.departed >= this.N && this.flight.length === 0) {
      this.flipT = 0;
      this.flipTarget = this.targetAfterFlip();
      this.flipFrom = Float32Array.from(this.pos);
    }
    return true;
  }

  launch() {
    const g = this.order[this.departed];
    this.flight.push({
      g,
      t: 0,
      from: [this.pos[g * 3], this.pos[g * 3 + 1], this.pos[g * 3 + 2]],
      toSlot: this.departed, // o grão que sai por último pousa no topo da pilha de baixo
    });
    this.departed++;
  }

  // Passa pelo gargalo, depois cai até o slot de destino.
  placeFlight(f, p) {
    const neck = this.profile.neckY;
    const d = f.toSlot * 3;
    const tx = this.dst[d], ty = this.dst[d + 1], tz = this.dst[d + 2];
    const g = f.g * 3;
    if (p < 0.4) {
      const u = p / 0.4;
      this.pos[g] = f.from[0] * (1 - u);
      this.pos[g + 1] = f.from[1] + (neck - f.from[1]) * u * u;
      this.pos[g + 2] = f.from[2] * (1 - u);
    } else {
      const u = (p - 0.4) / 0.6;
      this.pos[g] = tx * u;
      this.pos[g + 1] = neck + (ty - neck) * (u * u); // a queda acelera
      this.pos[g + 2] = tz * u;
    }
  }

  // Posição de cada grão quando a areia estiver na orientação invertida.
  targetAfterFlip() {
    const L = this.layouts[this.flipped ? 0 : 1];
    const out = new Float32Array(this.N * 3);
    const order = departureOrder(L.source, L.flipped, this.profile.mid);
    for (let m = 0; m < this.N; m++) {
      const g = order[m];
      out[g * 3] = L.source[m * 3];
      out[g * 3 + 1] = L.source[m * 3 + 1];
      out[g * 3 + 2] = L.source[m * 3 + 2];
    }
    return out;
  }

  // A inversão é suave: cada grão vai da posição de pouso até a pilha nova.
  updateFlip(dt) {
    this.flipT += dt;
    const t = Math.min(1, this.flipT / FLIP_S);
    const e = t * t * (3 - 2 * t);
    for (let i = 0; i < this.pos.length; i++) {
      this.pos[i] = this.flipFrom[i] + (this.flipTarget[i] - this.flipFrom[i]) * e;
    }
    if (t >= 1) {
      this.flipT = -1;
      this.flips++;
      this.cycleT = 0;
      this.enter(this.flipped ? 0 : 1);
    }
    return true;
  }
}
