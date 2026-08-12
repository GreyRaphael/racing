import * as THREE from 'three';
import { clamp, shortestAngle } from '../constants';
import { Track } from '../track/Track';
import { Kart } from './Kart';

export interface AiProfile {
  speed: number;
  lookahead: number;
  steeringBias: number;
}

export class AiKart extends Kart {
  constructor(name: string, color: number, track: Track, private readonly profile: AiProfile) {
    super(name, color, track);
  }

  update(delta: number, canDrive: boolean, playerProgress: number): void {
    if (this.destroyed) {
      this.updateRecovery(delta);
      return;
    }
    if (!canDrive || this.finished) {
      this.steering = 0;
      this.speed = Math.max(0, this.speed - delta * 3);
      this.integrate(delta);
      this.updateTrackQuery();
      return;
    }

    const lookahead = this.profile.lookahead + Math.min(0.035, Math.abs(this.speed) * 0.0012);
    const target = this.track.getSampleAtProgress(this.progress + lookahead);
    const toTarget = target.position.clone().sub(this.position).setY(0).normalize();
    // AI target yaw uses the same local -Z convention as the kart model.
    const targetYaw = Math.atan2(-toTarget.x, -toTarget.z);
    const angle = shortestAngle(targetYaw - this.yaw);
    // A target on the kart's right has a negative yaw delta; convert that
    // into the public positive-right steering convention.
    this.steering = clamp(-angle / 0.62 + this.profile.steeringBias, -1, 1);

    const farther = this.track.getSampleAtProgress(this.progress + 0.025).tangent;
    const curveTightness = 1 - clamp(target.tangent.dot(farther), 0, 1);
    const targetSpeed = clamp(this.profile.speed - curveTightness * 29, 8, this.profile.speed);
    if (this.speed < targetSpeed) this.speed += 15 * delta;
    else this.speed -= 20 * delta;
    const rubberBand = clamp(playerProgress - (this.lap - 1 + this.progress), -0.7, 0.7);
    this.speed += rubberBand * 1.5 * delta;
    this.speed = clamp(this.speed, 0, this.profile.speed + 2);
    this.isDrifting = Math.abs(this.steering) > 0.72 && this.speed > 12;
    this.integrate(delta);
    this.updateTrackQuery();
  }
}
