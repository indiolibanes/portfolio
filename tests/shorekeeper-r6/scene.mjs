/** Private model harness. No automatic scheduler; every command is explicit. */
import '../shorekeeper-r5/scene.mjs';
import {MOUTH_QA_RECIPES} from '../../src/scripts/shorekeeper/mouth-qa-probes.mjs';
import {createAnatomicalFaceDirector,R6_CANDIDATES} from '../../src/scripts/shorekeeper/anatomical-face.mjs';
window.QA.registerProfiles({facialFactory:createAnatomicalFaceDirector});
window.QA.extend(({getFace,getInspection,stopBody})=>({
 r6Start({id,baseline=false,intensity=1}){const face=getFace();face.setPaused(false);face.reset();face.setIntensity(intensity);return baseline?face.playBaseline(id):face.playCandidate(id);},
 r6Step({dt,blink=false,neutral=false}){const f=getFace();if(blink)f.trigger('blink');if(neutral)f.triggerQA('NEUTRAL');f.advance(dt);},
 r6Seek(time){return getFace().seek(time);},r6Reset(){getFace().restore();stopBody();},
 r6Report(){return getFace().report();},r6Candidates(){return R6_CANDIDATES;},
 r6Probe({name,weight}){return getFace().probe(name,weight);},
 r6Weights(){return (getInspection().morphMeshes??[]).filter(m=>['Shorekeeper_Face','Shorekeeper_Eye'].includes(m.name)).flatMap(m=>m.morphTargetInfluences);},
 r6Peak({id,weight}){getFace().reset();getFace().setIntensity(weight);if(weight){getFace().playBaseline(id);getFace().advance(MOUTH_QA_RECIPES[id].timing.attack);}return getFace().report();},
}));
