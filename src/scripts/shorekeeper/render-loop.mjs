/** The lab's single RAF owner. Lifecycle gates cancel pending work instead of polling offscreen. */
export function createRenderLoop({request,cancel,eligible,tick}){
 let pending=null,disposed=false,callbacks=0;
 function wake(){if(disposed||pending!==null||!eligible())return;pending=request(frame);}
 function sleep(){if(pending!==null){cancel(pending);pending=null;}}
 function reconcile(){if(!eligible())sleep();else wake();}
 function frame(now){
  pending=null;
  if(disposed||!eligible())return;
  callbacks++;
  const continuous=tick(now)!==false;
  // tick() may invalidate a scene and schedule its next frame before returning.
  // Never cancel that new request merely because this frame itself is static.
  // Lifecycle changes still take precedence: cancel any request if ineligible.
  if(disposed||!eligible()){sleep();return;}
  if(continuous)wake();
 }
 return {wake,sleep,reconcile,dispose(){if(disposed)return;disposed=true;sleep();},get state(){return {pending:pending!==null,callbacks,disposed};}};
}
