/** Code-authored scenery textures; no remote imagery, generated once/offline. */
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=new URL('../public/assets/scenes/hsin/',import.meta.url);
await mkdir(dir,{recursive:true});
let seed=1701;
const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const stars=Array.from({length:115},()=>{
 const x=(random()*512).toFixed(2),y=(random()*315).toFixed(2),r=(.25+random()*.6).toFixed(2),a=(.12+random()*.5).toFixed(2);
 return `<circle cx="${x}" cy="${y}" r="${r}" fill="#e6ddcc" opacity="${a}"/>`;
}).join('');
const sky=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#080f25"/><stop offset=".48" stop-color="#172944"/><stop offset=".72" stop-color="#354a61"/><stop offset="1" stop-color="#111e33"/></linearGradient><radialGradient id="haze"><stop stop-color="#adc2d1" stop-opacity=".12"/><stop offset="1" stop-color="#7c99b2" stop-opacity="0"/></radialGradient></defs><path fill="url(#sky)" d="M0 0h512v512H0z"/><ellipse cx="252" cy="300" rx="260" ry="210" fill="url(#haze)"/>${stars}</svg>`;
const craters=Array.from({length:40},()=>{
 const angle=random()*Math.PI*2,r=Math.sqrt(random())*127,x=256+Math.cos(angle)*r,y=256+Math.sin(angle)*r,size=1+random()**2*11;
 return `<circle cx="${x}" cy="${y}" r="${size}" fill="#887f75" opacity=".09"/><path d="M${x-size*.8} ${y}a${size} ${size} 0 0 1 ${size*1.45} ${-size*.8}" fill="none" stroke="#fff6d9" stroke-opacity=".24" stroke-width=".8"/>`;
}).join('');
const moon=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs>
 <radialGradient id="halo"><stop stop-color="#e7dab4" stop-opacity=".3"/><stop offset=".52" stop-color="#b5c3d1" stop-opacity=".12"/><stop offset="1" stop-color="#879eb6" stop-opacity="0"/></radialGradient>
 <radialGradient id="disc" cx=".37" cy=".3" r=".78"><stop stop-color="#fff4d5"/><stop offset=".65" stop-color="#e4d4ac"/><stop offset=".95" stop-color="#b9bba9"/><stop offset="1" stop-color="#8a9eaa"/></radialGradient>
 <filter id="terrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".027" numOctaves="4" seed="18"/><feColorMatrix type="saturate" values="0"/></filter>
 <clipPath id="discClip"><circle cx="256" cy="256" r="146"/></clipPath><filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
 </defs><circle cx="256" cy="256" r="251" fill="url(#halo)"/>
 <circle cx="256" cy="256" r="146" fill="url(#disc)"/>
 <g clip-path="url(#discClip)"><g fill="#656f76" opacity=".24" filter="url(#soft)"><path d="M175 192q34-41 67-6t-15 64q-50 22-55-14t3-44M264 162q56-28 72 21t-28 48q-20-5-20-25t-24-44M226 280q33-32 67-7t21 53q-29 34-52 4t-36-50M315 235q35-35 54 0t-20 52q-40-2-34-52"/></g><path d="M100 100h312v312H100z" filter="url(#terrain)" opacity=".2"/>${craters}</g><circle cx="256" cy="256" r="145.5" fill="none" stroke="#fff3cf" stroke-opacity=".3"/>
 </svg>`;
for(const [name,svg]of [['night-sky-v1',sky],['full-moon-v1',moon]]){
 const file=fileURLToPath(new URL(name+'.webp',dir));await sharp(Buffer.from(svg)).webp({quality:88,alphaQuality:90}).toFile(file);
 console.log(name,await sharp(file).metadata().then(m=>({width:m.width,height:m.height})));
}
