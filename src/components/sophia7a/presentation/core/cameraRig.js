import * as THREE from 'three';
import { angleDelta, easeInOutCubic, lerp } from './math.js';

/**
 * Poses de câmera em coordenadas esféricas em torno de um alvo, com transição
 * suave (ease in-out) entre poses. Cancelável pelo usuário (pointerdown/wheel).
 */
export class CameraRig {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this._sph = new THREE.Spherical();
    this._off = new THREE.Vector3();
    this._tween = null;
  }

  getPose() {
    this._off.copy(this.camera.position).sub(this.controls.target);
    this._sph.setFromVector3(this._off);
    return {
      target: this.controls.target.clone(),
      radius: this._sph.radius,
      phi: this._sph.phi,
      theta: this._sph.theta,
    };
  }

  setPose(p) {
    this.controls.target.copy(p.target);
    this._off.setFromSphericalCoords(p.radius, p.phi, p.theta);
    this.camera.position.copy(p.target).add(this._off);
    this.camera.lookAt(p.target);
    this.controls.update();
  }

  /** @param {number} duration segundos; 0 = salto imediato */
  flyTo(p, duration) {
    if (!(duration > 0)) {
      this._tween = null;
      this.setPose(p);
      return;
    }
    this._tween = { from: this.getPose(), to: p, t: 0, duration };
  }

  cancel() { this._tween = null; }

  get active() { return this._tween !== null; }

  /** @returns {boolean} true se moveu a câmera neste passo */
  update(dt) {
    const tw = this._tween;
    if (!tw) return false;
    tw.t = Math.min(1, tw.t + dt / tw.duration);
    const k = easeInOutCubic(tw.t);
    const a = tw.from, b = tw.to;
    this.setPose({
      target: new THREE.Vector3().lerpVectors(a.target, b.target, k),
      radius: Math.exp(lerp(Math.log(a.radius), Math.log(b.radius), k)),
      phi: lerp(a.phi, b.phi, k),
      theta: a.theta + angleDelta(a.theta, b.theta) * k,
    });
    if (tw.t >= 1) this._tween = null;
    return true;
  }
}
