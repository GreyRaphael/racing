import * as THREE from 'three';
import { COLORS, GRASS_FENCE_LIMIT, ROAD_HALF_WIDTH, TRACK_SAMPLE_COUNT, UP, clamp, wrapProgress } from '../constants';

export interface TrackSample {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  lateral: THREE.Vector3;
  progress: number;
  distance: number;
}

export interface TrackQuery {
  sample: TrackSample;
  lateralOffset: number;
  distanceToCenter: number;
}

export class Track {
  readonly group = new THREE.Group();
  readonly roadHalfWidth = ROAD_HALF_WIDTH;
  readonly fenceLimit = GRASS_FENCE_LIMIT;
  readonly samples: TrackSample[] = [];
  readonly length: number;
  private readonly curve: THREE.CatmullRomCurve3;

  constructor() {
    const controls = [
      new THREE.Vector3(-24, 0, -34),
      new THREE.Vector3(11, 0, -37),
      new THREE.Vector3(35, 0, -22),
      new THREE.Vector3(34, 0, 7),
      new THREE.Vector3(17, 0, 23),
      new THREE.Vector3(26, 0, 43),
      new THREE.Vector3(-8, 0, 47),
      new THREE.Vector3(-35, 0, 32),
      new THREE.Vector3(-44, 0, 5),
      new THREE.Vector3(-34, 0, -21),
    ];
    this.curve = new THREE.CatmullRomCurve3(controls, true, 'centripetal', 0.55);
    this.sampleCurve();
    this.length = this.samples[this.samples.length - 1]?.distance ?? 0;
    this.buildRoad();
  }

  getSampleAtProgress(progress: number): TrackSample {
    const wrapped = wrapProgress(progress);
    const scaled = wrapped * this.samples.length;
    const first = Math.floor(scaled) % this.samples.length;
    const next = (first + 1) % this.samples.length;
    const blend = scaled - Math.floor(scaled);
    const a = this.samples[first];
    const b = this.samples[next];
    const position = a.position.clone().lerp(b.position, blend);
    const tangent = a.tangent.clone().lerp(b.tangent, blend).normalize();
    const lateral = tangent.clone().cross(UP).normalize();
    const distance = a.distance + (next === 0 ? this.length - a.distance : b.distance - a.distance) * blend;
    return { position, tangent, lateral, progress: wrapped, distance };
  }

  getPose(progress: number, lateralOffset = 0): { position: THREE.Vector3; tangent: THREE.Vector3; yaw: number } {
    const sample = this.getSampleAtProgress(progress);
    const position = sample.position.clone().addScaledVector(sample.lateral, lateralOffset);
    const yaw = Math.atan2(sample.tangent.x, -sample.tangent.z);
    return { position, tangent: sample.tangent, yaw };
  }

  getNearest(position: THREE.Vector3): TrackQuery {
    let nearest = this.samples[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const sample of this.samples) {
      const distance = sample.position.distanceToSquared(position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = sample;
      }
    }
    const delta = position.clone().sub(nearest.position);
    const lateralOffset = delta.dot(nearest.lateral);
    return {
      sample: nearest,
      lateralOffset,
      distanceToCenter: Math.sqrt(nearestDistance),
    };
  }

  isOnRoad(lateralOffset: number): boolean {
    return Math.abs(lateralOffset) <= this.roadHalfWidth;
  }

  isBeyondFence(lateralOffset: number): boolean {
    return Math.abs(lateralOffset) > this.fenceLimit;
  }

