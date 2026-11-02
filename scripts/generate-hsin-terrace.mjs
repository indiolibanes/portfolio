/** Offline, code-authored material/atlas generation. No reference painting is used as a backdrop. */
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=new URL('../public/assets/scenes/hsin/',import.meta.url);await mkdir(dir,{recursive:true});
let seed=20261102;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const stars=Array.from({length:240},()=>`<circle cx="${rand()*1024}" cy="${rand()*340}" r="${.3+rand()*.7}" fill="${rand()>.8?'#eacb8d':'#b7cce2'}" opacity="${.1+rand()*.55}"/>`).join('');
const sky=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#070e23"/><stop offset=".42" stop-color="#182942"/><stop offset=".72" stop-color="#344a62"/><stop offset="1" stop-color="#15283e"/></linearGradient><filter id="cloud"><feTurbulence type="fractalNoise" baseFrequency=".009 .022" numOctaves="3" seed="39"/><feColorMatrix type="matrix" values="0 0 0 0 .46 0 0 0 0 .57 0 0 0 0 .7 0 0 0 .21 -.06"/><feGaussianBlur stdDeviation="1.2"/></filter></defs><path fill="url(#s)" d="M0 0h1024v512H0z"/>${stars}<path filter="url(#cloud)" opacity=".43" d="M0 0h1024v380H0z"/></svg>`;
const craters=Array.from({length:38},()=>{const a=rand()*6.283,r=Math.sqrt(rand())*130,x=256+Math.cos(a)*r,y=256+Math.sin(a)*r,s=1+rand()**2*10;return `<circle cx="${x}" cy="${y}" r="${s}" fill="#866239" opacity=".055"/><circle cx="${x-.7}" cy="${y-.7}" r="${s}" fill="none" stroke="#ffe5a1" opacity=".13" stroke-width=".6"/>`;}).join('');
const moon=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><radialGradient id="halo"><stop stop-color="#edc478" stop-opacity=".32"/><stop offset=".56" stop-color="#e4b262" stop-opacity=".12"/><stop offset="1" stop-color="#b98b51" stop-opacity="0"/></radialGradient><radialGradient id="disc" cx=".35" cy=".3" r=".82"><stop stop-color="#ffe5a8"/><stop offset=".6" stop-color="#e9c57b"/><stop offset="1" stop-color="#b68b4f"/></radialGradient><clipPath id="clip"><circle cx="256" cy="256" r="146"/></clipPath><filter id="soft"><feGaussianBlur stdDeviation="6"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".027" numOctaves="4" seed="18"/><feColorMatrix type="saturate" values="0"/></filter></defs><circle cx="256" cy="256" r="251" fill="url(#halo)"/><circle cx="256" cy="256" r="146" fill="url(#disc)"/><g clip-path="url(#clip)"><g opacity=".2" fill="#79633b" filter="url(#soft)"><path d="M175 192q34-41 67-6t-15 64q-50 22-55-14t3-44M264 162q56-28 72 21t-28 48q-20-5-20-25t-24-44M226 280q33-32 67-7t21 53q-29 34-52 4t-36-50M315 235q35-35 54 0t-20 52q-40-2-34-52"/></g><path d="M100 100h312v312H100z" filter="url(#grain)" opacity=".12"/>${craters}</g><circle cx="256" cy="256" r="145.5" fill="none" stroke="#f8dea2" opacity=".45"/></svg>`;
// Tileable, staggered masonry with unequal block lengths and worn, irregular joints.
const pavers=[];
for(let row=0;row<14;row++){
 const y=row*1024/14,h=1024/14;let x=-190+(row%3)*43;
 while(x<1024){
  const w=86+rand()*105,t=rand(),r=44+Math.round(t*15),g=54+Math.round(t*17),b=67+Math.round(t*19),j=1.5+rand()*1.7;
  const edge=()=>2+rand()*3;
  pavers.push(`<path d="M${x+j} ${y+j+edge()}L${x+w-j} ${y+j}l-1 ${h-2*j-edge()}L${x+j+edge()} ${y+h-j}z" fill="rgb(${r},${g},${b})"/>
   <path d="M${x+7} ${y+6}l${w*.62} -1" stroke="#b8b2a0" stroke-opacity="${.04+rand()*.07}"/>
   <path d="M${x+w-5} ${y+10}l-1 ${h-20}" stroke="#08111e" stroke-opacity=".34"/>`);
  if(rand()>.45)pavers.push(`<path d="M${x+20} ${y+h*.6}l17 -3 11 2 8 -2" fill="none" stroke="#90968f" stroke-opacity=".09" stroke-width=".7"/>`);
  x+=w;
 }
}
const stone=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs>
 <filter id="grain"><feTurbulence baseFrequency=".22 .37" numOctaves="3" seed="14" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
 <filter id="wear"><feTurbulence baseFrequency=".013 .025" numOctaves="2" seed="81" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
 </defs><path fill="#1b2636" d="M0 0h1024v1024H0z"/>${pavers.join('')}
 <path d="M0 0h1024v1024H0z" filter="url(#wear)" opacity=".065"/><path d="M0 0h1024v1024H0z" filter="url(#grain)" opacity=".075"/></svg>`;
