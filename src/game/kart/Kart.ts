import * as THREE from 'three';
import { COLORS, clamp, damp, shortestAngle } from '../constants';
import { Track } from '../track/Track';

export interface KartDebugState {
  name: string;
  speed: number;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  steering: number;
  progress: number;
  lateralOffset: number;
  lap: number;
  isOffRoad: boolean;
  isDrifting: boolean;
  lateralVelocity: number;
  destroyed: boolean;
  finished: boolean;
}

export class Kart {
  readonly group = new THREE.Group();
  readonly position = this.group.position;
  readonly name: string;
  readonly color: number;
  speed = 0;
  yaw = 0;
  pitch = 0;
  steering = 0;
  progress = 0;
  lateralOffset = 0;
  lap = 1;
  isOffRoad = false;
  isDrifting = false;
  lateralVelocity = 0;
  destroyed = false;
  collisionCooldown = 0;
  finished = false;
  private recoveryTimer = 0;
  private recoveryProgress = 0;
  private recoveryLateral = 0;
  finishTime: number | null = null;
  private readonly wheelMeshes: THREE.Mesh[] = [];
  private readonly frontWheelGroup = new THREE.Group();

  constructor(name: string, color: number, protected track: Track) {
    this.name = name;
    this.color = color;
    this.buildVisual();
    this.group.castShadow = true;
  }

  setTrack(track: Track): void {
    this.track = track;
  }

