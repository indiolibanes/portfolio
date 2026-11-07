/** Random non-repeating quiet acting: no scripted group rotation. */
export function createNonRepeatingChoice(count,{random=Math.random}={}){
 if(!Number.isInteger(count)||count<1)throw Error('Choice count must be positive');
 let previous=-1;
 return {
  next(){
   const value=random();
   if(!Number.isFinite(value)||value<0||value>=1)throw Error('Random source must be in [0,1)');
   const n=previous<0||count===1?count:count-1;
   const draw=Math.floor(value*n);
   const index=previous<0||count===1?draw:draw>=previous?draw+1:draw;
   previous=index;
   return index;
  },
  get last(){return previous;}
 };
}
export function quietFaceWait(random=Math.random){
 const draw=random();
 if(!Number.isFinite(draw)||draw<0||draw>=1)throw Error('Invalid face interval random source');
 return 5+draw*9;
}
