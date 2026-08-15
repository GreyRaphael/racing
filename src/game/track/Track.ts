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

  getPose(progress: number, lateralOffset = 0): { position: THREE.Vector3; tangent: THREE.Vector3; yaw: number } {
    const sample = this.getSampleAtProgress(progress);
    const position = sample.position.clone().addScaledVector(sample.lateral, lateralOffset);
    // Kart visuals point along local -Z, so this yaw makes their nose follow the tangent.
    const yaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);
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

      const base = i * 2;
      const nextBase = ((i + 1) % this.samples.length) * 2;
      // The left/right ribbon must wind counter-clockwise when viewed from above.
      // The previous order produced downward normals, so the road was back-face culled.
      roadIndices.push(base, base + 1, nextBase, base + 1, nextBase + 1, nextBase);
      const leftEdge = sample.position.clone().addScaledVector(sample.lateral, -(half + edgeWidth));
      const rightEdge = sample.position.clone().addScaledVector(sample.lateral, half + edgeWidth);
      // Four vertices make two narrow shoulder strips. Building outer-left to outer-right
      // here would cover the entire asphalt ribbon with the shoulder material.
      edgePositions.push(
        leftEdge.x, 0.055, leftEdge.z,
        left.x, 0.058, left.z,
        right.x, 0.058, right.z,
        rightEdge.x, 0.055, rightEdge.z,
      );
      const edgeBase = i * 4;
      const edgeNext = ((i + 1) % this.samples.length) * 4;
      edgeIndices.push(edgeBase, edgeBase + 1, edgeNext, edgeBase + 1, edgeNext + 1, edgeNext);
      edgeIndices.push(edgeBase + 2, edgeBase + 3, edgeNext + 2, edgeBase + 3, edgeNext + 3, edgeNext + 2);
    }

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    const roadNormals = new Float32Array(roadPositions.length);
    for (let i = 0; i < roadPositions.length; i += 3) {
      roadNormals[i] = 0;
      roadNormals[i + 1] = 1;
      roadNormals[i + 2] = 0;
    }
    roadGeometry.setAttribute('normal', new THREE.BufferAttribute(roadNormals, 3));
    roadGeometry.setIndex(roadIndices);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: this.config.theme.road,
      roughness: 0.88,
      metalness: 0,
      side: THREE.FrontSide,
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.receiveShadow = true;
    this.group.add(road);

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgeNormals = new Float32Array(edgePositions.length);
    for (let i = 0; i < edgePositions.length; i += 3) {
      edgeNormals[i] = 0;
      edgeNormals[i + 1] = 1;
      edgeNormals[i + 2] = 0;
    }
    edgeGeometry.setAttribute('normal', new THREE.BufferAttribute(edgeNormals, 3));
    edgeGeometry.setIndex(edgeIndices);
    const edge = new THREE.Mesh(
      edgeGeometry,
      new THREE.MeshStandardMaterial({ color: this.config.theme.roadEdge, roughness: 0.82, side: THREE.FrontSide }),
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
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 1.5), markerMaterial);
      marker.position.copy(sample.position).setY(0.07);
      // The marker depth is local +Z, unlike the kart nose.
      marker.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
      this.group.add(marker);
    }

    const startSample = this.samples[0];
    for (let i = -4; i < 4; i += 1) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.035, 1.4),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xfaf7e9 : this.config.theme.fencePost, roughness: 0.75 }),
      );
      tile.position.copy(startSample.position).addScaledVector(startSample.lateral, i * 1.13).setY(0.09);
      tile.rotation.y = Math.atan2(startSample.tangent.x, startSample.tangent.z);
      this.group.add(tile);
    }
  }

  private buildGuardRails(): void {
    const railMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.fence, roughness: 0.66 });
    const postMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.fencePost, roughness: 0.72 });
    const capMaterial = new THREE.MeshStandardMaterial({ color: this.config.theme.fenceCap, roughness: 0.72 });
    const railOffset = this.fenceLimit;
    // Connect every post to the next post. The old 15/5 step mismatch left two thirds
    // of every rail side open, especially noticeable on the long bends.
    const railStep = 6;
    const segmentCount = this.samples.length / railStep;
    const instanceCount = segmentCount * 2;
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
    for (let i = 0; i < this.samples.length; i += railStep) {
      const sample = this.samples[i];
      const next = this.samples[(i + railStep) % this.samples.length];
      for (const side of [-1, 1]) {
        const postPosition = sample.position.clone().addScaledVector(sample.lateral, side * railOffset);
        const nextPostPosition = next.position.clone().addScaledVector(next.lateral, side * railOffset);
        const segment = nextPostPosition.clone().sub(postPosition);
        const midpoint = postPosition.clone().lerp(nextPostPosition, 0.5);
        // Rail geometry is elongated along local +Z, so align +Z with the segment.
        const railYaw = Math.atan2(segment.x, segment.z);

        transform.position.copy(postPosition).setY(0.54);
        transform.rotation.set(0, 0, 0);
        transform.scale.setScalar(1);
        transform.updateMatrix();
        posts.setMatrixAt(instance, transform.matrix);

        transform.position.copy(postPosition).setY(1.12);
        transform.updateMatrix();
        caps.setMatrixAt(instance, transform.matrix);

        transform.position.copy(midpoint).setY(0.82);
        transform.rotation.set(0, railYaw, 0);
        transform.scale.set(1, 1, segment.length() + 0.16);
        transform.updateMatrix();
        upperRails.setMatrixAt(instance, transform.matrix);

        transform.position.copy(midpoint).setY(0.48);
        transform.scale.set(1, 1, segment.length() + 0.16);
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
