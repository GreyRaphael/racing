import * as THREE from 'three';
import { KART_COLLISION_DISTANCE, clamp } from '../constants';
import { Kart } from '../kart/Kart';
import { Track } from '../track/Track';

export interface CollisionResult {
  fenceHit: boolean;
  vehicleHit: boolean;
  grassEntered: boolean;
}

export interface VehicleCollision {
  front: Kart;
  rear: Kart;
}

export interface CollisionResolution {
  results: Map<Kart, CollisionResult>;
  vehicleCollisions: VehicleCollision[];
}

export class CollisionSystem {
  constructor(private readonly track: Track) {}

  resolve(karts: Kart[]): CollisionResolution {
    const results = new Map<Kart, CollisionResult>();
    const vehicleCollisions: VehicleCollision[] = [];
    for (const kart of karts) {
      if (kart.destroyed) continue;
      const beforeOffRoad = kart.isOffRoad;
      const query = this.track.getNearest(kart.position);
      let fenceHit = false;
      if (this.track.isBeyondFence(query.lateralOffset)) {
        const side = Math.sign(query.lateralOffset || 1);
        const outward = query.sample.lateral.clone().multiplyScalar(side);
        const safeOffset = side * (this.track.fenceLimit - 0.15);
        kart.position.copy(query.sample.position).addScaledVector(query.sample.lateral, safeOffset).setY(0.23);

        // Reflect only a small amount of velocity. The position clamp is the
        // rigid wall; the negative speed/lateral component is the soft bounce.
        const outwardSpeed = kart.getForward().dot(outward) * kart.speed + kart.getRight().dot(outward) * kart.lateralVelocity;
        if (outwardSpeed > 0) kart.speed = -Math.min(Math.abs(kart.speed) * 0.2, 4);
        kart.lateralVelocity *= -0.2;
        fenceHit = true;
      }
      kart.updateTrackQuery();
      results.set(kart, { fenceHit, vehicleHit: false, grassEntered: !beforeOffRoad && kart.isOffRoad });
    }

    for (let i = 0; i < karts.length; i += 1) {
      for (let j = i + 1; j < karts.length; j += 1) {
        const a = karts[i];
        const b = karts[j];
        if (a.destroyed || b.destroyed) continue;
        const delta = a.position.clone().sub(b.position);
        delta.y = 0;
        const distance = delta.length();
        if (distance >= KART_COLLISION_DISTANCE) continue;
        const normal = distance > 0.001 ? delta.normalize() : new THREE.Vector3(1, 0, 0);
        const overlap = KART_COLLISION_DISTANCE - distance;
        a.position.addScaledVector(normal, overlap * 0.5);
        b.position.addScaledVector(normal, -overlap * 0.5);
        const [front, rear] = this.findFrontAndRear(a, b);
        vehicleCollisions.push({ front, rear });
        const aResult = results.get(a);
        const bResult = results.get(b);
        if (aResult) aResult.vehicleHit = true;
        if (bResult) bResult.vehicleHit = true;
      }
    }
    return { results, vehicleCollisions };
  }

  reset(kart: Kart): void {
    const query = this.track.getNearest(kart.position);
    kart.destroyed = false;
    kart.group.visible = true;
    kart.position.copy(query.sample.position).addScaledVector(query.sample.lateral, 0).setY(0.23);
    kart.yaw = Math.atan2(-query.sample.tangent.x, -query.sample.tangent.z);
    kart.speed = 0;
    kart.lateralVelocity = 0;
    kart.steering = 0;
    kart.updateTrackQuery();
  }

  forceToOffset(kart: Kart, lateralOffset: number): void {
    const query = this.track.getNearest(kart.position);
    const safeOffset = clamp(lateralOffset, -this.track.fenceLimit * 1.8, this.track.fenceLimit * 1.8);
    kart.position.copy(query.sample.position).addScaledVector(query.sample.lateral, safeOffset).setY(0.23);
    kart.updateTrackQuery();
  }

  private findFrontAndRear(a: Kart, b: Kart): [Kart, Kart] {
    const bFromA = b.position.clone().sub(a.position).setY(0);
    const aFromB = a.position.clone().sub(b.position).setY(0);
    const bIsAheadOfA = bFromA.dot(a.getForward()) > 0.12;
    const aIsAheadOfB = aFromB.dot(b.getForward()) > 0.12;
    if (bIsAheadOfA && !aIsAheadOfB) return [b, a];
    if (aIsAheadOfB && !bIsAheadOfA) return [a, b];

    // Side impacts do not have a unique front. Use wrapped progress as a
    // stable tie-breaker so the car farther around the course is the target.
    const forwardGap = ((b.progress - a.progress) + 1) % 1;
    return forwardGap > 0 && forwardGap < 0.5 ? [b, a] : [a, b];
  }
}
