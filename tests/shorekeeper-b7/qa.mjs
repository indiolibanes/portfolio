import {createLocalLoader,disposeObject} from '../../src/scripts/shorekeeper/local-model.mjs';
import {createInspection} from '../../src/scripts/shorekeeper/inspection.mjs';
import {createStage} from '../../src/scripts/shorekeeper/stage.mjs';
import {candidates,progressive} from './candidates.mjs';
const $=s=>document.querySelector(s),loader=createLocalLoader();let stage,model=null,inspection=null,serial=0;
try{stage=createStage($('#viewport'),{lost(){ $('#status').textContent='WebGL perdido; aguarde restauração.';},restored(){stage.resize();}});}catch(e){$('#status').textContent=e.message;$('#file').disabled=true;}
for(const id of Object.keys(candidates))$('#candidate').add(new Option(id,id));
function components(){const w=candidates[$('#candidate').value];$('#component').replaceChildren(new Option('Combinação completa','all'));for(const name of Object.keys(w))$('#component').add(new Option('Isolado · '+name,'i:'+name));for(let i=1;i<=Object.keys(w).length;i++)$('#component').add(new Option('Progressivo · primeiros '+i,'p:'+i));apply();}
function apply(){if(!inspection)return;const w=candidates[$('#candidate').value],v=Number($('#amount').value),mode=$('#component').value,config=mode==='all'?progressive(w,Object.keys(w).length,v):mode.startsWith('i:')?{[mode.slice(2)]:w[mode.slice(2)]*v}:progressive(w,Number(mode.slice(2)),v);inspection.preset(config);$('#status').textContent=JSON.stringify({versao:'QA PRIVADO · NAO APROVADO',modelo:model.userData.version,camera:stage.cameraConfig(),pesos:config,ausentes:Object.keys(config).filter(n=>!inspection.names.includes(n))},null,2);}
$('#file').addEventListener('change',async e=>{const token=++serial;try{const result=await loader.load(e.target.files?.[0]);if(!result||token!==serial){if(result)disposeObject(result.gltf.scene);return;}if(model){stage.detach(model);disposeObject(model,inspection.extraMaterials);}model=result.gltf.scene;model.userData.version=result.sha256;inspection=createInspection(model);stage.adopt(model);components();}catch(err){$('#status').textContent=err.message;}finally{e.target.value='';}});
for(const id of ['candidate','component','amount'])$('#'+id).addEventListener('change',id==='candidate'?components:apply);
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{stage?.view(button.dataset.view);apply();});
$('#save').addEventListener('click',async()=>{if(!model||!stage)return;const blob=await stage.capture(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shorekeeper-private-qa.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
let frame;function draw(){frame=requestAnimationFrame(draw);if(stage&&!document.hidden)stage.draw();}draw();addEventListener('pagehide',()=>{cancelAnimationFrame(frame);loader.cancel();if(model){stage.detach(model);disposeObject(model,inspection.extraMaterials);}stage?.dispose();},{once:true});
components();
