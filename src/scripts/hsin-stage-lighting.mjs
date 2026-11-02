/** Stage light rig. One definition shared by the public stage and the QA harness so a visual
 * comparison always uses the same lights the visitor sees. Values are unchanged from V2.0.1. */
export const HSIN_STAGE_LIGHTS = Object.freeze({
 ambient: Object.freeze({color: 0xb7c9e3, intensity: .95}),
 key: Object.freeze({color: 0xf0dec0, intensity: 1.8, position: Object.freeze([-2, 4, 5])}),
 rim: Object.freeze({color: 0xeac27a, intensity: 1.15, position: Object.freeze([-2, 4, -5])}),
});

/** Ambient + key + rim, in the order the stage has always added them. No shadows, no extra lights. */
export function createStageLights(T, rig = HSIN_STAGE_LIGHTS) {
 const ambient = new T.AmbientLight(rig.ambient.color, rig.ambient.intensity);
 const key = new T.DirectionalLight(rig.key.color, rig.key.intensity); key.position.set(...rig.key.position);
 const rim = new T.DirectionalLight(rig.rim.color, rig.rim.intensity); rim.position.set(...rig.rim.position);
 return {ambient, key, rim, all: [ambient, key, rim]};
}
