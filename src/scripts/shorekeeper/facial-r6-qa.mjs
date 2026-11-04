import {R6_CANDIDATES,R6_REGIONS} from './anatomical-face.mjs';
const BASELINES=['LITTLE_SMILE_V2','MY_STAR_V2','MY_STAR_R3_EYES_SOFT','HELLO_R2_CANDIDATE','LITTLE_SMILE_R2_CANDIDATE','LITTLE_SMILE_R3_CANDIDATE','MY_STAR_R2_CANDIDATE','MY_STAR_R3_CANDIDATE','HELLO','LOVE','HOPE','SURPRISE_SOFT','WORRIED','GLANCE'];
/** Manual controls only; all facial writes go through the single director. */
export function mountFacialR6Qa(host,{face,allowed,geometry,setGeometry,camera,captureCamera,restoreCamera,exportReport,invalidate}) {
  const abort=new AbortController(),on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
  host.hidden=false;host.open=true;
  host.innerHTML=`<summary>R6 · atuação anatômica · candidatos</summary>
<p>O perfil de geometria da aprovação humana ainda precisa ser confirmado. Receitas preservadas; nenhum candidato promovido.</p>
<label>Baseline preservado<select data-r6-baseline></select></label>
<label>Candidato R6<select data-r6-candidate></select></label>
<label>Geometria explícita<select data-r6-geometry><option value="canonical">Canônica</option><option value="r2">Solda R2</option><option value="r3">R3</option><option value="r4">R4</option><option value="r5">R5</option></select></label>
<label>Intensidade<select data-r6-intensity><option>0</option><option>0.25</option><option>0.5</option><option>0.75</option><option selected>1</option></select></label>
<div class="sk-actions"><button type="button" data-r6-play="baseline">Reproduzir baseline</button><button type="button" data-r6-play="candidate">Reproduzir candidato</button><button type="button" data-r6-blink>Piscar</button><button type="button" data-r6-neutral>Retornar ao neutro</button></div>
<fieldset data-r6-regions><legend>Regiões do candidato · baseline sempre integral</legend></fieldset>
<label>Timeline do candidato · segundos<input data-r6-seek type="range" min="0" max="7" step="0.01" value="0"/></label>
<label><input data-r6-freeze type="checkbox"/> Congelar a atuação facial</label>
<div class="sk-actions"><button type="button" data-r6-camera="0">Frontal</button><button type="button" data-r6-camera="45">Três quartos</button><button type="button" data-r6-camera="90">Perfil</button><button type="button" data-r6-restore>Restaurar sessão QA</button><button type="button" data-r6-export>Exportar relatório sem assets</button></div>
<details><summary>Atlas morfológico · Face/Eye</summary><button type="button" data-r6-atlas>Carregar inventário</button><label>Canal<select data-r6-morph><option value="">Selecione o canal</option></select></label><button type="button" data-r6-probe>Aplicar prova isolada</button><p data-r6-anatomy></p><p>Íris limitada a 0,3 no runtime. Down/Alpha excluídos. O atlas privado contém também as provas diagnósticas até 1.</p></details>
<p data-r6-status role="status">Manual · VISUAL_QA_PENDING · R7 desativado. Baselines V2 retêm seu hold de inspeção; use Retornar ao neutro.</p>`;
  const $=s=>host.querySelector(s),state=$('[data-r6-status]');
  for(const id of BASELINES)$('[data-r6-baseline]').add(new Option(id,id));
  for(const [id,c] of Object.entries(R6_CANDIDATES))$('[data-r6-candidate]').add(new Option(c.label,id));
  for(const region of R6_REGIONS){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;label.append(input,document.createTextNode(region));$('[data-r6-regions]').append(label);on(input,'change',()=>{if(allowed()){face.setRegion(region,input.checked);invalidate();}});}
  const originalGeometry=geometry(),originalCamera=captureCamera();$('[data-r6-geometry]').value=originalGeometry;
  const act=fn=>{if(!allowed()){state.textContent='Controle indisponível durante carregamento, pausa ou combate.';return;}try{fn();invalidate();state.textContent='R6_ACTING_CANDIDATE · VISUAL_QA_PENDING · '+face.report().id;}catch(e){state.textContent=e.message;}};
  for(const b of host.querySelectorAll('[data-r6-play]'))on(b,'click',()=>act(()=>{face.setIntensity(Number($('[data-r6-intensity]').value));face[b.dataset.r6Play==='baseline'?'playBaseline':'playCandidate']($(b.dataset.r6Play==='baseline'?'[data-r6-baseline]':'[data-r6-candidate]').value);$('[data-r6-freeze]').checked=false;}));
  on($('[data-r6-geometry]'),'change',()=>act(()=>setGeometry($('[data-r6-geometry]').value)));
  on($('[data-r6-blink]'),'click',()=>act(()=>face.trigger('blink')));
  on($('[data-r6-neutral]'),'click',()=>act(()=>{face.setFrozen(false);$('[data-r6-freeze]').checked=false;face.triggerQA('NEUTRAL');}));
  on($('[data-r6-seek]'),'input',()=>act(()=>{face.setFrozen(true);$('[data-r6-freeze]').checked=true;if(!face.seek(Number($('[data-r6-seek]').value)))state.textContent='Timeline disponível no candidato; baseline mantém os tempos originais.';}));
  on($('[data-r6-freeze]'),'change',()=>act(()=>face.setFrozen($('[data-r6-freeze]').checked)));
  for(const b of host.querySelectorAll('[data-r6-camera]'))on(b,'click',()=>act(()=>camera(Number(b.dataset.r6Camera))));
  on($('[data-r6-restore]'),'click',()=>act(()=>{face.restore();for(const input of $('[data-r6-regions]').querySelectorAll('input'))input.checked=true;for(const r of R6_REGIONS)face.setRegion(r,true);setGeometry(originalGeometry);restoreCamera(originalCamera);face.setIntensity(1);$('[data-r6-intensity]').value='1';$('[data-r6-baseline]').selectedIndex=0;$('[data-r6-candidate]').selectedIndex=0;$('[data-r6-geometry]').value=originalGeometry;$('[data-r6-freeze]').checked=false;$('[data-r6-seek]').value='0';}));
  on($('[data-r6-export]'),'click',()=>act(()=>exportReport(face.report())));
  let morphs=[];
  on($('[data-r6-atlas]'),'click',async()=>{
    const {default:atlas}=await import('../../../docs/characters/shorekeeper-r6-morph-atlas.json');if(abort.signal.aborted)return;
    morphs=atlas.morphs.filter(m=>['Shorekeeper_Face','Shorekeeper_Eye'].includes(m.meshName));
    $('[data-r6-morph]').replaceChildren(...morphs.map(m=>new Option(`${m.meshName} · ${m.index} · ${m.name}`,m.name)));describe();
  });
  function describe(){const m=morphs.find(m=>m.name===$('[data-r6-morph]').value);$('[data-r6-anatomy]').textContent=m?JSON.stringify({name:m.name,index:m.index,affectedVertices:m.affectedVertices,status:m.status,observations:m.visualObservation??m.anatomicalHypothesis??null}):'';}
  on($('[data-r6-morph]'),'change',describe);
  on($('[data-r6-probe]'),'click',()=>act(()=>face.probe($('[data-r6-morph]').value,Number($('[data-r6-intensity]').value))));
  return ()=>{abort.abort();host.replaceChildren();host.hidden=true;};
}
