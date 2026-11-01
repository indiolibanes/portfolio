export const ATMOSPHERES=Object.freeze({
 gold:{stops:['#241412','#614945','#4d313e'],light:'rgba(221,187,153,0.30)'},
 scarlet:{stops:['#241412','#992329','#4d313e'],light:'rgba(220,96,68,0.30)'},
});
/** Original procedural color only; no asset, external requests or character material edits. */
export function createAtmosphereTexture(THREE,document,variant='gold'){
 const palette=ATMOSPHERES[variant]??ATMOSPHERES.gold,canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const linear=ctx.createLinearGradient(0,0,0,512);palette.stops.forEach((color,i)=>linear.addColorStop(i/2,color));ctx.fillStyle=linear;ctx.fillRect(0,0,512,512);
 const glow=ctx.createRadialGradient(256,190,0,256,190,310);glow.addColorStop(0,palette.light);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,512,512);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
