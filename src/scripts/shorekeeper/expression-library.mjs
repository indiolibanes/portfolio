/** Authored acting candidates inspired by references, never extracted animation data. */
const preset=(label,description,weights,enter,hold,exit,required,automatic=0)=>Object.freeze({label,description,weights:Object.freeze(weights),enter,hold,exit,required:Object.freeze(required),automatic});
export const EXPRESSION_LIBRARY=Object.freeze({
 MY_STAR:preset('My Star','Carinho terno · sorriso doce e olhos suaves.',{M_Smile_L:.62,M_Smile_R:.68,E_Smile_L:.28,E_Smile_R:.32,B_Happy:.22,E_Focus:.08,Pupil_R:.08},.8,2.3,1.1,['M_Smile_L','M_Smile_R'],26),
 LOVE:preset('Amor','Afeto sereno · um sorriso demorado e olhar acolhedor.',{M_Smile_L:.54,M_Smile_R:.58,E_Smile_L:.38,E_Smile_R:.40,B_Happy:.18,B_Sad:.06,Pupil_Up:.06},1.2,2.8,1.4,['M_Smile_L','M_Smile_R'],0),
 LITTLE_SMILE:preset('Sorrisinho','A assinatura discreta · breve e levemente assimétrica.',{M_Smile_L:.32,M_Smile_R:.40,E_Smile_L:.12,E_Smile_R:.17,B_Happy:.07},.65,1.6,.9,['M_Smile_L','M_Smile_R'],30),
 PERFECT_GLANCE:preset('Olhadinha','Olhar lateral primeiro; o sorriso chega um instante depois.',{Pupil_L:.24,Pupil_Up:.035,E_Focus:.13,M_Smile_L:.22,M_Smile_R:.27,E_Smile_L:.08,E_Smile_R:.10},.7,1.8,1.0,['Pupil_L'],24),
 WORRIED:preset('Preocupada','Apreensão gentil · sobrancelhas e olhar contidos.',{B_Sad:.28,E_Sad:.20,E_Focus:.06,M_Ennui_L:.06,M_Ennui_R:.06,Pupil_Down:.06},.9,1.7,1.1,['B_Sad','E_Sad'],4),
 HOPE:preset('Esperança','Contemplação lenta · olhos suaves e um pequeno sorriso.',{B_Happy:.08,B_Sad:.12,E_Smile_L:.13,E_Smile_R:.15,M_Smile_L:.28,M_Smile_R:.32,Pupil_Up:.12},1.4,2.6,1.5,['M_Smile_L','M_Smile_R'],4),
 SURPRISE_SOFT:preset('Surpresa suave','Atenção súbita · abertura discreta dos olhos e lábios.',{E_Stare:.22,E_Focus:.08,B_Up_Add:.16,M_OpenSmall:.16,Pupil_Up:.05},.35,1.0,.85,['E_Stare','M_OpenSmall'],8),
 HELLO:preset('Olá','Reconhecimento acolhedor · olhar seguido de um sorriso.',{Pupil_R:.14,E_Focus:.10,M_Smile_L:.34,M_Smile_R:.40,E_Smile_L:.12,E_Smile_R:.16,B_Happy:.12},.85,1.8,1.0,['M_Smile_L','M_Smile_R'],4),
 MEME_OPTIONAL:preset('Modo meme','Brincadeira estilizada; o rig não reproduz as bochechas do desenho.',{E_Close:.34,B_Flat:.28,M_Ennui_L:.18,M_Ennui_R:.18,Pupil_Down:.08},.5,1.3,.8,['E_Close','B_Flat'],0),
 RETURN_TO_BASE:preset('Retorno','Recuperação suave ao repouso facial.',{},.8,0,.8,[],0)
});
export const EXPRESSION_IDS=Object.freeze(Object.keys(EXPRESSION_LIBRARY));
export const EXPRESSION_MORPHS=Object.freeze([...new Set(['E_Close',...Object.values(EXPRESSION_LIBRARY).flatMap(p=>Object.keys(p.weights)), 'Pupil_R','Pupil_L','Pupil_Up','Pupil_Down'])]);
export const EXPRESSION_ALIASES=Object.freeze({neutral:'RETURN_TO_BASE',smile:'LITTLE_SMILE',myStar:'MY_STAR',look:'PERFECT_GLANCE',wonder:'SURPRISE_SOFT'});
export function expressionId(name){return EXPRESSION_ALIASES[name]??name;}
export function expressionSupport(names,id){const p=EXPRESSION_LIBRARY[expressionId(id)];if(!p)throw Error('Expressão desconhecida');const set=new Set(names);return {available:p.required.every(n=>set.has(n)),missing:p.required.filter(n=>!set.has(n)),optionalMissing:Object.keys(p.weights).filter(n=>!set.has(n)&&!p.required.includes(n))};}
/** Real click bindings, shared by the studio and synthetic interaction tests. */
export function bindExpressionButtons(buttons,{face,allowed,onTrigger=()=>{},signal}){
 for(const button of buttons)button.addEventListener('click',()=>{if(button.disabled||!allowed())return;const id=button.dataset.expression,controller=face();if(controller&&controller.trigger(id)!==false)onTrigger(id);},{signal});
}
