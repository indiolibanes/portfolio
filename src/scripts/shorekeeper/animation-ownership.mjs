/** One live body writer per model. A stale disposer cannot release a newer owner's lease. */
const owners=new WeakMap();
export function claimBodyOwner(root,label){
 if(owners.has(root))throw Error('Body animation already owned by '+owners.get(root).label);
 const token={label};owners.set(root,token);let released=false;
 return ()=>{if(!released&&owners.get(root)===token)owners.delete(root);released=true;};
}
export function bodyOwner(root){return owners.get(root)?.label??null;}
