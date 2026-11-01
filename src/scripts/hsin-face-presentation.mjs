import { createExpressionDirector } from './hsin-face-pass-b.mjs';
/** Presentation policy. Character-independent timing; adapter supplies measured morph limits/axes. */
export const PRESENTATION_ATTENTION = Object.freeze({
  acquire:[.075,.12], hold:[2.6,4.1], avert:[.26,.42], returning:[.65,.95],
  cooldown:[.35,.8], retainOnLeave:.65, reacquire:true,
  // Eye contact that stays with the viewer: glances return to them, small drifts are followed with lag.
  glanceReturnsToTarget:true, glanceBack:[.16,.30], reacquireDistance:.07, reacquireDwell:.32,
  pursuit:1.1, calmHoldScale:1.9, longHoldChance:.28, longHoldScale:1.8,
});
export function createPresentationExpression({seed,limits={}}={}) {
  const beats=createExpressionDirector({seed,limits});let time=0;
  return {
    signal:beats.signal,testMorph:beats.testMorph,testBeat:beats.testBeat,isLab:beats.isLab,
    step(dt,options={}) {
      time+=dt;const state=beats.step(dt,options);
      if(state.isolated||!options.enabled)return state;
      const level=options.intensity??.75;
      // A sustained low overlay, always composed over the captured approved face.
      // Breath is slow; beats add contrast without raising the geometry-derived caps.
      const breath=.5+.5*Math.sin(time*.29),amount=level*(.72+.15*breath);
      const cap=(name,value)=>(limits[name]??0)*value;
      const mouth=cap('M_Smile_R',amount);
      const overlays={...state.overlays};
      for(const [name,weight] of Object.entries({B_Up_Add_R:amount*.58,B_Up_Add_L:amount*.06,
        E_Smile_R:amount*.26,E_Smile_L:amount*.12,E_Squint_R:amount*.12,E_Squint_L:amount*.06}))
        overlays[name]=Math.max(overlays[name]??0,cap(name,weight));
      return {...state,smileR:Math.max(state.smileR,mouth),smileL:Math.max(state.smileL,mouth*.16),overlays};
    },
    diagnostics(){return {...beats.diagnostics(),baseline:'asymmetric-presence',time};},
  };
}
