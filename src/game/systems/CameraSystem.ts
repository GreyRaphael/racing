import * as THREE from 'three';
import { damp } from '../constants';
import { Kart } from '../kart/Kart';

export class CameraSystem {
  private readonly desiredPosition = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.camera.position.set(0, 8, 12);
  }

  update(delta: number, kart: Kart): void {
    const forward = kart.getForward();
    this.desiredPosition.copy(kart.position).addScaledVector(forward, -10).add(new THREE.Vector3(0, 6.2, 0));
    this.camera.position.x = damp(this.camera.position.x, this.desiredPosition.x, 5.5, delta);
    this.camera.position.y = damp(this.camera.position.y, this.desiredPosition.y, 5.5, delta);
    this.camera.position.z = damp(this.camera.position.z, this.desiredPosition.z, 5.5, delta);
    this.lookTarget.copy(kart.position).addScaledVector(forward, 9).add(new THREE.Vector3(0, 1.25, 0));
    this.camera.lookAt(this.lookTarget);
    const targetFov = 59 + Math.min(13, Math.abs(kart.speed) * 0.48);
    this.camera.fov = damp(this.camera.fov, targetFov, 4, delta);
    this.camera.updateProjectionMatrix();
  }
}
