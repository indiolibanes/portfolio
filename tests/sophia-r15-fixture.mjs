// API-level CPU fixture. No shader execution, image decoding or visual approval.
export function fakeGL() {
  let id=0,vao=null;const binding=new Map(),uniforms=new Map(),buffers=new Map(),calls=[],deleted=new Set();
  const constants={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,FLOAT:5126,UNSIGNED_INT:5125,UNSIGNED_SHORT:5123,UNSIGNED_BYTE:5121};
  const api={buffers,calls,deleted,getExtension:()=>null,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_p,n)=>n,
    bindBuffer:(target,b)=>binding.set(target,b),bindVertexArray:v=>{vao=v},
    bufferData:(target,data)=>{const v=typeof data==='number'?new Uint8Array(data):new Uint8Array(data.buffer,data.byteOffset,data.byteLength);buffers.set(binding.get(target),v.slice())},
    bufferSubData:(target,offset,data)=>{buffers.get(binding.get(target)).set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength),offset)},
    uniform4fv:(n,v)=>uniforms.set(n,Array.from(v)),uniform1i:(n,v)=>uniforms.set(n,v),
    drawElements:()=>calls.push({vao,morph:uniforms.get('uMorph')?.slice(),blend:uniforms.get('uBlend'),base:uniforms.get('uBase')?.slice()}),
  };
  for(const n of ['Buffer','Texture','VertexArray','Shader','Program']){api['create'+n]=()=>({id:++id,kind:n});api['delete'+n]=x=>deleted.add(x)}
  return new Proxy(api,{get(o,k){if(k in o)return o[k];if(k in constants)return constants[k];if(typeof k==='string'&&k===k.toUpperCase())return constants[k]=10000+Object.keys(constants).length;return()=>{}}});
}
export function browserFixture(elements) {
  const ios=[],mos=[],rafs=new Map(),gl=fakeGL();let rafId=0,glCanvases=0;
  class Canvas extends EventTarget{constructor(){super();this.dataset={};this.width=300;this.height=150;this.ctx={draws:0,clearRect(){},drawImage(){this.draws++}}}setAttribute(){}getContext(type){if(type==='2d')return this.ctx;if(!this.isGL){glCanvases++;this.isGL=true}return gl}remove(){this.parentNode?.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;this.isConnected=false}}
  class Observer{constructor(cb){this.cb=cb;this.items=new Set();ios.push(this)}observe(el){this.items.add(el)}unobserve(el){this.items.delete(el)}disconnect(){this.items.clear()}trigger(on){this.cb([...this.items].map(target=>({target,isIntersecting:on})))}}
  class Mutation{constructor(cb){this.cb=cb;mos.push(this)}observe(_r,opts){this.opts=opts}disconnect(){this.disconnected=true}}
  const root={dataset:{}},document=new EventTarget();Object.assign(document,{hidden:false,readyState:'complete',documentElement:root,querySelectorAll:()=>elements,createElement:()=>new Canvas()});
  const media=new EventTarget();media.matches=false;const connection=new EventTarget();connection.saveData=false;
  const window=new EventTarget();Object.assign(window,{devicePixelRatio:2,matchMedia:()=>media});
  Object.assign(globalThis,{window,document,IntersectionObserver:Observer,MutationObserver:Mutation,requestAnimationFrame:cb=>{rafs.set(++rafId,cb);return rafId},cancelAnimationFrame:id=>rafs.delete(id),createImageBitmap:async()=>({width:2,height:2,close(){}})});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{connection,deviceMemory:8}});
  const pump=now=>{const list=[...rafs.values()];rafs.clear();for(const cb of list)cb(now)};
  return{gl,window,document,root,media,connection,ios,mos,rafs,pump,get glCanvases(){return glCanvases}};
}
export class ActorElement extends EventTarget{
 constructor(kind,clip){super();this.dataset={sophiaActor:kind,sophiaClip:clip};this.children=[];this.isConnected=true;this.motion={dataset:{motionPlaying:'true'}}}
 appendChild(c){c.parentNode=this;c.isConnected=true;this.children.push(c)}closest(){return this.motion}getBoundingClientRect(){return{width:160,height:200}}querySelectorAll(){return this.children.filter(c=>c.dataset.sophiaActorCanvas!==undefined)}
}
export const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))};
