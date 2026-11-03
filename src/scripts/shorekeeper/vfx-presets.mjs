/** Shorekeeper effect authoring presets. Manual preview only; artistic and Android QA remain pending. */
export const SK_VFX_PRESETS=Object.freeze({
 butterflies:Object.freeze({assets:['/assets/shorekeeper-vfx/butterfly-ice.svg','/assets/shorekeeper-vfx/butterfly-violet.svg'],mobileCount:8,desktopCount:18,wingbeatHz:[1.0,2.1],moveSpeed:[.08,.2],drawCallBudget:2,mode:'MANUAL_PREVIEW_VISUAL_QA_PENDING'}),
 stellarealm:Object.freeze({starSprite:'/assets/shorekeeper-vfx/star-sprite.svg',mobileStars:110,desktopStars:320,ringSegments:64,drawCallBudget:5,activation:'MANUAL_QA',mode:'MANUAL_PREVIEW_VISUAL_QA_PENDING'}),
 collapsedCore:Object.freeze({mobileParticles:12,desktopParticles:40,drawCallBudget:2,mode:'MANUAL_PREVIEW_VISUAL_QA_PENDING'})
});