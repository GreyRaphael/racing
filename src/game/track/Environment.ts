import * as THREE from 'three';
import { COLORS } from '../constants';
import { Track } from './Track';

export class Environment {
  readonly group = new THREE.Group();

  constructor(private readonly track: Track) {
    this.buildGround();
    this.buildScenery();
    this.buildStartArch();
  }

  private buildGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);

    const patches = new THREE.Group();
    const patchMaterial = new THREE.MeshStandardMaterial({ color: COLORS.grassLight, roughness: 1, transparent: true, opacity: 0.28 });
    for (let i = 0; i < 28; i += 1) {
      const angle = i * 2.399;
      const radius = 14 + (i * 17) % 54;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.5 + (i % 4), 7), patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(Math.cos(angle) * radius, 0.005, Math.sin(angle) * radius);
      patch.scale.set(1.7, 1, 0.65 + (i % 3) * 0.15);
      patches.add(patch);
    }
    this.group.add(patches);
  }

  private buildScenery(): void {
    const scenery = new THREE.Group();
    for (let i = 0; i < 30; i += 1) {
      const progress = (i * 0.137 + 0.03) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      const offset = 10.5 + (i % 5) * 2.8;
      const pose = this.track.getPose(progress, side * offset);
      const choice = i % 5;
      if (choice <= 2) {
        scenery.add(this.createTree(pose.position, 0.8 + (i % 4) * 0.15));
      } else if (choice === 3) {
        scenery.add(this.createRock(pose.position, 0.8 + (i % 3) * 0.25));
      } else {
        scenery.add(this.createFlowers(pose.position, i));
      }
    }

    for (let i = 0; i < 14; i += 1) {
      const angle = i * 2.17;
      const radius = 59 + (i % 3) * 3;
      scenery.add(this.createTree(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius), 1.25));
    }
    this.group.add(scenery);
  }

  private createTree(position: THREE.Vector3, scale: number): THREE.Group {
    const tree = new THREE.Group();
    tree.position.copy(position);
    tree.scale.setScalar(scale);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.38, 2.2, 6),
      new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 }),
    );
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    tree.add(trunk);
    const lower = new THREE.Mesh(
      new THREE.ConeGeometry(1.55, 2.45, 7),
      new THREE.MeshStandardMaterial({ color: COLORS.leaf, flatShading: true, roughness: 1 }),
    );
    lower.position.y = 2.45;
    lower.castShadow = true;
    tree.add(lower);
    const upper = new THREE.Mesh(
      new THREE.ConeGeometry(1.15, 2.1, 7),
      new THREE.MeshStandardMaterial({ color: COLORS.leafLight, flatShading: true, roughness: 1 }),
    );
    upper.position.y = 3.85;
    upper.castShadow = true;
    tree.add(upper);
    return tree;
  }

  private createRock(position: THREE.Vector3, scale: number): THREE.Mesh {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.rock, flatShading: true, roughness: 1 }),
    );
    rock.position.copy(position).setY(0.7);
    rock.scale.set(scale * 1.25, scale * 0.72, scale);
    rock.rotation.set(0.1, position.x * 0.08, 0.08);
    rock.castShadow = true;
    return rock;
  }

  private createFlowers(position: THREE.Vector3, seed: number): THREE.Group {
    const flowers = new THREE.Group();
    flowers.position.copy(position);
    for (let i = 0; i < 5; i += 1) {
      const flower = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.13, 0),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? COLORS.flowerPink : seed % 2 ? COLORS.flowerYellow : COLORS.flowerWhite, flatShading: true }),
      );
      flower.position.set(Math.sin(i * 2.4) * 0.65, 0.45 + (i % 2) * 0.15, Math.cos(i * 2.4) * 0.65);
      flowers.add(flower);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x4b9858 }),
      );
      stem.position.set(flower.position.x, 0.22, flower.position.z);
      flowers.add(stem);
    }
    return flowers;
  }

  private buildStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, -sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;
    const postMaterial = new THREE.MeshStandardMaterial({ color: COLORS.red, roughness: 0.75 });
    const bannerMaterial = new THREE.MeshStandardMaterial({ color: COLORS.yellow, roughness: 0.75 });
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.6, 0.55), postMaterial);
    leftPost.position.set(-5.7, 2.8, 0);
    leftPost.castShadow = true;
    arch.add(leftPost);
    const rightPost = leftPost.clone();
    rightPost.position.x = 5.7;
    arch.add(rightPost);
    const top = new THREE.Mesh(new THREE.BoxGeometry(12, 0.72, 0.6), bannerMaterial);
    top.position.y = 5.35;
    top.castShadow = true;
    arch.add(top);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.58, 0.66), new THREE.MeshStandardMaterial({ color: COLORS.red }));
    sign.position.set(0, 5.35, 0);
    arch.add(sign);
    this.group.add(arch);
  }
}
