/** Fail loudly when the inherited shader contract drifts, instead of silently accepting a no-op. */
export function patchShader(source,needle,replacement,label){const at=source.indexOf(needle);if(at<0||source.indexOf(needle,at+needle.length)>=0)throw Error('Shader patch contract: '+label);return source.slice(0,at)+replacement+source.slice(at+needle.length);}
export function shaderSignature(text){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16).padStart(8,'0');}
