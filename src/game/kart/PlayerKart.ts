import { clamp, damp } from '../constants';
import { Track } from '../track/Track';
import { InputState } from '../systems/InputSystem';
import { Kart } from './Kart';

export class PlayerKart extends Kart {
  constructor(track: Track) {
    super('你', 0xef624f, track);
  }

  update(delta: number, input: InputState, canDrive: boolean): void {
    const steerInput = Number(input.right) - Number(input.left);
    this.steering = canDrive ? steerInput : 0;
    // Keep the state observable as soon as the handbrake is engaged at a moving speed;
    // steering still changes the handling through the reduced drift resistance below.
    this.isDrifting = canDrive && input.drift && (Math.abs(this.speed) > 0.15 || Math.abs(steerInput) > 0);

    if (!canDrive) {
      this.speed = Math.max(0, this.speed - delta * 7);
      this.integrate(delta);
      this.updateTrackQuery();
      return;
    }

    if (input.throttle) this.speed += 19 * delta;
    if (input.brake) {
      if (this.speed > 0.8) this.speed -= 27 * delta;
      else this.speed -= 8 * delta;
    }

    const resistance = this.isDrifting ? 0.55 : 2.1;
    const driftTarget = this.isDrifting ? steerInput * Math.max(2, Math.abs(this.speed) * 0.42) : 0;
    this.lateralVelocity = damp(this.lateralVelocity, driftTarget, this.isDrifting ? 4 : 11, delta);
    if (!input.throttle && !input.brake) {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), resistance * delta);
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), resistance * delta * 0.25);
    }
    this.speed = clamp(this.speed, -8, 25);
    this.integrate(delta);
    this.updateTrackQuery();
  }
}
