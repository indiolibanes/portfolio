/** Isolated raw-morph diagnostics only; no actor/frame loop is running here. */
import '../shorekeeper-r5/scene.mjs';
window.QA.extend(({getModel,getFace})=>({atlasProbe({meshName,index,weight}){getFace().setPaused(true);const model=getModel();model.traverse(m=>{if(m.morphTargetInfluences)m.morphTargetInfluences.fill(0);});const mesh=model.getObjectByName(meshName);if(!mesh||index<0||index>=mesh.morphTargetInfluences.length||weight<0||weight>1)throw Error('Invalid diagnostic probe');mesh.morphTargetInfluences[index]=weight;}}));
