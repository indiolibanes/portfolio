/** Reusable presentation/lab boundary; no character rig, renderer, or facial policy. */
export function createPresentationMode({root,panel,presentationButton,labButton,onChange=()=>{}}) {
  let mode='presentation';
  const set=(next)=>{
    if(!['presentation','lab'].includes(next))return false;
    mode=next;root.dataset.experience=mode;panel.hidden=mode!=='lab';
    for(const element of root.querySelectorAll?.('[data-hsin-lab-only]')??[])element.hidden=mode!=='lab';
    for(const element of root.querySelectorAll?.('[data-hsin-load-only]')??[])element.hidden=mode==='presentation'&&root.dataset.loaded==='true';
    presentationButton.setAttribute('aria-pressed',String(mode==='presentation'));
    labButton.setAttribute('aria-pressed',String(mode==='lab'));
    onChange(mode);return true;
  };
  set(mode);return {set,get:()=>mode,setLoaded(value){root.dataset.loaded=String(!!value);for(const element of root.querySelectorAll?.('[data-hsin-load-only]')??[])element.hidden=mode==='presentation'&&!!value;}};
}
