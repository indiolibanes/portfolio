/** Render-only gate for original-source comparison. Never changes VFX state,
 * shaders, meshes, camera or scene ownership. R4/R5 intentionally draw their
 * environment in OFF, so OFF is not sufficient for an isolated source capture.
 */
const visibilityBeforeQa=new WeakMap();

export function setSourceReviewVfxIsolation(vfx,isolated) {
 if(!vfx||vfx.disposed)return false;
 if(isolated){
  if(!visibilityBeforeQa.has(vfx))visibilityBeforeQa.set(vfx,{
   environmentVisible:vfx.environment?.root?.visible??null,
  });
  vfx.root.visible=false;
  if(vfx.environment?.root)vfx.environment.root.visible=false;
  return true;
 }
 const saved=visibilityBeforeQa.get(vfx);
 if(!saved)return false;
 visibilityBeforeQa.delete(vfx);
 if(saved.environmentVisible!==null&&vfx.environment?.root)vfx.environment.root.visible=saved.environmentVisible;
 // Re-evaluate the authored VFX pose: unlike the source QA gate, normal OFF
 // may deliberately display the R4/R5 environment.
 vfx.renderPose();
 return true;
}
