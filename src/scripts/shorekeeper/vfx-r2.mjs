/**
 * Shorekeeper VFX R2 · authorial celestial effects (manual preview, VISUAL_QA_PENDING).
 *
 * Replaces the R1 visual language, not its contract: same manual state names and the same ownership rules
 * (own subtree, no bones/morphs/mixer writes, read-only anchors, one render loop).
 * Everything is procedural: no game textures, shaders or captures are embedded.
 *
 * Systems (level index): 0 butterflies, 1 FIELD_GAMEPLAY, 2 Collapsed Core, 3 CINEMATIC_CANOPY.
 * Reference reading (GIF frames, not 1:1 recreations):
 *  - butterfly.gif 2.2-4.6 s: crystalline shard wings, white-cyan core, long pointed lower shards.
 *  - resonance liberation cutscene 4.2-5.5 s: huge thin luminous rings arching overhead, concentric ellipses.
 *  - resonance liberation ingame 0-2.9 s: thin white rings on the ground, comet arcs, star burst, motes.
 * Outer/Inner/Supernal tints are proposals: STAGE_REFERENCE_UNVERIFIED.
 */
import * as T from 'three';

export const VFX_R2_STATES = Object.freeze(['OFF', 'AMBIENT', 'PREPARATION', 'STELLAREALM', 'RESONANCE_PEAK', 'RECOVERY']);
export const STAGE_TINTS = Object.freeze({outer: [0.29, 0.66, 1.0], inner: [0.6, 0.49, 1.0], supernal: [1.0, 0.82, 0.48]});
export const STAGE_REFERENCE_STATUS = 'STAGE_REFERENCE_UNVERIFIED';
export const VFX_R2_MODES = Object.freeze(['BOTH', 'FIELD_GAMEPLAY', 'CINEMATIC_CANOPY']);
const LEVELS = Object.freeze({OFF: [0, 0, 0, 0], AMBIENT: [0.45, 0.12, 0, 0], PREPARATION: [0.7, 0.35, 0.9, 0], STELLAREALM: [0.85, 0.85, 0.45, 0.6], RESONANCE_PEAK: [1, 1, 1, 1], RECOVERY: [0.35, 0.2, 0, 0.25]});
const TAU = Math.PI * 2;
const WING_ATTRIBUTES=Object.freeze(['iPos','iFwd','iMisc']);
export const CORE_PERIOD = 6;
export const CORE_PHASES = Object.freeze([['SPAWN', 0, 0.22], ['GATHER', 0.22, 0.56], ['HOLD', 0.56, 0.78], ['CONVERT', 0.78, 0.9], ['DISSOLVE', 0.9, 1]]);
const smooth01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function seeded(seed) { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }

export function corePhaseName(p) { for (const [n, a, b] of CORE_PHASES) if (p >= a && p < b) return n; return 'DISSOLVE'; }

/**
 * One wing (the right one; the left is mirrored by the instance side) as RGBA bytes. Pure and deterministic, so it
 * can be tested in Node. Atlas x: 0 = body axis .. 1 = wing tip; y: 0 = tail .. 1 = head; thorax at (0, 0.52).
 * Read from butterfly.gif: a broad crystalline membrane, jagged edge, rib fan, white-cyan core fading to saturated
 * blue, upper wing swept outward and a lower wing split into pointed shards. Not a 1:1 copy of any game asset.
 */
