/** F3 candidate: hand flare -> radial propagation -> Outer reveal, NOT Discernment.
 * Reference montage cuts are verified; clip correspondence and proportional timing remain pending.
 * No compression/implosion or automatic field-ending explosion is asserted by this score.
 */
import {FIDELITY_REFERENCE} from './fidelity-camera.mjs';
import {FACE_FS} from './combat-vfx-shaders.mjs';
const sat=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=sat(x);return x*x*(3-2*x);};
export const F3_RELEASE_EVIDENCE=Object.freeze({
 status:'PRESENTATION_PARTIAL',motion:'CANONICAL_PENDING',event:'END_LOOP_FORMATION_CANDIDATE',
 referenceSha256:'25c032963d023243c16f6137353778da84127f9d68eb417e57ba8f831f9406e9',
 mapping:'PROPORTIONAL_CANDIDATE_NOT_GAME_TIMECODE',compression:'NOT_OBSERVED_NOT_IMPLEMENTED',
 discernment:'SEPARATE_ACTION_NOT_AUTOMATICALLY_TRIGGERED',flashMaximumSeconds:.10
});
export function fidelityReleaseScore(t,schedule,reduced=false){
 if(!Number.isFinite(t))throw TypeError('F3 release: finite absolute time required');
 const seg=schedule?.segments?.find(s=>s.id==='SK_BURST_02_ORIGINAL');
 const none={active:false,phase:'NONE',age:null,core:0,flash:0,wave:0,radius:0,progress:0,fragments:0,fieldResponse:0,evidence:F3_RELEASE_EVIDENCE};
 if(!seg)return none;
 const onset=seg.start+(seg.end-seg.start)*FIDELITY_REFERENCE.cutsS[0]/FIDELITY_REFERENCE.durationS;
 const age=t-onset;
 if(age<0||age>=.9)return {...none,age,onset};
 const progress=sat(age/.9),wave=smooth(age/.035)*(1-smooth((age-.25)/.55));
 return {active:true,onset,age,progress,phase:age<.10?'RUPTURE':age<.52?'PROPAGATION':'OUTER_RESIDUE',
  core:(reduced?.28:1)*Math.exp(-age/.11)*(1-smooth(age/.38)),
  flash:reduced||age>=.10?0:Math.exp(-age/.028)*(1-smooth(age/.10)),
  wave:wave*(reduced?.22:.95),radius:reduced?.82:.02+.98*(1-Math.exp(-age/.18)),
  fragments:reduced?0:Math.sin(Math.PI*progress)*(1-smooth((age-.55)/.35)),
  fieldResponse:wave*(reduced?.12:.6),evidence:F3_RELEASE_EVIDENCE};
}
/** Reuses the old large-butterfly quad. No wing SDF, texture, noise octave loop or postprocess. */
export const F3_RUPTURE_FS=`
${FACE_FS}
uniform vec3 uBlue,uHotC; uniform float uA,uBurn,uFlash;
varying vec2 vP;
void main(){
 float r=length(vP); if(r>1.)discard;
 float a=atan(vP.y,vP.x),p=clamp(uBurn,0.,1.);
 float delta=(r-(.08+.84*p))/.027;
 float front=exp(-delta*delta)*(1.-p);
 float rays=pow(max(0.,sin(a*13.+sin(a*7.)*.7)),18.)*exp(-r*2.8)*smoothstep(.035,.13,r)*(1.-p);
 float core=exp(-r*r*100.)*(.35+uFlash*1.2);
 vec3 col=(uBlue*(front*.9+rays*.6)+uHotC*core)*uA;
 col*=(1.-smoothstep(.83,1.,r))*faceMask(vP);
 if(max(col.r,max(col.g,col.b))<.004)discard;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
