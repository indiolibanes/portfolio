/**
 * Reusable presentation/lab boundary; no character rig, renderer, or facial policy.
 *
 * Access is a property of the URL, never of a visible control:
 *   (none)        presentation only; the lab switch and every lab panel stay hidden and unreachable.
 *   ?lab=1        the lab can be opened.
 *   ?lab=interno  the lab, plus the internal diagnostics (visual render checks, per-bone posing).
 * Markup that the controller binds to is never removed, only hidden, so no control lookup can fail.
 */
export const LAB_ACCESS = Object.freeze({ none: 'none', lab: 'lab', internal: 'internal' });

/** Reads the access level from a query string such as `location.search`. Anything unrecognised is `none`. */
export function resolveLabAccess(search = '') {
  let value = null;
  try { value = new URLSearchParams(String(search ?? '').replace(/^\?/, '')).get('lab'); } catch { value = null; }
  const flag = String(value ?? '').trim().toLowerCase();
  return flag === 'interno' ? LAB_ACCESS.internal : flag === '1' ? LAB_ACCESS.lab : LAB_ACCESS.none;
}

export function createPresentationMode({root,panel,presentationButton,labButton,onChange=()=>{},access=LAB_ACCESS.none}) {
  const level=Object.values(LAB_ACCESS).includes(access)?access:LAB_ACCESS.none;
  const each=(selector)=>root.querySelectorAll?.(selector)??[];
  let mode='presentation';
  root.dataset.access=level;
  // Applied once: access does not change while the page is open.
  for(const element of each('[data-hsin-lab-gate]'))element.hidden=level===LAB_ACCESS.none;
  for(const element of each('[data-hsin-internal-only]'))element.hidden=level!==LAB_ACCESS.internal;
  if(level===LAB_ACCESS.none)labButton.hidden=true;
  const set=(next)=>{
    if(!['presentation','lab'].includes(next))return false;
    if(next==='lab'&&level===LAB_ACCESS.none)return false;
    mode=next;root.dataset.experience=mode;panel.hidden=mode!=='lab';
    for(const element of each('[data-hsin-lab-only]'))element.hidden=mode!=='lab';
    for(const element of each('[data-hsin-load-only]'))element.hidden=mode==='presentation'&&root.dataset.loaded==='true';
    presentationButton.setAttribute('aria-pressed',String(mode==='presentation'));
    labButton.setAttribute('aria-pressed',String(mode==='lab'));
    onChange(mode);return true;
  };
  set(mode);return {set,get:()=>mode,access:()=>level,setLoaded(value){root.dataset.loaded=String(!!value);for(const element of each('[data-hsin-load-only]'))element.hidden=mode==='presentation'&&!!value;}};
}
