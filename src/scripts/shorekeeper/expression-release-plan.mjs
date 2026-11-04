/** Review proposal, not active aliases or an automatic scheduler. Approval remains outside the runtime. */
export const EXPRESSION_RELEASE_PLAN=Object.freeze({active:false,humanApproval:null,geometry:'r5',proposals:[
 {id:'LITTLE_SMILE',label:'Sorrisinho',aliases:['LITTLE_SMILE_V2','LITTLE_SMILE_R2_CANDIDATE','LITTLE_SMILE_R3_CANDIDATE']},
 {id:'MY_STAR',label:'Minha estrela',aliases:['MY_STAR_V2','MY_STAR_R2_CANDIDATE','MY_STAR_R3_CANDIDATE','MY_STAR_R3_EYES_SOFT'],eyeChoice:'PENDING'},
 {id:'TENDERNESS',label:'Ternura',aliases:['LOVE'],requiresSemanticReview:true},
 {id:'SERENITY',label:'Serenidade',aliases:['HOPE'],requiresSemanticReview:true},
 ...['HELLO','SURPRISE_SOFT','WORRIED','GLANCE'].map(id=>({id,aliases:[],requiresSemanticReview:true})),
]});
