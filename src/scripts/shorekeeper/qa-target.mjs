/** Laboratory-only, timestamped spatial target. No HP, physics, timers or canonical enemy. */
export const QA_TARGET_LABEL='QA_TARGET · SIMULATED · NO_DAMAGE';
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export function createQATargetTrack({position,radius=.2}={}){
 if(!finite(position)||!(radius>0&&Number.isFinite(radius)))throw TypeError('QA_TARGET geometry');
 let revision=0,selected=true,events=[{t:0,position:[...position],radius,enabled:true,motion:false}];
 const origin=[...position];
 const state=(event,t)=>({...event,position:event.position.map((v,i)=>v+(event.motion&&i===0?radius*1.2*Math.sin((t-event.t)*.65):0))});
 return {
  at(t){if(!Number.isFinite(t)||t<0)throw TypeError('QA_TARGET time');let e=events[0];for(const x of events){if(x.t>t)break;e=x;}return {...state(e,t),label:QA_TARGET_LABEL,selected};},
  record(t,patch){if(!Number.isFinite(t)||t<events.at(-1).t||events.length>=128)throw RangeError('QA_TARGET edits must be chronological (max 128)');
   if(Object.keys(patch).some(k=>!['position','enabled','motion'].includes(k)))throw TypeError('QA_TARGET edit');
   const next={...state(events.at(-1),t),...patch,t};if(!finite(next.position)||typeof next.enabled!=='boolean'||typeof next.motion!=='boolean')throw TypeError('QA_TARGET state');
   next.position=[...next.position];if(t===events.at(-1).t)events[events.length-1]=next;else events.push(next);revision++;},
  get origin(){return [...origin];},
  select(v){selected=!!v;},get selected(){return selected;},get revision(){return revision;},
  get events(){return events.map(e=>({...e,position:[...e.position]}));}
 };
}
export const mix3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
const add=(a,b,k=1)=>a.map((x,i)=>x+b[i]*k),sub=(a,b)=>a.map((x,i)=>x-b[i]);
export function cubicPoint(c,t){const u=Math.max(0,Math.min(1,(t-c.from)/(c.to-c.from))),v=1-u;return c.p.map((x,i)=>v*v*v*x+3*v*v*u*c.a[i]+3*v*u*u*c.b[i]+u*u*u*c.q[i]);}
export function cubicVelocity(c,t){const u=Math.max(0,Math.min(1,(t-c.from)/(c.to-c.from))),v=1-u;return c.p.map((x,i)=>3*(v*v*(c.a[i]-x)+2*v*u*(c.b[i]-c.a[i])+u*u*(c.q[i]-c.b[i]))/(c.to-c.from));}
/** Bounded target-history planner. Retarget edits splice at old position/velocity; removal dissipates there. */
export function planTargetFlight({target,origin,index,start,duration,h,rangeH=3}){
 const end=start+duration,events=target.events,atStart=target.at(start),valid=s=>s.enabled&&Math.hypot(...sub(s.position,origin))<=rangeH*h;
 if(!valid(atStart))return {status:'NO_VALID_QA_TARGET',segments:[],start,end,cancelAt:start,origin};
 const goal=(event,t)=>{const center=[...event.position];if(event.motion)center[0]+=event.radius*1.2*Math.sin((t-event.t)*.65);
  const dir=sub(origin,center),l=Math.hypot(...dir)||1,offset=(index-2)*.15;
  // Distinct points on the near hemisphere, all exactly on the target sphere.
  const n=dir.map(x=>x/l);n[1]+=offset;const nl=Math.hypot(...n);return add(center,n,event.radius/nl);};
 let e=events[0];for(const x of events){if(x.t>start)break;e=x;}
 const q=goal(e,end),d=sub(q,origin),side=(index-2)*.11*h;
 let c={from:start,to:end,p:[...origin],a:add(add(origin,d,.25),[side,.18*h,0]),b:add(add(origin,d,.74),[-side,.12*h,0]),q};
 const segments=[c];let cancelAt=null;
 for(const x of events){if(x.t<=start||x.t>=end)continue;
  const p=cubicPoint(c,x.t),v=cubicVelocity(c,x.t);
  if(!valid(x)){cancelAt=x.t;break;}
  const goalNext=goal(x,end),left=end-x.t;
  const next={from:x.t,to:end,p,a:add(p,v,left/3),b:add(goalNext,sub(p,goalNext),.15),q:goalNext};
  // Cubic derivative is a convex combination of its three control-edge velocities.
  // Refuse an impossible late chase; dissipate in place instead of accelerating/teleporting.
  const edges=[sub(next.a,next.p),sub(next.b,next.a),sub(next.q,next.b)];
  if(edges.some(edge=>3*Math.hypot(...edge)/left>4*h)){cancelAt=x.t;break;}
  c=next;segments.push(c);
 }
 return {status:'QA_TARGET_ACQUIRED',segments,start,end,cancelAt,origin};
}
export function sampleTargetFlight(plan,t){
 if(!plan.segments.length||t<plan.start)return null;
 const at=plan.cancelAt!==null?Math.min(t,plan.cancelAt):Math.min(t,plan.end);let c=plan.segments[0];for(const s of plan.segments)if(s.from<=at)c=s;
 const cancel=plan.cancelAt!==null,age=cancel?t-plan.cancelAt:t-plan.end;
 return {position:cubicPoint(c,at),velocity:cubicVelocity(c,at),alpha:cancel?Math.max(0,1-Math.max(0,age)/.25):Math.max(0,Math.min(1,(t-plan.start)/.08)*(1-Math.max(0,age)/.3)),impact:!cancel&&t>=plan.end&&t<plan.end+.3,phase:cancel&&t>=plan.cancelAt?'CANCEL_DISSIPATE':t<plan.end?'FLIGHT':'CONTACT'};
}
