import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {choosePavilionAnchor,createPavilionMotion} from '../src/scripts/hsin-pavilion-layout.mjs';
import {towerViewport} from '../src/scripts/hsin-music-tower.mjs';
const source=await readFile('src/scripts/hsin-music-tower.mjs','utf8'),component=await readFile('src/components/HsinSoundtrack.astro','utf8'),style=await readFile('src/styles/hsin-soundtrack.css','utf8');
assert.doesNotMatch(source,/wheel|spoke|Wheel/i,'no wheel assembly remains');assert.match(source,/hydrogenL/);assert.match(component,/Dança experimental: disponível com reprodução confirmada pelo YouTube/);assert.doesNotMatch(await readFile('public/_headers','utf8'),/unsafe-eval/);
assert.match(style,/max-height:calc\(100dvh - 24px\)/,'short viewport options scroll instead of moving/replacing the iframe');
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const viewports=[];
for(const [width,height]of [[320,740],[393,852],[844,390],[1280,720],[1920,1080]]){
 const compact=towerViewport(width,height,280,360).compact;
 if(compact){viewports.push({width,height,mode:'reserved native-player bay'});continue;}
 const face={x:width*.46,y:height*.2,w:width*.08,h:height*.15},hands=[{x:width*.36,y:height*.46,w:width*.08,h:height*.12},{x:width*.57,y:height*.44,w:width*.08,h:height*.12}],input={width,height,panelWidth:280,panelHeight:360,preferred:'right',face,hands};
 const selected=choosePavilionAnchor(input),box={x:selected.x-140,y:selected.y-180,w:280,h:360};assert.equal(overlap(box,face),0);assert.ok(hands.every(h=>overlap(box,h)===0));assert.ok(box.x>=0&&box.x+box.w<=width&&box.y>=0&&box.y+box.h<=height);viewports.push({width,height,mode:'projected world facade',selected});
}
const base={width:1600,height:1000,panelWidth:260,panelHeight:260,preferred:'right',face:{x:725,y:140,w:150,h:130},hands:[{x:700,y:350,w:200,h:100}]},m=createPavilionMotion();m.retarget(base);const start={...m.sample()};
m.retarget({...base,preferred:'left'},{now:1});let previous={...m.sample()},maxVelocity=0;
for(let i=0;i<300;i++){const v=m.advance(1/30);assert.ok(Math.hypot(v.x-previous.x,v.y-previous.y)<19,'bounded velocity prevents teleport');maxVelocity=Math.max(maxVelocity,Math.abs(v.vx),Math.abs(v.vy));const box={x:v.x-130,y:v.y-130,w:260,h:260};assert.equal(overlap(box,base.face),0,'crossing uses the lower safe corridor, not the face');previous={...v};}
assert.ok(m.sample().x<start.x-500);assert.ok(Math.abs(m.sample().vx)<.5);
m.setInteracting(true);const locked={...m.sample()};for(let i=0;i<60;i++)m.advance(1/30);assert.equal(m.sample().x,locked.x);assert.equal(m.sample().y,locked.y);m.setInteracting(false);
// Small alternating camera/projection changes cannot cause repeated automatic side switches.
let changes=0,last=m.sample().side;for(let i=0;i<600;i++){m.retarget({...base,preferred:'left',moon:{x:150+Math.sin(i)*2,y:60,w:140,h:140}},{now:10+i/30});m.advance(1/30);if(last!==m.sample().side)changes++;last=m.sample().side;}assert.equal(changes,0);
m.retarget({...base,preferred:'right'},{now:40,reduced:true});const still={...m.sample()};for(let i=0;i<60;i++)m.advance(1/30,true);assert.equal(m.sample().x,still.x);assert.equal(m.sample().tilt,0);
// A transient obstruction must not leave a stale hysteresis clock or bypass cooldown on return.
const h=createPavilionMotion(),blocked={...base,face:{x:1350,y:300,w:100,h:350},hands:[]};h.retarget(base,{now:0});h.retarget(blocked,{now:1});h.retarget(base,{now:2});h.retarget(blocked,{now:2.1});assert.equal(h.sample().side,'right');h.retarget(blocked,{now:3});assert.equal(h.sample().side,'left');h.retarget(base,{now:3.1});assert.equal(h.sample().side,'left');h.retarget(base,{now:5.1});assert.equal(h.sample().side,'right');
// A deliberate side button is the one interaction that authorizes movement while it retains focus.
const manual=createPavilionMotion();manual.retarget(base);manual.retarget({...base,preferred:'left'},{now:1,interacting:true});manual.setInteracting(true);assert.ok(manual.advance(1/30).moving);
const benchmark=createPavilionMotion();let t=performance.now();for(let i=0;i<10000;i++)benchmark.retarget(base,{now:i/30});const policyMs=(performance.now()-t)/10000;t=performance.now();for(let i=0;i<100000;i++)benchmark.advance(1/30);const dampingMs=(performance.now()-t)/100000;
const report={viewports,maxVelocity,policyMs,dampingMs,baseline:{meshes:5,triangles:4804},r2:{meshes:7,triangles:4132},newTextures:0,newLights:0,newRenderTargets:0,limitation:'Node policy/math/geometry tests, not GPU/browser iframe or artistic QA. In impossible frames automatic side crossing is deferred and constrained layout is reported.'};
console.log('Hydrogen pavilion R2 PASS',JSON.stringify(report));if(process.env.HSIN_DANCE_REPORT)await writeFile('docs/hsin-pavilion-r2-qa.json',JSON.stringify(report,null,2)+'\n');
