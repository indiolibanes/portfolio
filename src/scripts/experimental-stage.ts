/**
 * The moonlit stage is deliberately independent from MusicShelf.
 * The browser imports Three.js only after the visitor activates the experiment.
 * Geometric placeholder anchors are NOT the final Wuthering Waves / Sophia models.
 */
type StageEngine = {
  setActive(active: boolean): void;
  setPaused(paused: boolean): void;
  setAnchors(visible: boolean): void;
  dispose(): void;
};

const root = document.querySelector<HTMLElement>('[data-experiment-root]');

if (root) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-ex-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-ex-panel]')];
  const stage = root.querySelector<HTMLElement>('[data-ex-stage]');
  const container = root.querySelector<HTMLElement>('[data-ex-canvas]');
  const start = root.querySelector<HTMLButtonElement>('[data-ex-start]');
  const pauseButton = root.querySelector<HTMLButtonElement>('[data-ex-pause]');
  const anchorsButton = root.querySelector<HTMLButtonElement>('[data-ex-anchors]');
  const status = root.querySelector<HTMLElement>('[data-ex-status]');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeMode = 'stage';
  let engine: StageEngine | null = null;
  let pending = false;
  let paused = false;
  let anchorsVisible = true;

  function setStatus(message: string) {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function changeMode(mode: string, focus = false) {
    activeMode = mode;
    tabs.forEach((tab) => {
      const selected = tab.dataset.exTab === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.exPanel !== mode;
    });
    engine?.setActive(mode === 'stage');
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => changeMode(tab.dataset.exTab || 'stage'));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      changeMode(tabs[next].dataset.exTab || 'stage', true);
    });
  });

  pauseButton?.addEventListener('click', () => {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    engine?.setPaused(paused);
  });

  anchorsButton?.addEventListener('click', () => {
    anchorsVisible = !anchorsVisible;
    anchorsButton.setAttribute('aria-pressed', String(anchorsVisible));
    anchorsButton.textContent = anchorsVisible ? 'Ocultar âncoras' : 'Mostrar âncoras';
    engine?.setAnchors(anchorsVisible);
  });

  start?.addEventListener('click', async () => {
    if (!stage || !container || pending || engine) return;
    pending = true;
    start.disabled = true;
    setStatus('Preparando a geometria do palco…');
    try {
      engine = await buildStage(container, () => activeMode === 'stage', prefersReduced);
      engine.setPaused(paused);
      engine.setAnchors(anchorsVisible);
      stage.dataset.exState = 'ready';
      setStatus('');
      if (pauseButton) pauseButton.hidden = false;
      if (anchorsButton) anchorsButton.hidden = false;
      engine.setActive(activeMode === 'stage');
    } catch (error) {
      console.warn('Moonlit 2.5D scene unavailable', error);
      setStatus('WebGL indisponível. A composição original continua acessível na outra aba.');
      stage.dataset.exState = 'fallback';
      start.disabled = false;
    } finally {
      pending = false;
    }
  });

  window.addEventListener('pagehide', () => { engine?.dispose(); engine = null; }, { once: true });
}