const UPPER = [[90, 0.1], [78, 0.2], [66, 0.42], [52, 0.62], [38, 0.82], [27, 1.0], [19, 0.8], [11, 0.62], [3, 0.36], [-4, 0.2]];
const LOWER = [[-4, 0.2], [-14, 0.4], [-24, 0.52], [-34, 0.86], [-41, 0.52], [-49, 0.42], [-58, 0.62], [-66, 0.4], [-74, 0.5], [-82, 0.36], [-90, 0.1]];
const LOWER_R3=[[-4,.2],[-14,.38],[-24,.52],[-34,.72],[-41,.32],[-49,.42],[-58,.3],[-66,.60],[-74,.26],[-82,.32],[-90,.1]];
function envelope(deg, table, scaleY) {
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, r0] = table[i], [a1, r1] = table[i + 1], lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    if (deg >= lo && deg <= hi) { const t = (deg - a0) / (a1 - a0); return (r0 + (r1 - r0) * t) * scaleY; }
  }
  return 0;
}
function hash(i, j, seed) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2246822519)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, seed) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function renderWingAtlas(size = 256, seed = 7, {crystalline=false,delicate=false}={}) {
  const out = new Uint8Array(size * size * 4), tx = 0.02, ty = 0.52;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = (i + 0.5) / size, y = 1 - (j + 0.5) / size, dx = x - tx, dy = y - ty, R = Math.hypot(dx, dy), deg = Math.atan2(dy, Math.max(dx, 1e-6)) * 180 / Math.PI;
    let r = 0, g = 0, b = 0, a = 0;
    if (dx > -0.004) {
      const base = dy >= 0 ? envelope(deg, UPPER, 0.94) : envelope(deg, crystalline ? LOWER_R3 : LOWER, 0.94);
      const jag = 1 + (delicate?.04:.1) * (vnoise(deg * 0.55, R * 6, seed) - 0.5) * 2 + (delicate?.02:.06) * Math.sin(deg * (delicate?.24:.9) + seed);
      const env = base * jag, inside = env - R;
      if (env > 0 && inside > 0) {
        const t = Math.min(1, R / Math.max(env, 1e-3)), rib = 0.5 + 0.5 * Math.sin(deg * 0.62 + vnoise(R * 5, deg * 0.2, seed + 3) * 3), crack = vnoise(R * 14, deg * 0.5, seed + 9);
        const edge = Math.min(1, inside / 0.02), rim = Math.exp(-Math.pow(inside / 0.012, 2));
        const hole = crack > 0.78 && t > 0.45 ? 0.35 : 1;
        a = Math.min(1, (0.62 + 0.3 * rib * Math.min(1, t * 1.6)) * edge * hole + rim * 0.5);
        const core = Math.exp(-R * 4.2), mid = Math.pow(1 - t, 1.4);
        r = 0.05 + 0.28 * mid + core * 0.9 + rim * 0.3 + rib * 0.07 * Math.min(1, t * 2);
        g = 0.32 + 0.5 * mid + core * 0.8 + rim * 0.35 + rib * 0.08 * Math.min(1, t * 2);
        b = 1;
      }
    }
    const bodyHalf = (delicate?.012:.02) * Math.max(0, 1 - Math.pow((y - 0.52) / (delicate?.18:.24), 2));
    if (x < tx + bodyHalf && Math.abs(y - 0.52) < (delicate?.18:.24)) { a = 1; r = 0.95; g = 1; b = 1; }
    for (const [ax, ay, bx, by] of [[0.02, 0.74, 0.16, 0.97], [0.02, 0.74, 0.06, 0.99]]) {
      const px = x - ax, py = y - ay, ex = bx - ax, ey = by - ay, u = Math.max(0, Math.min(1, (px * ex + py * ey) / (ex * ex + ey * ey))), dd = Math.hypot(px - ex * u, py - ey * u);
      if (dd < (delicate?.004:.006)) { a = Math.max(a, 0.95); r = Math.max(r, 0.7); g = Math.max(g, 0.95); b = 1; }
    }
    const k = (j * size + i) * 4; out[k] = Math.min(1, r) * 255; out[k + 1] = Math.min(1, g) * 255; out[k + 2] = Math.min(1, b) * 255; out[k + 3] = Math.min(1, a) * 255;
  }
  return out;
}

const WING_VS = `
attribute vec3 iPos; attribute vec3 iFwd; attribute vec4 iMisc; // scale, flap, side, bank
varying vec2 vUv; varying float vShade;
void main(){
  vec3 f=normalize(iFwd); vec3 up=vec3(0.,1.,0.);
  vec3 r=cross(f,up); if(length(r)<.02) r=vec3(1.,0.,0.); r=normalize(r); vec3 u=cross(r,f);
  float cb=cos(iMisc.w), sb=sin(iMisc.w); vec3 r2=r*cb+u*sb; vec3 u2=-r*sb+u*cb;
  float fl=iMisc.y; vec3 o=iMisc.z*(r2*cos(fl)+u2*sin(fl));
  vUv=uv; vShade=.7+.3*abs(dot(normalize(cross(o,f)),vec3(0.,0.,1.)));
  vec3 wp=iPos+iMisc.x*(o*(uv.x*1.0)+f*((uv.y-.52)*1.0));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(wp,1.);
}`;
const WING_FS = `
uniform sampler2D atlas; uniform vec3 uTint; uniform float uOpacity;
varying vec2 vUv; varying float vShade;
void main(){
  vec4 t=texture2D(atlas,vec2(vUv.x,1.-vUv.y)); float a=t.a*uOpacity; if(a<.004) discard;
  float lum=dot(t.rgb,vec3(.3,.55,.15)); vec3 tinted=uTint*(lum*1.7+.08)+vec3(max(0.,lum-.62))*1.1; vec3 c=mix(t.rgb,tinted,.8)*vShade*1.12; gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const CORE_VS = `
