import * as THREE from 'three';

/**
 * Ambiente de iluminação baseada em imagem (IBL) procedural: cúpula noturna
 * azul-lunar + painéis de luz (chave quente, contraluz frio, rebatedor dourado).
 * Gera um PMREM uma única vez; a cena temporária é descartada em seguida.
 * É o que dá vida ao ouro (metalness) sem tingir a cor-base do modelo.
 */
export function createStudioEnvironment(renderer) {
  const gl = renderer.getContext?.();
  if (gl?.isContextLost?.()) throw new Error('Contexto WebGL perdido: não é possível gerar o ambiente.');
  const scene = new THREE.Scene();
  const disposables = [];

  // Cúpula com gradiente vertical
  const dome = new THREE.SphereGeometry(20, 48, 24);
  const pos = dome.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const stops = [
    [-1.0, new THREE.Color('#0d1124')],
    [-0.15, new THREE.Color('#252d55')],
    [0.25, new THREE.Color('#6e7db4')],
    [1.0, new THREE.Color('#d9e2ff')],
  ];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 20;
    let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1][0]) k++;
    const [y0, c0] = stops[k];
    const [y1, c1] = stops[k + 1];
    const t = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1);
    c.copy(c0).lerp(c1, t).multiplyScalar(0.9);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  dome.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false });
  scene.add(new THREE.Mesh(dome, domeMat));
  disposables.push(dome, domeMat);

  const panel = (w, h, color, k, at) => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...at);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(g, m);
  };
  panel(11, 7, '#ffe8c6', 4.2, [-9, 9, 12]); // chave: softbox quente, alto à esquerda/frente
  panel(3.2, 13, '#9fb9ff', 3.6, [13, 4, -10]); // contraluz lunar frio
  panel(15, 3.2, '#ffd9a2', 1.7, [0, -5.5, 8]); // rebatedor dourado baixo (quica no ouro)
  panel(6, 6, '#b8c8ff', 1.4, [-12, 3, -6]); // enchimento frio traseiro

  let pmrem = null;
  let rt = null;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    rt = pmrem.fromScene(scene, 0.09, 0.1, 100);
  } catch (e) {
    try { rt?.dispose(); } catch { /* ignora */ }
    throw e;
  } finally {
    // o gerador e a cena temporária nunca sobrevivem à chamada (nem em caso de erro)
    try { pmrem?.dispose(); } catch { /* ignora */ }
    disposables.forEach((d) => d.dispose());
  }
  let disposed = false;
  return {
    texture: rt.texture,
    renderTarget: rt,
    dispose: () => { if (disposed) return; disposed = true; rt.dispose(); },
    /**
     * Confere se o PMREM tem CONTEÚDO (não só um alvo alocado): lê alguns texels e exige energia > 0.
     * Devolve { ok: true|false|null, sum } — null = leitura não suportada neste contexto.
     */
    probe: () => probeRenderTarget(renderer, rt),
  };
}

/**
 * Confere se o alvo do PMREM tem CONTEÚDO (um alvo recém-alocado e nunca renderizado é todo zero).
 * Lê duas faixas de largura total na parte de cima do atlas, onde o nível de maior resolução sempre
 * está preenchido (partes do atlas são vazias por construção: não se pode amostrar um ponto qualquer).
 * Devolve { ok: true|false|null, sum }; null = leitura não suportada neste contexto.
 */
export function probeRenderTarget(renderer, rt) {
  try {
    const isHalf = rt.texture.type === THREE.HalfFloatType;
    let sum = 0;
    for (const y of [Math.floor(rt.height / 16), Math.floor(rt.height / 4)]) {
      const buf = isHalf ? new Uint16Array(rt.width * 4) : new Float32Array(rt.width * 4);
      renderer.readRenderTargetPixels(rt, 0, y, rt.width, 1, buf);
      for (let i = 0; i < buf.length; i++) sum += buf[i];
    }
    return { ok: sum > 0, sum };
  } catch (e) {
    return { ok: null, sum: null, error: String(e?.message || e) };
  }
}
