/** One bounded rAF owner. Frozen/hidden scenes do not run an animation clock. */
export function createStageLoop({requestFrame,cancelFrame,active,step,draw,controlsUpdate=()=>false,fps=30}){
 let frame=0,visible=true,disposed=false,dirty=true,ticking=false,lastDraw=null,lastStep=null;
 const schedule=()=>{if(!frame&&visible&&!disposed&&!ticking)frame=requestFrame(tick);};
 function tick(now){
  frame=0;if(!visible||disposed)return;
  if(lastDraw!==null&&now-lastDraw<1000/fps-.2){schedule();return;}
  ticking=true;const animating=active(),dt=animating&&lastStep!==null?Math.max(0,Math.min(.05,(now-lastStep)/1000)):0;lastStep=animating?now:null;
  const moving=controlsUpdate();if(animating)step(dt);
  if(dirty||moving||animating){draw();lastDraw=now;}dirty=false;ticking=false;
  if(animating||moving)schedule();
 }
 return {
  invalidate(){dirty=true;schedule();},
  policyChanged(){lastStep=null;dirty=true;schedule();},
  setVisible(value){visible=!!value;lastStep=null;lastDraw=null;if(!visible&&frame){cancelFrame(frame);frame=0;}else if(visible){dirty=true;schedule();}},
  dispose(){disposed=true;visible=false;if(frame)cancelFrame(frame);frame=0;},
 };
}