  getForward(): THREE.Vector3 {
    // The kart nose is modelled along local -Z. Three.js Y rotation therefore
    // transforms it to (-sin(yaw), 0, -cos(yaw).
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getRight(): THREE.Vector3 {
    // local +X is the kart's right side after a Y rotation
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  getVelocity(): THREE.Vector3 {
    return this.getForward().multiplyScalar(this.speed).add(this.getRight().multiplyScalar(this.lateralVelocity));
  }

  setVelocity(velocity: THREE.Vector3): void {
    this.speed = velocity.dot(this.getForward());
    this.lateralVelocity = velocity.dot(this.getRight());
  }

  alignToVelocity(velocity: THREE.Vector3, amount: number): void {
    const flatVelocity = velocity.clone().setY(0);
    if (flatVelocity.lengthSq() < 0.01) return;
    const desiredYaw = Math.atan2(-flatVelocity.x, -flatVelocity.z);
    this.yaw += shortestAngle(desiredYaw - this.yaw) * clamp(amount, 0, 1);
  }

  placeAt(progress: number, lateralOffset = 0): void {
    const pose = this.track.getPose(progress, lateralOffset);
    this.position.copy(pose.position).add(new THREE.Vector3(0, 0.23, 0));
    this.yaw = pose.yaw;
    this.pitch = pose.pitch;
    this.progress = progress;
    this.lateralOffset = lateralOffset;
    this.updateVisual(0);
  }

  resetRaceState(): void {
    this.speed = 0;
    this.steering = 0;
    this.lateralVelocity = 0;
    this.lap = 1;
    this.destroyed = false;
    this.recoveryTimer = 0;
    this.finished = false;
    this.finishTime = null;
    this.isOffRoad = false;
    this.isDrifting = false;
    this.collisionCooldown = 0;
    this.group.visible = true;
  }

  integrate(delta: number): void {
    this.position.addScaledVector(this.getForward(), this.speed * delta);
    this.position.addScaledVector(this.getRight(), this.lateralVelocity * delta);

    // Smoothly adhere to 3D track elevation and update pitch tilt
    const currentSample = this.track.getSampleAtProgress(this.progress);
    const targetY = currentSample.position.y + 0.23;
    this.position.y = damp(this.position.y, targetY, 20, delta);

    const targetPitch = Math.atan2(currentSample.tangent.y, Math.hypot(currentSample.tangent.x, currentSample.tangent.z));
    this.pitch = damp(this.pitch, targetPitch, 14, delta);

    // Slope gravity acceleration: downhill gives acceleration, uphill adds resistance (static friction holds parked karts)
    if (Math.abs(this.speed) > 0.05) {
      const slopeAccel = -16.0 * Math.sin(this.pitch);
      this.speed += slopeAccel * delta;
    }

    // Positive steering means right. With a local -Z nose, right-turning
    // decreases the Three.js Y rotation.
    this.yaw -= this.steering * (0.45 + Math.min(1, Math.abs(this.speed) / 15) * 1.2) * delta;
    const grip = this.isDrifting ? 2.4 : 9;
    this.lateralVelocity = damp(this.lateralVelocity, 0, grip, delta);
    this.updateVisual(delta);
  }

  destroyFor(seconds = 3): void {
    if (this.destroyed || this.finished) return;
    this.destroyed = true;
    this.recoveryTimer = seconds;
    this.recoveryProgress = this.progress;
    this.recoveryLateral = clamp(this.lateralOffset, -this.track.roadHalfWidth * 0.75, this.track.roadHalfWidth * 0.75);
    this.speed = 0;
    this.lateralVelocity = 0;
    this.steering = 0;
    this.group.visible = false;
  }

  updateRecovery(delta: number): boolean {
    if (!this.destroyed) return false;
    this.recoveryTimer -= delta;
    if (this.recoveryTimer > 0) return false;
    this.destroyed = false;
    this.recoveryTimer = 0;
    this.group.visible = true;
    this.speed = 0;
    this.lateralVelocity = 0;
    this.steering = 0;
    this.placeAt(this.recoveryProgress, this.recoveryLateral);
    this.updateTrackQuery();
    return true;
  }

  updateTrackQuery(): void {
    const query = this.track.getNearest(this.position);
    this.progress = query.sample.progress;
    this.lateralOffset = query.lateralOffset;
    this.isOffRoad = !this.track.isOnRoad(query.lateralOffset);
  }

  updateVisual(delta: number): void {
    this.group.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const targetLean = -this.steering * Math.min(0.08, Math.abs(this.speed) * 0.006);
    this.group.rotation.z = damp(this.group.rotation.z, targetLean, 8, Math.max(0.001, delta));
    for (const wheel of this.wheelMeshes) wheel.rotation.x -= this.speed * Math.max(0.001, delta) * 1.5;
    this.frontWheelGroup.rotation.y = -this.steering * 0.32;
  }

  getDebugState(): KartDebugState {
    return {
      name: this.name,
      speed: this.speed,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      yaw: this.yaw,
      pitch: this.pitch,
      steering: this.steering,
      progress: this.progress,
      lateralOffset: this.lateralOffset,
      lap: this.lap,
      isOffRoad: this.isOffRoad,
      isDrifting: this.isDrifting,
      lateralVelocity: this.lateralVelocity,
      destroyed: this.destroyed,
      finished: this.finished,
    };
  }

  private buildVisual(): void {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.18, 12),
      new THREE.MeshBasicMaterial({ color: 0x244b3b, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.21;
    this.group.add(shadow);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.68, flatShading: true });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x243b42, roughness: 0.75, flatShading: true });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: COLORS.yellow, roughness: 0.65, flatShading: true });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 2.2), bodyMaterial);
    chassis.position.y = 0.42;
    chassis.castShadow = true;
    this.group.add(chassis);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.96, 4), bodyMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.46, -1.2);
    nose.scale.set(1, 0.46, 1);
    nose.castShadow = true;
    this.group.add(nose);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.72), darkMaterial);
    seat.position.set(0, 0.76, 0.28);
    seat.castShadow = true;
    this.group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.13, 0.11), accentMaterial);
    back.position.set(0, 1.04, 0.73);
    this.group.add(back);

    const steering = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 6, 10), darkMaterial);
    steering.rotation.x = Math.PI / 2;
    steering.position.set(0, 0.96, -0.14);
    this.group.add(steering);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x26383d, roughness: 1, flatShading: true });
    this.frontWheelGroup.position.y = 0.27;
    this.group.add(this.frontWheelGroup);
    for (const x of [-0.82, 0.82]) {
      const front = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 8), wheelMaterial);
      front.rotation.z = Math.PI / 2;
      front.position.set(x, 0, -0.75);
      front.castShadow = true;
      this.frontWheelGroup.add(front);
      this.wheelMeshes.push(front);
      const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8), wheelMaterial);
      rear.rotation.z = Math.PI / 2;
      rear.position.set(x, 0, 0.78);
      rear.castShadow = true;
      this.group.add(rear);
      this.wheelMeshes.push(rear);
    }

    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xfff1ac, emissive: 0x8b671e, emissiveIntensity: 0.4 });
    for (const x of [-0.48, 0.48]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), lightMaterial);
      light.position.set(x, 0.58, -1.65);
      this.group.add(light);
    }
  }
}
