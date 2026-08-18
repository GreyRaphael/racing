import * as THREE from 'three';
import { damp, shortestAngle } from '../constants';
import { Track } from '../track/Track';
import { GhostData, GhostFrame } from '../../storage/GhostStorage';

export class GhostKart {
  readonly group = new THREE.Group();
  readonly position = this.group.position;
  readonly name = '幽灵车';
  yaw = 0;
  pitch = 0;
  steering = 0;
  progress = 0;
  isDrifting = false;
  speed = 0;

  private ghostData: GhostData | null = null;
  private cursor = 0;
  private readonly wheelMeshes: THREE.Mesh[] = [];
  private readonly frontWheelGroup = new THREE.Group();
  private haloMesh!: THREE.Mesh;
  private haloMaterial!: THREE.MeshBasicMaterial;

  constructor(protected track: Track) {
    this.buildVisual();
    this.group.visible = false;
  }

  setTrack(track: Track): void {
    this.track = track;
  }

  setGhostData(data: GhostData | null): void {
    this.ghostData = data;
    this.cursor = 0;
    if (!data || data.frames.length === 0) {
      this.group.visible = false;
    } else {
      this.group.visible = true;
      this.playback(0);
    }
  }

  get hasData(): boolean {
    return Boolean(this.ghostData && this.ghostData.frames.length > 0);
  }

  get totalTime(): number {
    return this.ghostData?.totalTime ?? 0;
  }

  reset(): void {
    this.cursor = 0;
    if (this.ghostData && this.ghostData.frames.length > 0) {
      this.playback(0);
    }
  }

  playback(time: number): void {
    if (!this.ghostData || this.ghostData.frames.length === 0) return;
    const frames = this.ghostData.frames;
    const totalFrames = frames.length;

    if (time <= frames[0].t) {
      const f = frames[0];
      this.applyFrame(f);
      this.updateVisual(0);
      return;
    }

    if (time >= frames[totalFrames - 1].t) {
      const f = frames[totalFrames - 1];
      this.applyFrame(f);
      this.speed = 0;
      this.updateVisual(0);
      return;
    }

    // Binary search or sequential search from cursor
    let idx = this.cursor;
    if (idx >= totalFrames - 1 || frames[idx].t > time || frames[idx + 1].t < time) {
      let low = 0;
      let high = totalFrames - 2;
      idx = 0;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (frames[mid].t <= time) {
          idx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }
    this.cursor = idx;

    const f0 = frames[idx];
    const f1 = frames[idx + 1];
    const dt = Math.max(0.0001, f1.t - f0.t);
    const alpha = Math.max(0, Math.min(1, (time - f0.t) / dt));

    this.position.x = f0.x + (f1.x - f0.x) * alpha;
    this.position.y = f0.y + (f1.y - f0.y) * alpha;
    this.position.z = f0.z + (f1.z - f0.z) * alpha;

    this.pitch = f0.pitch + (f1.pitch - f0.pitch) * alpha;
    this.yaw = f0.yaw + shortestAngle(f1.yaw - f0.yaw) * alpha;
    this.steering = f0.steer + (f1.steer - f0.steer) * alpha;
    this.progress = f0.progress + (f1.progress - f0.progress) * alpha;
    this.isDrifting = f1.drift;

    const dist = Math.hypot(f1.x - f0.x, f1.z - f0.z);
    this.speed = dist / dt;

    this.updateVisual(dt * alpha);
  }

  private applyFrame(f: GhostFrame): void {
    this.position.set(f.x, f.y, f.z);
    this.pitch = f.pitch;
    this.yaw = f.yaw;
    this.steering = f.steer;
    this.progress = f.progress;
    this.isDrifting = f.drift;
  }

  updateVisual(delta: number): void {
    this.group.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const targetLean = -this.steering * Math.min(0.08, Math.abs(this.speed) * 0.006);
    this.group.rotation.z = damp(this.group.rotation.z, targetLean, 8, Math.max(0.001, delta));

    for (const wheel of this.wheelMeshes) {
      wheel.rotation.x -= this.speed * Math.max(0.001, delta) * 1.5;
    }
    this.frontWheelGroup.rotation.y = -this.steering * 0.32;

    // Subtle pulsing animation on holographic halo
    if (this.haloMaterial) {
      const pulse = 0.22 + Math.sin(performance.now() * 0.004) * 0.06;
      this.haloMaterial.opacity = pulse;
    }
  }

  getDebugState(): Record<string, unknown> {
    return {
      name: this.name,
      hasData: this.hasData,
      visible: this.group.visible,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      yaw: this.yaw,
      pitch: this.pitch,
      steering: this.steering,
      progress: this.progress,
      speed: this.speed,
      isDrifting: this.isDrifting,
    };
  }

  private buildVisual(): void {
    // Holographic ground glow halo
    this.haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x4fe6ff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.haloMesh = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), this.haloMaterial);
    this.haloMesh.rotation.x = -Math.PI / 2;
    this.haloMesh.position.y = -0.2;
    this.group.add(this.haloMesh);

    // Holographic ghost chassis materials
    const ghostBodyMat = new THREE.MeshStandardMaterial({
      color: 0x4fe6ff,
      emissive: 0x1878aa,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      roughness: 0.2,
    });

    const ghostDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1f5f7a,
      emissive: 0x0e3b50,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      roughness: 0.3,
    });

    const ghostAccentMat = new THREE.MeshStandardMaterial({
      color: 0x8ef5ff,
      emissive: 0x30a5c0,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      roughness: 0.1,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 2.2), ghostBodyMat);
    chassis.position.y = 0.42;
    this.group.add(chassis);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.96, 4), ghostBodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.46, -1.2);
    nose.scale.set(1, 0.46, 1);
    this.group.add(nose);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.72), ghostDarkMat);
    seat.position.set(0, 0.76, 0.28);
    this.group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.13, 0.11), ghostAccentMat);
    back.position.set(0, 1.04, 0.73);
    this.group.add(back);

    const steering = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 6, 10), ghostDarkMat);
    steering.rotation.x = Math.PI / 2;
    steering.position.set(0, 0.96, -0.14);
    this.group.add(steering);

    this.frontWheelGroup.position.y = 0.27;
    this.group.add(this.frontWheelGroup);

    for (const x of [-0.82, 0.82]) {
      const front = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 8), ghostDarkMat);
      front.rotation.z = Math.PI / 2;
      front.position.set(x, 0, -0.75);
      this.frontWheelGroup.add(front);
      this.wheelMeshes.push(front);

      const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8), ghostDarkMat);
      rear.rotation.z = Math.PI / 2;
      rear.position.set(x, 0, 0.78);
      this.group.add(rear);
      this.wheelMeshes.push(rear);
    }

    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0x8ef5ff,
      emissive: 0x8ef5ff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
    });
    for (const x of [-0.48, 0.48]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), lightMaterial);
      light.position.set(x, 0.58, -1.65);
      this.group.add(light);
    }
  }
}
