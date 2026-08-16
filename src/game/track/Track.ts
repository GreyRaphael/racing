import * as THREE from 'three';
import { GRASS_FENCE_LIMIT, ROAD_HALF_WIDTH, TRACK_CONFIGS, TRACK_SAMPLE_COUNT, TrackConfig, UP, wrapProgress } from '../constants';

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
  readonly config: TrackConfig;
  private readonly curve: THREE.CatmullRomCurve3;

  constructor(config: TrackConfig = TRACK_CONFIGS.meadow) {
    this.config = config;
    this.curve = new THREE.CatmullRomCurve3(config.controls, true, 'centripetal', 0.55);
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

  getPose(progress: number, lateralOffset = 0): { position: THREE.Vector3; tangent: THREE.Vector3; yaw: number; pitch: number } {
    const sample = this.getSampleAtProgress(progress);
    const position = sample.position.clone().addScaledVector(sample.lateral, lateralOffset);
    // Kart visuals point along local -Z, so this yaw makes their nose follow the tangent.
    const yaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);
    const pitch = Math.atan2(sample.tangent.y, Math.hypot(sample.tangent.x, sample.tangent.z));
    return { position, tangent: sample.tangent, yaw, pitch };
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

  private intersect2D(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3): THREE.Vector3 | null {
    const denom = (p4.z - p3.z) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.z - p1.z);
    if (Math.abs(denom) < 1e-5) return null;
    const ua = ((p4.x - p3.x) * (p1.z - p3.z) - (p4.z - p3.z) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.z - p3.z) - (p2.z - p1.z) * (p1.x - p3.x)) / denom;
    if (ua >= -0.02 && ua <= 1.02 && ub >= -0.02 && ub <= 1.02) {
      return new THREE.Vector3(
        p1.x + ua * (p2.x - p1.x),
        p1.y + ua * (p2.y - p1.y),
        p1.z + ua * (p2.z - p1.z),
      );
    }
    return null;
  }

  private untangleFencePolyline(rawPoints: THREE.Vector3[], maxStep = 14): THREE.Vector3[] {
    const points = rawPoints.map((p) => p.clone());
    let changed = true;
    let iter = 0;
    while (changed && iter < 8) {
      changed = false;
      iter += 1;
      const n = points.length;
      for (let i = 0; i < n; i += 1) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        for (let s = 2; s <= maxStep; s += 1) {
          const j = (i + s) % n;
          const p3 = points[j];
          const p4 = points[(j + 1) % n];
          const hit = this.intersect2D(p1, p2, p3, p4);
          if (hit) {
            if (j > i) {
              points.splice(i + 1, j - i, hit);
            } else {
              points.splice(i + 1);
              points.splice(0, j + 1, hit);
            }
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }
    return points;
  }

  private buildRoad(): void {
    const roadPositions: number[] = [];
    const roadNormals: number[] = [];
    const roadIndices: number[] = [];
    const edgePositions: number[] = [];
    const edgeNormals: number[] = [];
    const edgeIndices: number[] = [];
    const half = this.roadHalfWidth;
    const edgeWidth = 0.28;

    for (let i = 0; i < this.samples.length; i += 1) {
      const sample = this.samples[i];
      const left = sample.position.clone().addScaledVector(sample.lateral, -half);
      const right = sample.position.clone().addScaledVector(sample.lateral, half);
      const leftEdge = sample.position.clone().addScaledVector(sample.lateral, -(half + edgeWidth));
      const rightEdge = sample.position.clone().addScaledVector(sample.lateral, half + edgeWidth);
      const normal = sample.lateral.clone().cross(sample.tangent).normalize();

      // 1. Road surface
      roadPositions.push(
        left.x, left.y + 0.04, left.z,
        right.x, right.y + 0.04, right.z,
      );
      roadNormals.push(
        normal.x, normal.y, normal.z,
        normal.x, normal.y, normal.z,
      );
      const base = i * 2;
      const nextBase = ((i + 1) % this.samples.length) * 2;
      roadIndices.push(base, base + 1, nextBase, base + 1, nextBase + 1, nextBase);

      // 2. Curb edges
      edgePositions.push(
        leftEdge.x, leftEdge.y + 0.055, leftEdge.z,
        left.x, left.y + 0.058, left.z,
        right.x, right.y + 0.058, right.z,
        rightEdge.x, rightEdge.y + 0.055, rightEdge.z,
      );
      edgeNormals.push(
        normal.x, normal.y, normal.z,
        normal.x, normal.y, normal.z,
        normal.x, normal.y, normal.z,
        normal.x, normal.y, normal.z,
      );
      const edgeBase = i * 4;
      const edgeNext = ((i + 1) % this.samples.length) * 4;
      edgeIndices.push(edgeBase, edgeBase + 1, edgeNext, edgeBase + 1, edgeNext + 1, edgeNext);
      edgeIndices.push(edgeBase + 2, edgeBase + 3, edgeNext + 2, edgeBase + 3, edgeNext + 3, edgeNext + 2);
    }

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeometry.setIndex(roadIndices);
    const road = new THREE.Mesh(
      roadGeometry,
      new THREE.MeshStandardMaterial({
        color: this.config.theme.road,
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    );
    road.receiveShadow = true;
    this.group.add(road);

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(edgeNormals, 3));
    edgeGeometry.setIndex(edgeIndices);
    const edge = new THREE.Mesh(
      edgeGeometry,
      new THREE.MeshStandardMaterial({
        color: this.config.theme.roadEdge,
        roughness: 0.82,
        side: THREE.DoubleSide,
      }),
    );
    edge.receiveShadow = true;
    this.group.add(edge);

    this.buildCenterMarkers();
    this.buildGuardRails();
  }

  private buildCenterMarkers(): void {
    const markerMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.marker, roughness: 0.8 });
    for (let i = 8; i < this.samples.length; i += 18) {
      const sample = this.samples[i];
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 1.5), markerMaterial);
      marker.position.copy(sample.position).add(new THREE.Vector3(0, 0.07, 0));
      marker.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
      this.group.add(marker);
    }

    const startSample = this.samples[0];
    for (let i = -4; i < 4; i += 1) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.035, 1.4),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xfaf7e9 : this.config.theme.fencePost, roughness: 0.75 }),
      );
      tile.position.copy(startSample.position).addScaledVector(startSample.lateral, i * 1.13).add(new THREE.Vector3(0, 0.09, 0));
      tile.rotation.y = Math.atan2(startSample.tangent.x, startSample.tangent.z);
      this.group.add(tile);
    }
  }

  private buildGuardRails(): void {
    const railMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.fence, roughness: 0.66 });
    const postMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.fencePost, roughness: 0.72 });
    const capMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.fenceCap, roughness: 0.72 });
    const railStep = 3;

    // 1. Generate raw offset polyline for left (-1) and right (+1)
    const rawLeft: THREE.Vector3[] = [];
    const rawRight: THREE.Vector3[] = [];
    for (let i = 0; i < this.samples.length; i += railStep) {
      const sample = this.samples[i];
      rawLeft.push(sample.position.clone().addScaledVector(sample.lateral, -this.fenceLimit));
      rawRight.push(sample.position.clone().addScaledVector(sample.lateral, this.fenceLimit));
    }

    // 2. Untangle loops at sharp corners into clean Miter Apex vertices (锐角转折点)
    const leftPoints = this.untangleFencePolyline(rawLeft);
    const rightPoints = this.untangleFencePolyline(rawRight);
    const instanceCount = leftPoints.length + rightPoints.length;

    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 1.08, 0.24), postMaterial, instanceCount);
    const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), capMaterial, instanceCount);
    const upperRails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.18, 1), railMaterial, instanceCount);
    const lowerRails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.1, 1), railMaterial, instanceCount);
    for (const mesh of [posts, caps, upperRails, lowerRails]) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      this.group.add(mesh);
    }

    const transform = new THREE.Object3D();
    let instance = 0;

    for (const polyline of [leftPoints, rightPoints]) {
      const count = polyline.length;
      for (let i = 0; i < count; i += 1) {
        const postPosition = polyline[i];
        const nextPostPosition = polyline[(i + 1) % count];
        const segment = nextPostPosition.clone().sub(postPosition);
        const midpoint = postPosition.clone().lerp(nextPostPosition, 0.5);
        const railYaw = Math.atan2(segment.x, segment.z);
        const railPitch = Math.atan2(-segment.y, Math.hypot(segment.x, segment.z));

        transform.position.copy(postPosition).add(new THREE.Vector3(0, 0.54, 0));
        transform.rotation.set(0, 0, 0);
        transform.scale.setScalar(1);
        transform.updateMatrix();
        posts.setMatrixAt(instance, transform.matrix);

        transform.position.copy(postPosition).add(new THREE.Vector3(0, 1.12, 0));
        transform.updateMatrix();
        caps.setMatrixAt(instance, transform.matrix);

        transform.position.copy(midpoint).add(new THREE.Vector3(0, 0.82, 0));
        transform.rotation.set(railPitch, railYaw, 0, 'YXZ');
        transform.scale.set(1, 1, segment.length() + 0.12);
        transform.updateMatrix();
        upperRails.setMatrixAt(instance, transform.matrix);

        transform.position.copy(midpoint).add(new THREE.Vector3(0, 0.48, 0));
        transform.scale.set(1, 1, segment.length() + 0.12);
        transform.updateMatrix();
        lowerRails.setMatrixAt(instance, transform.matrix);
        instance += 1;
      }
    }
    posts.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    upperRails.instanceMatrix.needsUpdate = true;
    lowerRails.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
    this.group.clear();
  }
}
