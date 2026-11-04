import * as T from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CelestialEnvironmentR4} from './celestial-environment-r4.mjs';import {patchShader} from './shader-patch.mjs';
/** Same three owned draws: layered atmosphere and lit stone faces instead of flat silhouettes. */
export class CelestialEnvironmentR5 extends CelestialEnvironmentR4 {
 constructor(scene,options={}){
  super(scene,options);
  const sky=this.sky.material,ground=this.ground.material,stone=this.ruins.material;
  // Extend the existing shared arcade, keeping one instanced draw and its authored layout.
  const old=this.ruins.geometry,parts=[old];
  for(const x of [-.55,.55])for(let step=0;step<3;step++){const g=new T.BoxGeometry(.34-step*.065,.065,.36-step*.06);g.translate(x,.0325+step*.065,0);parts.push(g);}
  for(const x of [-.55,.55]){const g=new T.BoxGeometry(.055,.92,.045);g.translate(x,.69,.115);parts.push(g);}
  // Merge only per-vertex attributes: retain the instance damage field separately.
  const damage=old.getAttribute('iDamage');old.deleteAttribute('iDamage');const g=mergeGeometries(parts);g.setAttribute('iDamage',damage);this.ruins.geometry=g;for(const p of parts)p.dispose();

  sky.fragmentShader=patchShader(sky.fragmentShader,'gl_FragColor=vec4(c,1.);',`float w=.035+.015*sin(a*1.3);float ribbon=exp(-pow((p.y-.3-.06*sin(a*2.1+time*.012))/w,2.));float distant=exp(-pow((p.y-.08-.025*sin(a*5.))/.028,2.));float dawn=pow(max(0.,dot(p,normalize(vec3(-.5,.28,-.7)))),12.);c+=ribbon*vec3(.016,.025,.065)+distant*vec3(.009,.025,.040)+dawn*vec3(.035,.065,.095);gl_FragColor=vec4(c,1.);`,'R5 sky layers');
  ground.fragmentShader=patchShader(ground.fragmentShader,'vec3(.006,.015,.024)*ripples','vec3(.003,.006,.010)*ripples','R5 water contrast');
  stone.vertexShader=patchShader(stone.vertexShader,'attribute float iDamage;', 'varying vec3 vStoneNormal;attribute float iDamage;','R5 stone normals declaration');
  stone.vertexShader=patchShader(stone.vertexShader,'vDamage=iDamage;','vStoneNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);vDamage=iDamage;','R5 stone normal transform');
  stone.fragmentShader=patchShader(stone.fragmentShader,'varying float vDamage;', 'varying vec3 vStoneNormal;varying float vDamage;','R5 stone normal varying');
  stone.fragmentShader=patchShader(stone.fragmentShader,'vec3 c=mix(stone,vec3(.02,.065,.12),smoothstep(12.,30.,vDistance));','float key=.48+.52*max(0.,dot(normalize(vStoneNormal),normalize(vec3(.25,.8,.4))));stone=stone*key*1.6+vec3(.008,.015,.025);vec3 c=mix(stone,vec3(.02,.065,.12),smoothstep(12.,30.,vDistance));','R5 stone light and depth');
  sky.needsUpdate=ground.needsUpdate=stone.needsUpdate=true;
 }
}