attribute vec3 aSeed; uniform float uPhase,uTime,uPixelRatio,uSize,uOpacity; uniform vec3 uCenter,uHead;
varying float vA; varying float vH;
void main(){
  float ph=uPhase; float spawn=smoothstep(0.,.22,ph), gather=smoothstep(.22,.56,ph), conv=smoothstep(.78,.9,ph), diss=smoothstep(.9,1.,ph);
  float R=mix(.2+.1*aSeed.z,.012+.02*aSeed.z,gather);
  float sw=aSeed.x+gather*(5.+3.*aSeed.z)+uTime*(.6+aSeed.z);
  float el=aSeed.y*mix(1.,.35,gather); float cr=sqrt(max(0.,1.-el*el));
  vec3 dir=vec3(cos(sw)*cr,el,sin(sw)*cr);
  vec3 p=uCenter+dir*(R+conv*(.12+.28*aSeed.z))+vec3(0.,diss*.25*(.5+aSeed.z),0.);
  vec3 hd=p-uHead; float hl=length(hd); if(hl<.16) p=uHead+hd/max(hl,1e-4)*.16;
  vA=uOpacity*spawn*(1.-diss)*(1.-.65*conv)*(.6+.4*sin(uTime*3.+aSeed.x*9.)); vH=gather*(1.-conv);
  vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp(uSize*uPixelRatio*(.6+.9*aSeed.z)/max(.1,-mv.z),1.,36.);
}`;
const GLOW_FS = `
uniform vec3 uTint; varying float vA; varying float vH;
void main(){ vec2 p=gl_PointCoord-.5; float r=length(p)*2.; float halo=pow(max(0.,1.-r),2.6); float cross=exp(-abs(p.x)*70.)*max(0.,1.-abs(p.y)*2.)+exp(-abs(p.y)*70.)*max(0.,1.-abs(p.x)*2.);
  float a=vA*(halo*.8+cross*.22); if(a<.006) discard; vec3 c=mix(uTint,vec3(1.),.25+.6*vH); gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const FLARE_VS = `
uniform float uPhase,uWorld,uOpacity; uniform vec3 uCenter; varying float vA; varying vec2 vP;
void main(){ float ph=uPhase; float spawn=smoothstep(.1,.5,ph), diss=smoothstep(.9,1.,ph);
  float s=(.2+.55*smoothstep(.3,.78,ph)+.9*smoothstep(.78,.84,ph)*(1.-smoothstep(.84,.97,ph))); vA=uOpacity*spawn*(1.-diss)*(1.-.35*smoothstep(.78,.9,ph)); vP=position.xy;
  vec4 mv=modelViewMatrix*vec4(uCenter,1.); mv.xy+=position.xy*uWorld*s; gl_Position=projectionMatrix*mv; }`;
const FLARE_FS = `
uniform vec3 uTint; varying float vA; varying vec2 vP;
void main(){ vec2 p=vP; float r=length(p)*2.; if(r>1.) discard; float core=exp(-r*r*10.); float halo=pow(max(0.,1.-r),3.); float ray=exp(-abs(p.x)*38.)*max(0.,1.-abs(p.y)*2.)+exp(-abs(p.y)*38.)*max(0.,1.-abs(p.x)*2.);
  float a=vA*(core*.95+halo*.5+ray*.12); if(a<.006) discard; gl_FragColor=vec4(mix(uTint,vec3(1.),.5+.45*core),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const FIELD_VS = `varying vec2 vP; void main(){ vP=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FIELD_FS = `
uniform float uTime,uOpacity,uRadius; uniform vec3 uTint; varying vec2 vP;
float ring(float r,float c,float w){ float d=(r-c)/w; return exp(-d*d); }
void main(){
  float r=length(vP)/uRadius; float ang=atan(vP.y,vP.x); if(r>1.) discard;
  float t=uTime; float a=0.;
  a+=ring(r,1.,.006)*1.0; a+=ring(r,.94,.003)*.5; a+=ring(r,.74,.005)*.85; a+=ring(r,.52,.004)*.7; a+=ring(r,.3,.004)*.9; a+=ring(r,.11,.008)*.8;
  float dash=smoothstep(.45,.55,fract(ang/6.2832*36.+t*.5)); a+=ring(r,.84,.0035)*dash*.8;
  float dash2=smoothstep(.5,.6,fract(ang/6.2832*18.-t*.35)); a+=ring(r,.63,.0035)*dash2*.7;
  float tail=pow(fract(ang/6.2832-t*.18),3.); a+=ring(r,.88+.02*sin(t*.4),.02)*tail*.9;
  float tail2=pow(fract(-ang/6.2832-t*.12+.5),4.); a+=ring(r,.41,.016)*tail2*.8;
  a+=.2*pow(1.-r,1.6)+.16*exp(-r*r*7.);
  float edge=smoothstep(1.,.93,r); a*=edge*uOpacity; if(a<.004) discard;
  gl_FragColor=vec4(mix(uTint*1.15,vec3(1.),.1*smoothstep(.3,1.1,a)),min(1.,a));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const RING_VS = `
attribute vec2 iRing; varying float vR; varying float vAng; varying float vB;
void main(){
  float len=length(position.xz); vec2 d=position.xz/max(len,1e-5); float t=clamp((len-.9)/.1,0.,1.); // 0 inner .. 1 outer edge
  float rad=1.-iRing.y*(1.-t); vR=t; vAng=atan(d.y,d.x); vB=iRing.x;
  vec4 p=instanceMatrix*vec4(d.x*rad,0.,d.y*rad,1.); gl_Position=projectionMatrix*modelViewMatrix*p;
}`;
const RING_FS = `
uniform float uTime,uOpacity; uniform vec3 uTint; varying float vR; varying float vAng; varying float vB;
void main(){ float sp=pow(.5+.5*sin(vAng*5.-uTime*.5+vB*9.),3.); float prof=pow(vR,7.)+.34*pow(vR,2.2);
  float a=uOpacity*vB*prof*(.5+.7*sp); if(a<.004) discard; gl_FragColor=vec4(mix(uTint*1.2,vec3(1.),.12),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const DISC_VS = `varying float vRad; void main(){ vRad=length(position.xz); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const DISC_FS = `
uniform float uOpacity; uniform vec3 uTint; varying float vRad;
void main(){ float r=clamp(vRad,0.,1.); float rim=pow(r,9.)*.55; float haze=.16*pow(r,2.)*(1.-.35*smoothstep(.9,1.,r)); float a=uOpacity*(rim+haze); if(a<.003) discard;
  gl_FragColor=vec4(mix(uTint*.85,mix(uTint,vec3(1.),.5),.35+.5*rim),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function additive(extra = {}) { return {transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false, ...extra}; }

export class ShorekeeperVfxR2Director {
  constructor(scene, {mobile = false, reducedMotion = false, seed = 0x5c311, butterflies, wingSegments=1, now = () => performance.now()} = {}) {
    this.wingSegments=Math.max(1,Math.min(4,Math.floor(wingSegments))); this.scene = scene; this.now = now; this.mobile = mobile; this.reducedMotion = reducedMotion; this.state = 'OFF'; this.mode = 'BOTH'; this.stage = 'outer';
    this._pa=new Float64Array(3);this._pb=new Float64Array(3);this.time = 0; this.suspended = false; this.disposed = false; this.corePhase = 0; this.coreFrozen = false; this.pixelRatio = 1;
    this.levels = new Float64Array(4); this.from = new Float64Array(4); this.target = new Float64Array(4); this.transition = 1; this.transitionSeconds = 1.25;
    this.enabled = {butterflies: true, collapsedCore: true, field: true, canopy: true};
    this.counts = {butterflies: Math.min(mobile ? 8 : 18, Math.max(0, Math.floor(butterflies ?? (mobile ? 8 : 18)))), coreParticles: mobile ? 12 : 40, canopyStars: mobile ? 90 : 250, canopyRings: 10, fieldMotes: mobile ? 20 : 70};
    this.stats = {samples: 0, totalCpuMs: 0, maxCpuMs: 0, clockSeconds: 0}; this.cpuSamples = new Float64Array(2048);
    const rng = seeded(seed); this.root = new T.Group(); this.root.name = 'ShorekeeperVfxR2'; this.root.visible = false; scene.add(this.root);
    this.tint = new T.Vector3(...STAGE_TINTS.outer);
    this.center = new T.Vector3(0, 1, 0); this.scale = 2; this.floorY = -0.5; this.anchor = null; this.anchorL = null; this.headAnchor = null;
    this.corePoint = new T.Vector3(0, 0.15, 0.14); this.hand = new T.Vector3(0.0, 0.05, 0.12); this.head = new T.Vector3(0, 0.4, 0); this.handL = new T.Vector3(); this._tmp = new T.Vector3();
    this._buildButterflies(rng); this._buildCore(rng); this._buildField(rng); this._buildCanopy(rng);
    this.renderPose();
  }
  /* ---------- construction ---------- */
  _buildButterflies(rng) {
    const n = this.counts.butterflies, count = n * 2, plane = new T.PlaneGeometry(1, 1, this.wingSegments, this.wingSegments);
    // uv.x must run 0 (body) -> 1 (tip): shift the plane so x in [0,1].
    const pos = plane.attributes.position; for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + 0.5);
    const g = new T.InstancedBufferGeometry(); g.index = plane.index; g.setAttribute('position', pos); g.setAttribute('uv', plane.attributes.uv); g.instanceCount = count;
    this.bPos = new Float32Array(count * 3); this.bFwd = new Float32Array(count * 3); this.bMisc = new Float32Array(count * 4);
    g.setAttribute('iPos', new T.InstancedBufferAttribute(this.bPos, 3)); g.setAttribute('iFwd', new T.InstancedBufferAttribute(this.bFwd, 3)); g.setAttribute('iMisc', new T.InstancedBufferAttribute(this.bMisc, 4));
    for (const a of WING_ATTRIBUTES) g.getAttribute(a).setUsage(T.DynamicDrawUsage);
    this.atlas = new T.DataTexture(renderWingAtlas(256), 256, 256, T.RGBAFormat); this.atlas.colorSpace = T.SRGBColorSpace; this.atlas.generateMipmaps = true; this.atlas.minFilter = T.LinearMipmapLinearFilter; this.atlas.magFilter = T.LinearFilter; this.atlas.needsUpdate = true;
    this.wingMaterial = new T.ShaderMaterial({...additive({side: T.DoubleSide}), uniforms: {atlas: {value: this.atlas}, uTint: {value: this.tint}, uOpacity: {value: 0}}, vertexShader: WING_VS, fragmentShader: WING_FS});
    this.wings = new T.InstancedMesh(g, this.wingMaterial,count); this.wings.frustumCulled = false; this.wings.renderOrder = 4; this.root.add(this.wings);
    // per-butterfly Lissajous-like orbit in character-height units; independent phases and speeds
    this.flight = new Float32Array(n * 14);
    for (let i = 0; i < n; i++) this.flight.set([(rng() - 0.5) * 0.5, (rng() - 0.5) * 0.4, 0.36 + rng() * 0.5, 0.3 + rng() * 0.35, 0.18 + rng() * 0.3, 0.12 + rng() * 0.18, 0.22 + rng() * 0.2, 0.35 + rng() * 0.3, rng() * TAU, rng() * TAU, 0.075 + rng() * 0.05, 4 + rng() * 2.5, rng() * TAU, rng()], i * 14);
  }
  _buildCore(rng) {
    const n = this.counts.coreParticles, seeds = new Float32Array(n * 3), p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) seeds.set([rng() * TAU, rng() * 2 - 1, rng()], i * 3);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aSeed', new T.BufferAttribute(seeds, 3));
    this.coreUniforms = {uPhase: {value: 0}, uTime: {value: 0}, uPixelRatio: {value: 1}, uSize: {value: 15}, uOpacity: {value: 0}, uCenter: {value: new T.Vector3()}, uHead: {value: new T.Vector3()}, uTint: {value: this.tint}};
    this.coreParticles = new T.Points(g, new T.ShaderMaterial({...additive(), uniforms: this.coreUniforms, vertexShader: CORE_VS, fragmentShader: GLOW_FS})); this.coreParticles.frustumCulled = false; this.coreParticles.renderOrder = 6; this.root.add(this.coreParticles);
    this.flareUniforms = {uPhase: this.coreUniforms.uPhase, uWorld: {value: 0.5}, uOpacity: {value: 0}, uCenter: this.coreUniforms.uCenter, uTint: {value: this.tint}};
    this.coreFlare = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({depthTest: false, side: T.DoubleSide}), uniforms: this.flareUniforms, vertexShader: FLARE_VS, fragmentShader: FLARE_FS})); this.coreFlare.frustumCulled = false; this.coreFlare.renderOrder = 7; this.root.add(this.coreFlare);
  }
  _buildField(rng) {
    const radius = 1.9, g = new T.CircleGeometry(radius, 128); g.rotateX(-Math.PI / 2);
    this.fieldUniforms = {uTime: {value: 0}, uOpacity: {value: 0}, uRadius: {value: radius}, uTint: {value: this.tint}};
    this.field = new T.Mesh(g, new T.ShaderMaterial({...additive({side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}), uniforms: this.fieldUniforms, vertexShader: FIELD_VS, fragmentShader: FIELD_FS}));
    this.field.renderOrder = 1; this.field.frustumCulled = false; this.root.add(this.field);
    const n = this.counts.fieldMotes, mp = new Float32Array(n * 3), ms = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * radius * 0.95; ms.set([a, r, rng()], i * 3); }
    const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp, 3)); mg.setAttribute('aSeed', new T.BufferAttribute(ms, 3)); this.moteSeeds = ms;
    this.moteUniforms = {uPixelRatio: {value: 1}, uOpacity: {value: 0}, uTint: {value: this.tint}};
    this.motes = new T.Points(mg, new T.ShaderMaterial({...additive(), uniforms: this.moteUniforms, vertexShader: 'attribute vec3 aSeed; uniform float uPixelRatio; varying float vA; void main(){ vA=.5+.5*aSeed.z; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(9.*uPixelRatio*(.4+aSeed.z)/max(.1,-mv.z),1.,14.); }', fragmentShader: 'uniform vec3 uTint; uniform float uOpacity; varying float vA; void main(){ vec2 p=gl_PointCoord-.5; float h=pow(max(0.,1.-length(p)*2.),2.2); float a=uOpacity*vA*h; if(a<.005) discard; gl_FragColor=vec4(mix(uTint,vec3(1.),.6),a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
    this.motes.frustumCulled = false; this.motes.renderOrder = 2; this.root.add(this.motes);
  }
  _buildCanopy(rng) {
    // row: [radius, x, z, height, tiltX, tiltZ, spin, brightness, thickness]; in character heights. A halo of near-parallel
    // concentric ellipses (the "dome" of resonance liberation, 4.2-5.5 s) crossed by steeper arcs.
    const rings = [], halo = [13, 11.4, 9.9, 8.5, 7.2, 6.0];
    halo.forEach((r, i) => rings.push([r, 1.2, -2.4, 6.2 - i * 0.15, 0.2 + i * 0.015, 0.05 - i * 0.01, 0.006 * (i % 2 ? -1 : 1), 0.95 - i * 0.07, i === 0 ? 0.05 : 0.014 + 0.002 * i]));
    for (let i = 0; i < 4; i++) rings.push([5 + rng() * 5, (rng() - 0.5) * 6, (rng() - 0.5) * 6 - 1.5, 5.2 + rng() * 2.2, 0.22 + rng() * 0.3, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.03, 0.55 + rng() * 0.3, 0.006 + rng() * 0.006]);
    const rg = new T.RingGeometry(0.9, 1, 256, 1); rg.rotateX(-Math.PI / 2); this.ringBase = rings;
    const ring = new T.InstancedMesh(rg, new T.ShaderMaterial({...additive({side: T.DoubleSide}), uniforms: {uTime: {value: 0}, uOpen: {value: 0}, uOpacity: {value: 0}, uTint: {value: this.tint}}, vertexShader: RING_VS, fragmentShader: RING_FS}), rings.length);
    ring.frustumCulled = false; ring.renderOrder = 3; const iRing = new Float32Array(rings.length * 2); rings.forEach((r, i) => iRing.set([r[7], r[8]], i * 2));
    ring.geometry.setAttribute('iRing', new T.InstancedBufferAttribute(iRing, 2)); this.rings = ring; this.root.add(ring);
    const n = this.counts.canopyStars, sp = new Float32Array(n * 3), sc = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { const az = rng() * TAU, el = (16 + rng() * 58) * Math.PI / 180, r = 16 + rng() * 4; sp.set([Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r], i * 3); const k = rng(); sc.set(k < 0.2 ? [0.85, 0.8, 1] : [0.82, 0.95, 1], i * 3); ph[i] = rng() * TAU; }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); sg.setAttribute('color', new T.BufferAttribute(sc, 3)); sg.setAttribute('phase', new T.BufferAttribute(ph, 1));
    this.starUniforms = {uTime: {value: 0}, uOpacity: {value: 0}, uPixelRatio: {value: 1}};
    this.stars = new T.Points(sg, new T.ShaderMaterial({...additive(), uniforms: this.starUniforms, vertexShader: 'attribute vec3 color; attribute float phase; uniform float uTime,uPixelRatio; varying vec3 vC; varying float vS; void main(){ vC=color; vS=.55+.45*sin(uTime*.9+phase); vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(30.*uPixelRatio*(.7+.5*sin(phase))/max(.1,-mv.z),1.,8.); }', fragmentShader: 'uniform float uOpacity; varying vec3 vC; varying float vS; void main(){ vec2 p=gl_PointCoord-.5; float h=pow(max(0.,1.-length(p)*2.),2.); float a=uOpacity*vS*h; if(a<.005) discard; gl_FragColor=vec4(vC,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
    this.stars.frustumCulled = false; this.stars.renderOrder = 2; this.root.add(this.stars);
    // Luminous body of the largest ring (the "canopy" disc seen from below in the reference): same transform as ring 0.
    this.domeUniforms = {uOpacity: {value: 0}, uTint: {value: this.tint}};
    this.dome = new T.Mesh(new T.CircleGeometry(1, 128).rotateX(-Math.PI / 2), new T.ShaderMaterial({...additive({side: T.DoubleSide}), uniforms: this.domeUniforms, vertexShader: DISC_VS, fragmentShader: DISC_FS}));
    this.dome.frustumCulled = false; this.dome.renderOrder = 0; this.dome.matrixAutoUpdate = false; this.root.add(this.dome);
    this._m = new T.Matrix4(); this._m0 = new T.Matrix4(); this._q = new T.Quaternion(); this._e = new T.Euler(); this._p = new T.Vector3(); this._s = new T.Vector3();
  }
  /* ---------- control ---------- */
  setState(state) { if (this.disposed) return false; if (!VFX_R2_STATES.includes(state)) throw Error('Estado VFX inválido: ' + state); this.state = state; this.from.set(this.levels); this.target.set(LEVELS[state]); this.transition = 0; if (state === 'PREPARATION' && !this.coreFrozen) this.corePhase = 0; return true; }
  /** Manual sequence OFF -> AMBIENT -> PREPARATION -> STELLAREALM -> RESONANCE_PEAK -> RECOVERY -> OFF. */
  next() { const i = VFX_R2_STATES.indexOf(this.state); return this.setState(i === VFX_R2_STATES.length - 1 ? 'OFF' : VFX_R2_STATES[i + 1]); }
  /** 'stellarealm' (the R1 toggle in the lab UI) switches both the gameplay field and the canopy. */
  setEnabled(system, value) { if (system === 'stellarealm') { this.enabled.field = this.enabled.canopy = !!value; this.renderPose(); return; } if (!(system in this.enabled)) throw Error('Sistema VFX inválido'); this.enabled[system] = !!value; this.renderPose(); }
  setMode(mode) { if (!VFX_R2_MODES.includes(mode)) throw Error('Modo VFX inválido'); this.mode = mode; this.renderPose(); }
  setStage(stage) { if (!(stage in STAGE_TINTS)) throw Error('Estágio inválido'); this.stage = stage; this.tint.set(...STAGE_TINTS[stage]); }
  setReducedMotion(v) { this.reducedMotion = !!v; this.renderPose(); }
  setSuspended(v) { this.suspended = !!v; }
  /** QA only (Gate C1): shows a single butterfly at a fixed pose {pos:[x,y,z] in character units, fwd:[x,y,z], flap, bank, scale}; null restores the swarm. flap is the wing dihedral in radians: 0 = wings fully spread (open), ~1.4 = raised together (closed). */
  qaButterfly(pose) { this.qaPose = pose ? {pos: [0, 0, 0], fwd: [0, 0, 1], flap: 0.7, bank: 0, scale: 0.16, ...pose} : null; this.wings.geometry.instanceCount = pose ? 2 : this.counts.butterflies * 2;this.wings.count=this.wings.geometry.instanceCount; this.renderPose(); }
  /** QA only: place the clocks explicitly (single frame, no time advance). */
  seek({time, corePhase} = {}) { if (time !== undefined) this.time = time; if (corePhase !== undefined) { this.corePhase = corePhase; this.coreFrozen = true; } this.renderPose(); }
  releaseSeek() { this.coreFrozen = false; }
  bindModel(model) {
    this.anchor = null; this.anchorL = null; this.headAnchor = null; this.chestAnchor = null;
    if (!model) { this.center.set(0, 1, 0); this.scale = 2; this.floorY = -0.5; }
    else {
      model.updateMatrixWorld(true); const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3());
      this.center.copy(box.getCenter(new T.Vector3())); this.scale = Math.max(0.1, size.y); this.floorY = (box.min.y - this.center.y) / this.scale;
      this.chestAnchor = model.getObjectByName('Bip001Spine2') ?? null; this.anchor = model.getObjectByName('Bip001RHand') ?? null; this.anchorL = model.getObjectByName('Bip001LHand') ?? null; this.headAnchor = model.getObjectByName('Bip001Head') ?? null;
    }
    this.root.position.copy(this.center); this.root.scale.setScalar(this.scale); this.renderPose();
  }
  update(dt, pixelRatio = 1) {
    if (this.disposed || this.suspended || !Number.isFinite(dt) || dt <= 0) return;
    const start = this.now(), step = Math.min(0.1, dt);
    this.transition = Math.min(1, this.transition + step / this.transitionSeconds); const u = smooth01(this.transition);
    for (let i = 0; i < 4; i++) this.levels[i] = this.from[i] + (this.target[i] - this.from[i]) * u;
    if (!this.reducedMotion) { this.time += step; if (!this.coreFrozen && this.levels[2] > 0.02) this.corePhase = (this.corePhase + step / CORE_PERIOD) % 1; }
    this.pixelRatio = pixelRatio; this.renderPose();
    const cpu = Math.max(0, this.now() - start), s = this.stats; this.cpuSamples[s.samples % this.cpuSamples.length] = cpu; s.samples++; s.totalCpuMs += cpu; s.maxCpuMs = Math.max(s.maxCpuMs, cpu); s.clockSeconds += step;
  }
  _pathAt(i, t, out) {
    const f = this.flight, k = i * 14, a = f[k + 8] + t * f[k + 6], b = f[k + 9] + t * f[k + 7];
    out[0] = f[k] + f[k + 2] * Math.cos(a) * 0.62; out[2] = f[k + 1] + f[k + 3] * Math.sin(a + 0.5 * Math.sin(b)) * 0.62; out[1] = f[k + 4] - 0.04 + f[k + 5] * Math.sin(b) + 0.04 * Math.sin(3 * a);
  }
  renderPose() {
    const t = this.reducedMotion ? 0 : this.time, L = this.levels, m = this.mode;
    const b = this.enabled.butterflies ? L[0] : 0, field = this.enabled.field && m !== 'CINEMATIC_CANOPY' ? L[1] : 0, core = this.reducedMotion || !this.enabled.collapsedCore ? 0 : L[2], canopy = this.enabled.canopy && m !== 'FIELD_GAMEPLAY' ? L[3] : 0;
    this.root.visible = b + field + core + canopy > 0.0001;
    if (this.anchor) this.anchor.getWorldPosition(this.hand).sub(this.center).divideScalar(this.scale); else this.hand.set(0.06, 0.12, 0.14);
    if (this.anchorL) { this.anchorL.getWorldPosition(this.handL).sub(this.center).divideScalar(this.scale); this.hand.add(this.handL).multiplyScalar(0.5); }
    if (this.headAnchor) this.headAnchor.getWorldPosition(this.head).sub(this.center).divideScalar(this.scale); else this.head.set(0, 0.4, 0);
    // The idle keeps the hands low, so the core is staged where the gathering reads in the reference (hands condensing light
    // in front of the chest): the hand midpoint is blended up toward chest height. Anchors stay read-only.
    if (this.chestAnchor) { this.chestAnchor.getWorldPosition(this._tmp).sub(this.center).divideScalar(this.scale); this.corePoint.set(this._tmp.x, this._tmp.y + 0.03, this._tmp.z + 0.3); } else this.corePoint.set(this.hand.x * 0.35, this.head.y - 0.13, Math.max(this.hand.z, this.head.z) + 0.14);
    // butterflies: tangent-aligned, asymmetric wingbeat with glide, kept out of the face
    const n = this.counts.butterflies, pa = this._pa, pb = this._pb, f = this.flight;
    this.wings.visible = b > 0.001; this.wingMaterial.uniforms.uOpacity.value = b;
    if (this.qaPose) {
      const q = this.qaPose, fl = Math.hypot(...q.fwd) || 1;
      for (let side = 0; side < 2; side++) { for (let c = 0; c < 3; c++) { this.bPos[side * 3 + c] = q.pos[c]; this.bFwd[side * 3 + c] = q.fwd[c] / fl; } const k=side*4;this.bMisc[k]=q.scale;this.bMisc[k+1]=q.flap;this.bMisc[k+2]=side===0?1:-1;this.bMisc[k+3]=q.bank; }
    }
    for (let i = 0; i < (this.qaPose ? 0 : n); i++) {
      this._pathAt(i, t, pa); this._pathAt(i, t + 0.04, pb);
      let dx = pb[0] - pa[0], dy = pb[1] - pa[1], dz = pb[2] - pa[2]; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
      const hx = pa[0] - this.head.x, hy = pa[1] - this.head.y, hz = pa[2] - this.head.z, hd = Math.hypot(hx, hy, hz); if (hd < 0.4) { const s = 0.4 / Math.max(hd, 1e-4); pa[0] = this.head.x + hx * s; pa[1] = this.head.y + hy * s; pa[2] = this.head.z + hz * s; }
      { // keep out of the body column too (axis through the head anchor), so wings do not cut through the dress
        const bx = pa[0] - this.head.x, bz = pa[2] - this.head.z, bd = Math.hypot(bx, bz);
        if (pa[1] > -0.5 && pa[1] < 0.42 && bd < 0.2) { const s = 0.2 / Math.max(bd, 1e-4), nx = bd < 1e-4 ? 1 : bx * s, nz = bd < 1e-4 ? 0 : bz * s; pa[0] = this.head.x + nx; pa[2] = this.head.z + nz; }
      }
      const k = i * 14, ph = TAU * f[k + 11] * 0.5 * t + f[k + 12], w = Math.sin(ph) + 0.28 * Math.sin(2 * ph - 0.7), glide = 0.55 + 0.45 * Math.sin(t * 0.37 + f[k + 13] * 6.28);
      const flap = this.reducedMotion ? 0.6 : 0.08 + (0.5 - 0.5 * w) * 1.2 * glide + (1 - glide) * 0.45, bank = 0.3 * Math.sin(f[k + 8] + t * f[k + 6]), scale = f[k + 10];
      for (let side = 0; side < 2; side++) {
        const j = i * 2 + side; this.bPos[j * 3] = pa[0]; this.bPos[j * 3 + 1] = pa[1]; this.bPos[j * 3 + 2] = pa[2]; this.bFwd[j * 3] = dx; this.bFwd[j * 3 + 1] = dy; this.bFwd[j * 3 + 2] = dz;
        this.bMisc[j * 4] = scale; this.bMisc[j * 4 + 1] = flap; this.bMisc[j * 4 + 2] = side === 0 ? 1 : -1; this.bMisc[j * 4 + 3] = bank;
      }
    }
    for (const a of WING_ATTRIBUTES) this.wings.geometry.getAttribute(a).needsUpdate = true;
    // collapsed core
    const cu = this.coreUniforms; cu.uPhase.value = this.corePhase; cu.uTime.value = t; cu.uPixelRatio.value = this.pixelRatio; cu.uOpacity.value = core; cu.uCenter.value.copy(this.corePoint); cu.uHead.value.copy(this.head); this.flareUniforms.uOpacity.value = core; this.flareUniforms.uWorld.value = 0.28 * this.scale;
    this.coreParticles.visible = core > 0.001; this.coreFlare.visible = core > 0.001;
    // field (anchored to the stage floor, world space)
    this.field.visible = field > 0.001; this.field.position.y = this.floorY + 0.003; this.fieldUniforms.uTime.value = t; this.fieldUniforms.uOpacity.value = field;
    this.motes.visible = field > 0.001; this.motes.position.y = this.floorY; this.moteUniforms.uOpacity.value = field; this.moteUniforms.uPixelRatio.value = this.pixelRatio;
    const mp = this.motes.geometry.attributes.position.array, ms = this.moteSeeds;
    for (let i = 0; i < this.counts.fieldMotes; i++) { const a = ms[i * 3] + t * 0.05 * (0.5 + ms[i * 3 + 2]), r = ms[i * 3 + 1], u = (t * 0.06 * (0.4 + ms[i * 3 + 2]) + ms[i * 3 + 2] * 7) % 1; mp[i * 3] = Math.cos(a) * r; mp[i * 3 + 1] = 0.01 + u * 0.55; mp[i * 3 + 2] = Math.sin(a) * r; }
    this.motes.geometry.attributes.position.needsUpdate = true;
    // canopy
    const open = smooth01(canopy); this.rings.visible = canopy > 0.001; this.stars.visible = canopy > 0.001; this.dome.visible = canopy > 0.001;
    this.rings.material.uniforms.uTime.value = t; this.rings.material.uniforms.uOpacity.value = canopy;
    // ring row: [radius, x, z, height, tiltX, tiltZ, spin, brightness, width]
    for(let i=0;i<this.ringBase.length;i++){const r=this.ringBase[i]; const grow = 0.35 + 0.65 * open; this._e.set(r[4], t * r[6], r[5]); this._q.setFromEuler(this._e); this._p.set(r[1] * grow, r[3] * (0.55 + 0.45 * open), r[2] * grow); this._s.setScalar(r[0] * grow); this._m.compose(this._p, this._q, this._s); if (i === 0) this._m0.copy(this._m); this.rings.setMatrixAt(i, this._m); }
    this.rings.instanceMatrix.needsUpdate = true;
    this.starUniforms.uTime.value = t; this.starUniforms.uOpacity.value = canopy * 0.9; this.starUniforms.uPixelRatio.value = this.pixelRatio; this.stars.rotation.y = t * 0.004;
    this.domeUniforms.uOpacity.value = canopy; this.dome.matrix.copy(this._m0); this.dome.matrixWorldNeedsUpdate = true;
  }
  report() {
    const s = this.stats, n = Math.min(s.samples, this.cpuSamples.length), sorted = Array.from(this.cpuSamples.subarray(0, n)).sort((a, b) => a - b), meshes = [this.wings, this.coreParticles, this.coreFlare, this.field, this.motes, this.rings, this.stars, this.dome];
    return {state: this.state, mode: this.mode, stage: this.stage, stageReference: STAGE_REFERENCE_STATUS, manualOnly: true, visualQA: 'VISUAL_QA_PENDING', performance: 'PERFORMANCE_VISUAL_QA_PENDING', profile: this.mobile ? 'mobile' : 'desktop', counts: {...this.counts}, reducedMotion: this.reducedMotion, suspended: this.suspended, corePhase: corePhaseName(this.corePhase), seconds: s.clockSeconds, samples: s.samples, cpuMeanMs: s.samples ? s.totalCpuMs / s.samples : null, cpuP95RecentMs: n ? sorted[Math.floor((n - 1) * 0.95)] : null, cpuMaxMs: s.maxCpuMs, estimatedAdditionalDrawCalls: meshes.filter((o) => this.root.visible && o.visible).length, maxAdditionalDrawCalls: meshes.length, gpuTiming: 'NOT_MEASURED'};
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.root.removeFromParent();
    for (const o of [this.wings, this.coreParticles, this.coreFlare, this.field, this.motes, this.rings, this.stars, this.dome]) { o.geometry.dispose(); o.material.dispose(); if (o.isInstancedMesh) o.dispose(); }
    this.atlas.dispose(); this.anchor = null; this.anchorL = null; this.headAnchor = null; this.chestAnchor = null; this.root.clear();
  }
}