async function buildStage(
  host: HTMLElement,
  isStageVisible: () => boolean,
  reducedMotion: MediaQueryList,
): Promise<StageEngine> {
  const THREE = await import('three');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = false;
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  // A distant atmospheric set remains in CSS; only contact geometry needs WebGL.
  scene.add(new THREE.HemisphereLight(0xb6cce4, 0x5b4140, 2.25));
  const moonlight = new THREE.DirectionalLight(0xf6e4c4, 2.7);
  moonlight.position.set(-4, 9, -6);
  scene.add(moonlight);
  const crimsonFill = new THREE.PointLight(0xc87483, 14, 11, 2);
  crimsonFill.position.set(-5, 2.6, 0);
  scene.add(crimsonFill);
  const azureFill = new THREE.PointLight(0x91bcf4, 14, 11, 2);
  azureFill.position.set(5, 2.6, 0);
  scene.add(azureFill);

  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
  const stone = new THREE.MeshStandardMaterial({ color: 0x817b86, roughness: .94, metalness: .02 });
  const stoneLight = new THREE.MeshStandardMaterial({ color: 0xb2a5a3, roughness: .94 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x514c5d, roughness: .98 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xbda077, roughness: .43, metalness: .53 });
  const stoneFloor = new THREE.Mesh(new THREE.BoxGeometry(17, .42, 7.25), stone);
  stoneFloor.position.set(0, -.95, .55);
  scene.add(stoneFloor);
  const frontLedge = new THREE.Mesh(new THREE.BoxGeometry(17.4, .22, .22), stoneLight);
  frontLedge.position.set(0, -.69, 4.17);
  scene.add(frontLedge);
  for (let z = -2.65; z < 4.05; z += 1.05) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(17.05, .012, .018), stoneDark);
    seam.position.set(0, -.735, z);
    scene.add(seam);
  }
  for (let x = -8; x < 8.1; x += 1.4) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.016, .012, 7.18), stoneDark);
    seam.position.set(x, -.733, .55);
    scene.add(seam);
  }

  // One real 3D balustrade behind all future characters (not painted onto the sky).
  const rail = new THREE.Group();
  rail.position.z = -3.04;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(17.3, .16, .29), stoneLight);
  lower.position.y = -.23;
  rail.add(lower);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(17.5, .2, .35), stoneLight);
  upper.position.y = 1.13;
  rail.add(upper);
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(17.65, .055, .42), brass);
  railTop.position.y = 1.27;
  rail.add(railTop);
  for (let x = -8.1; x <= 8.1; x += 1.35) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.16, .19, 1.13, 8), stoneLight);
    post.position.set(x, .44, 0);
    rail.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.42, .12, .36), stone);
    base.position.set(x, -.1, 0);
    rail.add(base);
  }
  scene.add(rail);

  const anchors = new THREE.Group();
  const pedestals = [
    { x: -4.5, z: -.58, color: 0xb96c81, radius: 1.23 },
    { x: 0, z: -1.05, color: 0xe2bf8d, radius: 1.38 },
    { x: 4.5, z: -.58, color: 0x88b8e5, radius: 1.23 },
  ];
  for (const entry of pedestals) {
    const group = new THREE.Group();
    group.position.set(entry.x, 0, entry.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(entry.radius, entry.radius + .13, .39, 48), stoneDark);
    base.position.y = -.52;
    group.add(base);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(entry.radius, .025, 8, 52), brass);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = -.315;
    group.add(trim);
    const contact = new THREE.Mesh(
      new THREE.CircleGeometry(entry.radius * .8, 40),
      new THREE.MeshBasicMaterial({ color: entry.color, transparent: true, opacity: .11, depthWrite: false }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -.305;
    group.add(contact);
    const axisMaterial = new THREE.MeshBasicMaterial({ color: entry.color, transparent: true, opacity: .55, depthWrite: false });
    const axis = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 2.6, 6), axisMaterial);
    axis.position.y = 1.05;
    group.add(axis);
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), new THREE.MeshBasicMaterial({ color: entry.color }));
    crown.position.y = 2.47;
    group.add(crown);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.52, .014, 6, 48), axisMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 1.35;
    group.add(halo);
    anchors.add(group);
  }
  // Sophia is not a pedestal: the shorter forward marker reserves walkable space.
  const guide = new THREE.Group();
  guide.position.set(0, 0, 2.74);
  const guideRing = new THREE.Mesh(
    new THREE.TorusGeometry(.58, .026, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xe6ded0, transparent: true, opacity: .78 }),
  );
  guideRing.rotation.x = Math.PI / 2;
  guideRing.position.y = -.7;
  guide.add(guideRing);
  const guideMarker = new THREE.Mesh(
    new THREE.OctahedronGeometry(.16),
    new THREE.MeshBasicMaterial({ color: 0xe6ded0 }),
  );
  guideMarker.position.y = .5;
  guide.add(guideMarker);
  anchors.add(guide);
  scene.add(anchors);

  // Low-cost lantern geometry gives a true near/far depth cue.
  const lanterns = [
    [-7.4, 3.1, -4.4], [-5.9, 4.4, -5.3], [-2.7, 3.85, -5.0],
    [2.9, 4.1, -5.1], [5.5, 3.3, -4.6], [7.5, 4.6, -5.6],
  ].map(([x, y, z], index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(.15, .12, .28, 6),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffc882 : 0xf0daaa }),
    );
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .035, 6), brass);
    top.position.y = .16;
    group.add(body, top);
    group.position.set(x, y, z);
    scene.add(group);
    return { group, baseY: y, phase: index * 1.9 };
  });

  let active = false;
  let paused = false;
  let showAnchors = true;
  let inViewport = true;
  let destroyed = false;
  let frameId = 0;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let contextLost = false;
  const pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const render = (time = 0) => {
    frameId = 0;
    if (destroyed || !active || !inViewport || document.hidden || contextLost) return;
    const motion = !paused && !reducedMotion.matches;
    if (motion) {
      currentX += (pointerX - currentX) * .045;
      currentY += (pointerY - currentY) * .045;
      lanterns.forEach(({ group, baseY, phase }) => {
        group.position.y = baseY + Math.sin(time * .00028 + phase) * .16;
        group.rotation.y = Math.sin(time * .00017 + phase) * .10;
      });
    } else {
      currentX = currentY = 0;
      lanterns.forEach(({ group, baseY }) => { group.position.y = baseY; group.rotation.y = 0; });
    }
    const narrow = host.clientWidth / Math.max(1, host.clientHeight) < 1;
    camera.position.set(currentX * .36, (narrow ? 5.6 : 4.35) - currentY * .16, narrow ? 23 : 15.7);
    camera.lookAt(currentX * .18, .57 - currentY * .11, 0);
    renderer.render(scene, camera);
    if (motion) frameId = requestAnimationFrame(render);
  };
  const update = () => {
    if (!frameId && active && inViewport && !document.hidden && !destroyed && !contextLost) {
      frameId = requestAnimationFrame(render);
    }
  };
  const resize = () => {
    if (destroyed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const narrow = width / height < 1;
    camera.fov = narrow ? 47 : 39;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    update();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointerFine || !active || reducedMotion.matches) return;
    const bounds = host.getBoundingClientRect();
    pointerX = THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width - .5) * 2, -1, 1);
    pointerY = THREE.MathUtils.clamp(((event.clientY - bounds.top) / bounds.height - .5) * 2, -1, 1);
    update();
  };
  const onPointerLeave = () => { pointerX = 0; pointerY = 0; update(); };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frameId);
    frameId = 0;
  };
  const onContextRestored = () => { contextLost = false; update(); };
  const onVisibility = () => update();
  const onMotion = () => update();
  const observer = new IntersectionObserver((entries) => {
    inViewport = entries[0]?.isIntersecting ?? false;
    if (!inViewport) { cancelAnimationFrame(frameId); frameId = 0; }
    else update();
  }, { threshold: .02 });
  observer.observe(host);
  const resizer = new ResizeObserver(resize);
  resizer.observe(host);
  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotion);
  resize();

  return {
    setActive(value) {
      active = value;
      if (!active) { cancelAnimationFrame(frameId); frameId = 0; }
      else update();
    },
    setPaused(value) { paused = value; update(); },
    setAnchors(value) { showAnchors = value; anchors.visible = showAnchors; update(); },
    dispose() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      resizer.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onMotion);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
