/** Shorekeeper effect authoring presets. NOT active until independent WebGL QA. */
export const SK_VFX_PRESETS=Object.freeze({
 butterflies:Object.freeze({assets:['/assets/shorekeeper-vfx/butterfly-ice.svg','/assets/shorekeeper-vfx/butterfly-violet.svg'],mobileCount:8,desktopCount:18,wingbeatHz:[1.0,2.1],moveSpeed:[.08,.2],drawCallBudget:2,mode:'NOT_IMPLEMENTED'}),
 stellarealm:Object.freeze({starSprite:'/assets/shorekeeper-vfx/star-sprite.svg',mobileStars:110,desktopStars:320,ringSegments:64,drawCallBudget:5,activation:'MANUAL_QA',mode:'NOT_IMPLEMENTED'}),
 collapsedCore:Object.freeze({mobileParticles:12,desktopParticles:40,drawCallBudget:2,mode:'NOT_IMPLEMENTED'})
});