const ripples=Array.from({length:180},()=>{const x=rand()*512,y=rand()*256,w=5+rand()*75;return `<path d="M${x} ${y}q${w*.4} -1 ${w} 0" stroke="${rand()>.5?'#657b86':'#0f2637'}" opacity="${.05+rand()*.16}" stroke-width="${.4+rand()*.7}"/>`;}).join('');
const water=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><defs><filter id="n"><feTurbulence baseFrequency=".008 .19" numOctaves="2" seed="731" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><path fill="#718898" d="M0 0h512v256H0z"/><path filter="url(#n)" opacity=".13" d="M0 0h512v256H0z"/>${ripples}</svg>`;
const blossom=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><g fill="#be3f4e" stroke="#e28276" stroke-width="1.1">${Array.from({length:5},(_,i)=>`<ellipse cy="-12" rx="7" ry="12" transform="rotate(${i*72})"/>`).join('')}</g><circle r="4" fill="#e9bc76"/><g stroke="#edc485" stroke-width=".7">${Array.from({length:7},(_,i)=>`<path d="M0 0v-9" transform="rotate(${i*51.43})"/>`).join('')}</g></g>`;
const atlas=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><defs><radialGradient id="lamp"><stop stop-color="#ffe6a4"/><stop offset=".7" stop-color="#e8a14d"/><stop offset="1" stop-color="#a95a32"/></radialGradient><radialGradient id="glow"><stop stop-color="#ffd689" stop-opacity=".58"/><stop offset=".3" stop-color="#f2b758" stop-opacity=".19"/><stop offset="1" stop-color="#d99045" stop-opacity="0"/></radialGradient><radialGradient id="shadow"><stop stop-color="#020714" stop-opacity=".52"/><stop offset=".4" stop-color="#020714" stop-opacity=".23"/><stop offset="1" stop-color="#020714" stop-opacity="0"/></radialGradient></defs>
 <rect x="8" y="5" width="112" height="118" rx="8" fill="url(#lamp)"/><g stroke="#754936" opacity=".6"><path d="M8 30h112M8 98h112M36 5v118M92 5v118" fill="none" stroke-width="3"/><path d="M36 30L64 8l28 22L64 52zM36 98l28-22 28 22-28 22z" fill="none" stroke-width="2"/></g>
 <g fill="#efbd6e" stroke="#6c493b" stroke-width="3"><rect x="145" y="12" width="90" height="108" rx="2"/><path d="M175 12v108M205 12v108M145 48h90M145 84h90"/></g>
 <g fill="none" stroke="#5c3d42" stroke-width="4"><path d="M269 111q33-43 80-84M294 87l-8-42M321 58l37 5"/></g>${blossom(289,54,.7)}${blossom(323,62,.9)}${blossom(346,28,.7)}${blossom(305,86,.55)}
 <g fill="none" stroke="#583b40" stroke-width="4"><path d="M393 113q37-60 99-85"/></g>${blossom(411,83,.8)}${blossom(450,65,.7)}${blossom(481,31,.8)}${blossom(460,93,.5)}
 <circle cx="64" cy="192" r="63" fill="url(#glow)"/><ellipse cx="192" cy="192" rx="37" ry="61" fill="url(#shadow)"/>
 </svg>`;
for(const [name,svg]of [['night-sky-v201',sky],['golden-moon-v201',moon],['stone-v201',stone],['water-v201',water],['terrace-atlas-v201',atlas]]){
 const file=fileURLToPath(new URL(name+'.webp',dir));await sharp(Buffer.from(svg)).webp({quality:87,alphaQuality:100}).toFile(file);console.log(name,await sharp(file).metadata().then(m=>({width:m.width,height:m.height})));
}
