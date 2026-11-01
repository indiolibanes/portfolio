/** Reusable presentation/lab boundary; no character rig, renderer, or facial policy. */
export function createPresentationMode({root,panel,presentationButton,labButton,onChange=()=>{}}) {
  let mode='presentation';
  const set=(next)=>{
    if(!['presentation','lab'].includes(next))return false;
    mode=next;root.dataset.experience=mode;panel.hidden=mode!=='lab';
    presentationButton.setAttribute('aria-pressed',String(mode==='presentation'));
    labButton.setAttribute('aria-pressed',String(mode==='lab'));
    onChange(mode);return true;
  };
  set(mode);return {set,get:()=>mode};
}