  private sampleCurve(): void {
    let distance = 0;
    let previous = this.curve.getPointAt(0);
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i += 1) {
      const progress = i / TRACK_SAMPLE_COUNT;
      const position = this.curve.getPointAt(progress);
      const tangent = this.curve.getTangentAt(progress).normalize();
      if (i > 0) distance += previous.distanceTo(position);
      previous = position;
      this.samples.push({
        position,
        tangent,
        lateral: tangent.clone().cross(UP).normalize(),
        progress,
        distance,
      });
    }
  }

  private buildRoad(): void {
    const roadPositions: number[] = [];
    const roadIndices: number[] = [];
    const edgePositions: number[] = [];
    const edgeIndices: number[] = [];
    const half = this.roadHalfWidth;
    const edgeWidth = 0.28;

    for (let i = 0; i < this.samples.length; i += 1) {
      const sample = this.samples[i];
      const nextIndex = (i + 1) % this.samples.length;
      const left = sample.position.clone().addScaledVector(sample.lateral, -half);
      const right = sample.position.clone().addScaledVector(sample.lateral, half);
      roadPositions.push(left.x, 0.04, left.z, right.x, 0.04, right.z);
      const nextSample = this.samples[nextIndex];
      const nextLeft = nextSample.position.clone().addScaledVector(nextSample.lateral, -half);
      const nextRight = nextSample.position.clone().addScaledVector(nextSample.lateral, half);
      if (i < this.samples.length) {
        const base = i * 2;
        const nextBase = ((i + 1) % this.samples.length) * 2;
        roadIndices.push(base, nextBase, base + 1, base + 1, nextBase, nextBase + 1);
      }
      const leftEdge = sample.position.clone().addScaledVector(sample.lateral, -(half + edgeWidth));
      const rightEdge = sample.position.clone().addScaledVector(sample.lateral, half + edgeWidth);
      edgePositions.push(leftEdge.x, 0.055, leftEdge.z, rightEdge.x, 0.055, rightEdge.z);
      edgePositions.push(left.x, 0.058, left.z, right.x, 0.058, right.z);
      const edgeBase = i * 4;
      const edgeNext = ((i + 1) % this.samples.length) * 4;
      edgeIndices.push(edgeBase, edgeNext, edgeBase + 1, edgeBase + 1, edgeNext, edgeNext + 1);
      edgeIndices.push(edgeBase + 2, edgeNext + 2, edgeBase + 3, edgeBase + 3, edgeNext + 2, edgeNext + 3);
      void nextLeft;
      void nextRight;
    }

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeometry.setIndex(roadIndices);
    roadGeometry.computeVertexNormals();
    this.group.add(new THREE.Mesh(roadGeometry, new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.95 })));

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeGeometry.setIndex(edgeIndices);
    edgeGeometry.computeVertexNormals();
    this.group.add(new THREE.Mesh(edgeGeometry, new THREE.MeshStandardMaterial({ color: COLORS.roadEdge, roughness: 0.8 })));

    this.buildCenterMarkers();
    this.buildGuardRails();
  }

  private buildCenterMarkers(): void {
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f3d8, roughness: 0.8 });
    for (let i = 8; i < this.samples.length; i += 18) {
      const sample = this.samples[i];
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 1.5), markerMaterial);
      marker.position.copy(sample.position).setY(0.07);
      marker.rotation.y = Math.atan2(sample.tangent.x, -sample.tangent.z);
      this.group.add(marker);
    }

    const startSample = this.samples[0];
    for (let i = -4; i < 4; i += 1) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.035, 1.4),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xfaf7e9 : COLORS.red, roughness: 0.75 }),
      );
      tile.position.copy(startSample.position).addScaledVector(startSample.lateral, i * 1.13).setY(0.09);
      tile.rotation.y = Math.atan2(startSample.tangent.x, -startSample.tangent.z);
      this.group.add(tile);
    }
  }

  private buildGuardRails(): void {
    const railMaterial = new THREE.MeshStandardMaterial({ color: COLORS.fence, roughness: 0.7 });
    const capMaterial = new THREE.MeshStandardMaterial({ color: COLORS.red, roughness: 0.75 });
    for (let i = 0; i < this.samples.length; i += 15) {
      const sample = this.samples[i];
      for (const side of [-1, 1]) {
        const postPosition = sample.position.clone().addScaledVector(sample.lateral, side * (this.roadHalfWidth + 1.22));
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.22), railMaterial);
        post.position.copy(postPosition).setY(0.49);
        this.group.add(post);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.26), capMaterial);
        cap.position.copy(postPosition).setY(0.98);
        this.group.add(cap);
        const next = this.samples[(i + 5) % this.samples.length];
        const midpoint = sample.position.clone().lerp(next.position, 0.5).addScaledVector(sample.lateral, side * (this.roadHalfWidth + 1.22));
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, sample.position.distanceTo(next.position) + 0.4), railMaterial);
        rail.position.copy(midpoint).setY(0.74);
        rail.rotation.y = Math.atan2(next.position.x - sample.position.x, -(next.position.z - sample.position.z));
        this.group.add(rail);
      }
    }
  }
}
