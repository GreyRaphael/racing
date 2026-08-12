import * as THREE from 'three';
import { clamp } from '../constants';
import { Kart } from '../kart/Kart';
import { Track } from '../track/Track';

export interface CollisionResult {
  fenceHit: boolean;
  vehicleHit: boolean;
  grassEntered: boolean;
}

export class CollisionSystem {
  constructor(private readonly track: Track) {}

  resolve(karts: Kart[]): Map<Kart, CollisionResult> {
    const results = new Map<Kart, CollisionResult>();
    for (const kart of karts) {
      const beforeOffRoad = kart.isOffRoad;
      const query = this.track.getNearest(kart.position);
      let fenceHit = false;
      if (this.track.isBeyondFence(query.lateralOffset)) {
        const safeOffset = Math.sign(query.lateralOffset || 1) * (this.track.fenceLimit - 0.15);
        kart.position.copy(query.sample.position).addScaledVector(query.sample.lateral, safeOffset).setY(0.23);
        kart.speed *= -0.18;
        kart.yaw = Math.atan2(query.sample.tangent.x, -query.sample.tangent.z);
        fenceHit = true;
      }
      kart.updateTrackQuery();
      results.set(kart, { fenceHit, vehicleHit: false, grassEntered: !beforeOffRoad && kart.isOffRoad });
    }

    for (let i = 0; i < karts.length; i += 1) {
      for (let j = i + 1; j < karts.length; j += 1) {
        const a = karts[i];
        const b = karts[j];
        const delta = a.position.clone().sub(b.position);
        delta.y = 0;
        const distance = delta.length();
        if (distance >= 1.75) continue;
        const normal = distance > 0.001 ? delta.normalize() : new THREE.Vector3(1, 0, 0);
        const overlap = 1.75 - distance;
        a.position.addScaledVector(normal, overlap * 0.5);
        b.position.addScaledVector(normal, -overlap * 0.5);
        const aSpeed = a.speed;
        a.speed = b.speed * 0.35;
        b.speed = aSpeed * 0.35;
        const aResult = results.get(a);
        const bResult = results.get(b);
        if (aResult) aResult.vehicleHit = true;
        if (bResult) bResult.vehicleHit = true;
      }
    }
    return results;
  }

  reset(kart: Kart): void {
    const query = this.track.getNearest(kart.position);
    kart.position.copy(query.sample.position).addScaledVector(query.sample.lateral, 0).setY(0.23);
    kart.yaw = Math.atan2(query.sample.tangent.x, -query.sample.tangent.z);
    kart.speed = 0;
    kart.steering = 0;
    kart.updateTrackQuery();
  }

  forceToOffset(kart: Kart, lateralOffset: number): void {
    const query = this.track.getNearest(kart.position);
    const safeOffset = clamp(lateralOffset, -this.track.fenceLimit * 1.8, this.track.fenceLimit * 1.8);
    kart.position.copy(query.sample.position).addScaledVector(query.sample.lateral, safeOffset).setY(0.23);
    kart.updateTrackQuery();
  }
}
