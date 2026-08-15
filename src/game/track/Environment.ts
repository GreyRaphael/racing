import * as THREE from 'three';
import { COLORS, TrackConfig } from '../constants';
import { Track } from './Track';

export class Environment {
  readonly group = new THREE.Group();
  private readonly config: TrackConfig;

  constructor(private readonly track: Track) {
    this.config = track.config;
    this.buildGround();
    if (this.config.id === 'desert') {
      this.buildDesertScenery();
      this.buildDesertStartArch();
    } else if (this.config.id === 'snow') {
      this.buildSnowScenery();
      this.buildSnowStartArch();
    } else {
      this.buildMeadowScenery();
      this.buildMeadowStartArch();
    }
  }

  private buildGround(): void {
    const isDesert = this.config.id === 'desert';
    const isSnow = this.config.id === 'snow';
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(190, 190),
      new THREE.MeshStandardMaterial({ color: this.config.theme.ground, roughness: isSnow ? 0.88 : 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);

    const patches = new THREE.Group();
    const patchMaterial = new THREE.MeshStandardMaterial({
      color: this.config.theme.groundPatches,
      roughness: 1,
      transparent: true,
      opacity: isDesert ? 0.38 : 0.28,
    });
    for (let i = 0; i < 32; i += 1) {
      const angle = i * 2.399;
      const radius = 13 + (i * 17) % 58;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.6 + (i % 5) * 0.8, 7), patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(Math.cos(angle) * radius, 0.005, Math.sin(angle) * radius);
      patch.scale.set(isDesert ? 2.2 : 1.7, 1, 0.65 + (i % 3) * 0.2);
      patches.add(patch);
    }
    this.group.add(patches);
  }

  private isClearOfTrack(position: THREE.Vector3, minClearance = 8.5): boolean {
    const query = this.track.getNearest(position);
    return query.distanceToCenter >= minClearance && Math.abs(query.lateralOffset) >= minClearance;
  }

  // --- Meadow Theme Props ---
  private buildMeadowScenery(): void {
    const scenery = new THREE.Group();
    for (let i = 0; i < 34; i += 1) {
      const progress = (i * 0.095 + 0.03) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      const offset = 9.8 + (i % 5) * 2.4;
      let pose = this.track.getPose(progress, side * offset);
      if (!this.isClearOfTrack(pose.position, 8.5)) {
        pose = this.track.getPose(progress, -side * offset);
      }
      if (!this.isClearOfTrack(pose.position, 8.5)) continue;

      const choice = i % 5;
      if (choice <= 2) {
        scenery.add(this.createMeadowTree(pose.position, 0.8 + (i % 4) * 0.15));
      } else if (choice === 3) {
        scenery.add(this.createMeadowRock(pose.position, 0.8 + (i % 3) * 0.25));
      } else {
        scenery.add(this.createMeadowFlowers(pose.position, i));
      }
    }

    for (let i = 0; i < 14; i += 1) {
      const angle = i * 2.17;
      const radius = 59 + (i % 3) * 3;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 9.0)) continue;
      scenery.add(this.createMeadowTree(pos, 1.25));
    }
    this.group.add(scenery);
  }

  private createMeadowTree(position: THREE.Vector3, scale: number): THREE.Group {
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

  private createMeadowRock(position: THREE.Vector3, scale: number): THREE.Mesh {
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

  private createMeadowFlowers(position: THREE.Vector3, seed: number): THREE.Group {
    const flowers = new THREE.Group();
    flowers.position.copy(position);
    for (let i = 0; i < 5; i += 1) {
      const flower = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.13, 0),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? COLORS.flowerPink : seed % 2 ? COLORS.flowerYellow : COLORS.flowerWhite,
          flatShading: true,
        }),
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

  private buildMeadowStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
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

  // --- Desert Theme Props ---
  private buildDesertScenery(): void {
    const scenery = new THREE.Group();

    // 1. Surrounding Cacti, Palms & Canyon Rocks along the track
    for (let i = 0; i < 40; i += 1) {
      const progress = (i * 0.087 + 0.025) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      const offset = 9.6 + (i % 4) * 2.6;
      let pose = this.track.getPose(progress, side * offset);
      if (!this.isClearOfTrack(pose.position, 8.8)) {
        pose = this.track.getPose(progress, -side * offset);
      }
      if (!this.isClearOfTrack(pose.position, 8.8)) continue;

      const type = i % 5;
      if (type === 0 || type === 2) {
        scenery.add(this.createCactus(pose.position, 0.85 + (i % 3) * 0.25, i));
      } else if (type === 1) {
        scenery.add(this.createDesertPalm(pose.position, 0.9 + (i % 3) * 0.2));
      } else if (type === 3) {
        scenery.add(this.createCanyonRock(pose.position, 0.9 + (i % 4) * 0.35));
      } else {
        scenery.add(this.createTumbleweed(pose.position, i));
      }
    }

    // 2. Oasis Area in wide open infield (safely cleared of all track segments)
    const oasisCenter = new THREE.Vector3(-2, 0, -8);
    if (this.isClearOfTrack(oasisCenter, 15)) {
      scenery.add(this.createOasis(oasisCenter));
    }

    // 3. Distant desert dunes and giant canyon rock formations
    for (let i = 0; i < 16; i += 1) {
      const angle = i * 2.05;
      const radius = 58 + (i % 4) * 4;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 9.0)) continue;
      if (i % 2 === 0) {
        scenery.add(this.createCanyonRock(pos, 1.8 + (i % 3) * 0.6));
      } else {
        scenery.add(this.createCactus(pos, 1.4 + (i % 3) * 0.3, i));
      }
    }
    this.group.add(scenery);
  }

  private createCactus(position: THREE.Vector3, scale: number, seed: number): THREE.Group {
    const cactus = new THREE.Group();
    cactus.position.copy(position);
    cactus.scale.setScalar(scale);

    const cactusMaterial = new THREE.MeshStandardMaterial({
      color: seed % 3 === 0 ? COLORS.cactusDark : COLORS.cactus,
      roughness: 0.82,
      flatShading: true,
    });

    // Main central trunk
    const trunkHeight = 3.6 + (seed % 3) * 0.6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, trunkHeight, 7), cactusMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    cactus.add(trunk);

    // Left arm
    const leftArmHeight = trunkHeight * 0.45;
    const leftHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 6), cactusMaterial);
    leftHoriz.rotation.z = Math.PI / 2;
    leftHoriz.position.set(-0.6, leftArmHeight, 0);
    leftHoriz.castShadow = true;
    cactus.add(leftHoriz);

    const leftVert = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.3, 6), cactusMaterial);
    leftVert.position.set(-1.0, leftArmHeight + 0.55, 0);
    leftVert.castShadow = true;
    cactus.add(leftVert);

    // Right arm (higher)
    if (seed % 4 !== 0) {
      const rightArmHeight = trunkHeight * 0.62;
      const rightHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.75, 6), cactusMaterial);
      rightHoriz.rotation.z = Math.PI / 2;
      rightHoriz.position.set(0.58, rightArmHeight, 0);
      rightHoriz.castShadow = true;
      cactus.add(rightHoriz);

      const rightVert = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.1, 6), cactusMaterial);
      rightVert.position.set(0.95, rightArmHeight + 0.45, 0);
      rightVert.castShadow = true;
      cactus.add(rightVert);
    }

    cactus.rotation.y = (seed * 1.7) % (Math.PI * 2);
    return cactus;
  }

  private createDesertPalm(position: THREE.Vector3, scale: number): THREE.Group {
    const palm = new THREE.Group();
    palm.position.copy(position);
    palm.scale.setScalar(scale);

    const trunkMaterial = new THREE.MeshStandardMaterial({ color: COLORS.palmTrunk, roughness: 0.95, flatShading: true });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: COLORS.palmLeaf, roughness: 0.75, flatShading: true });

    // Segmented curved trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 4.4, 6), trunkMaterial);
    trunk.position.set(0.2, 2.1, 0);
    trunk.rotation.z = -0.09;
    trunk.castShadow = true;
    palm.add(trunk);

    // Spreading palm fronds
    const fronds = new THREE.Group();
    fronds.position.set(0.4, 4.25, 0);
    for (let i = 0; i < 7; i += 1) {
      const frondAngle = (i / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.72, 2.6, 4), leafMaterial);
      leaf.scale.set(1, 0.22, 1);
      leaf.rotation.set(0.8, frondAngle, 0);
      leaf.position.set(Math.sin(frondAngle) * 0.9, -0.2, Math.cos(frondAngle) * 0.9);
      leaf.castShadow = true;
      fronds.add(leaf);
    }
    palm.add(fronds);
    return palm;
  }

  private createCanyonRock(position: THREE.Vector3, scale: number): THREE.Mesh {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.35, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.canyonRock, flatShading: true, roughness: 0.88 }),
    );
    rock.position.copy(position).setY(0.85);
    rock.scale.set(scale * 1.4, scale * 0.85, scale * 1.15);
    rock.rotation.set(0.12, position.x * 0.06, 0.08);
    rock.castShadow = true;
    return rock;
  }

  private createTumbleweed(position: THREE.Vector3, seed: number): THREE.Group {
    const weed = new THREE.Group();
    weed.position.copy(position);
    const material = new THREE.MeshStandardMaterial({ color: 0xb58852, roughness: 1, flatShading: true });
    const count = 3 + (seed % 3);
    for (let i = 0; i < count; i += 1) {
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 + (i % 2) * 0.12, 0), material);
      ball.position.set(Math.sin(i * 1.9) * 0.35, 0.22 + (i % 2) * 0.15, Math.cos(i * 1.9) * 0.35);
      ball.castShadow = true;
      weed.add(ball);
    }
    return weed;
  }

  private createOasis(position: THREE.Vector3): THREE.Group {
    const oasis = new THREE.Group();
    oasis.position.copy(position);

    // Water pool
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 16),
      new THREE.MeshStandardMaterial({
        color: COLORS.oasisWater,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.88,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.03;
    oasis.add(water);

    // Palm cluster around oasis
    for (let i = 0; i < 4; i += 1) {
      const angle = (i * Math.PI) / 2 + 0.3;
      const palmLocal = new THREE.Vector3(Math.cos(angle) * 5.5, 0, Math.sin(angle) * 5.5);
      const palmWorld = position.clone().add(palmLocal);
      if (this.isClearOfTrack(palmWorld, 8.5)) {
        oasis.add(this.createDesertPalm(palmLocal, 1.0 + (i % 2) * 0.2));
      }
    }
    return oasis;
  }

  private buildDesertStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;

    const stoneMaterial = new THREE.MeshStandardMaterial({ color: COLORS.desertPost, roughness: 0.88, flatShading: true });
    const beamMaterial = new THREE.MeshStandardMaterial({ color: COLORS.desertCap, roughness: 0.78, flatShading: true });

    // Sandstone pillars
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 5.8, 0.75), stoneMaterial);
    leftPillar.position.set(-5.8, 2.9, 0);
    leftPillar.castShadow = true;
    arch.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 5.8;
    arch.add(rightPillar);

    // Golden Sandstone Crossbeam
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.85, 0.85), beamMaterial);
    topBeam.position.y = 5.5;
    topBeam.castShadow = true;
    arch.add(topBeam);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.65, 0.92),
      new THREE.MeshStandardMaterial({ color: COLORS.desertPost, flatShading: true }),
    );
    sign.position.set(0, 5.5, 0);
    arch.add(sign);

    this.group.add(arch);
  }

  // --- Snow Theme Props ---
  private buildSnowScenery(): void {
    const scenery = new THREE.Group();

    // 1. Surrounding Snow Pines, Ice Crystals, Frost Rocks, Snowmen & Shrubs
    for (let i = 0; i < 42; i += 1) {
      const progress = (i * 0.086 + 0.02) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      const offset = 9.5 + (i % 4) * 2.5;
      let pose = this.track.getPose(progress, side * offset);
      if (!this.isClearOfTrack(pose.position, 8.8)) {
        pose = this.track.getPose(progress, -side * offset);
      }
      if (!this.isClearOfTrack(pose.position, 8.8)) continue;

      const type = i % 5;
      if (type === 0 || type === 2) {
        scenery.add(this.createSnowPine(pose.position, 0.85 + (i % 3) * 0.2));
      } else if (type === 1) {
        scenery.add(this.createIceCrystal(pose.position, 0.85 + (i % 3) * 0.25, i));
      } else if (type === 3) {
        scenery.add(this.createFrostRock(pose.position, 0.9 + (i % 4) * 0.3));
      } else {
        scenery.add(this.createSnowman(pose.position, 0.9 + (i % 2) * 0.15));
      }
    }

    // 2. Frozen Ice Lake in wide open infield (safely cleared of all track segments)
    const iceLakeCenter = new THREE.Vector3(-2, 0, -6);
    if (this.isClearOfTrack(iceLakeCenter, 15)) {
      scenery.add(this.createIceLake(iceLakeCenter));
    }

    // 3. Distant snowy peaks and giant glacial ice crystals
    for (let i = 0; i < 16; i += 1) {
      const angle = i * 2.05;
      const radius = 58 + (i % 4) * 4;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 9.0)) continue;
      if (i % 2 === 0) {
        scenery.add(this.createFrostRock(pos, 2.0 + (i % 3) * 0.7));
      } else {
        scenery.add(this.createSnowPine(pos, 1.4 + (i % 3) * 0.35));
      }
    }
    this.group.add(scenery);
  }

  private createSnowPine(position: THREE.Vector3, scale: number): THREE.Group {
    const pine = new THREE.Group();
    pine.position.copy(position);
    pine.scale.setScalar(scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.38, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: COLORS.snowPineTrunk, roughness: 1 }),
    );
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    pine.add(trunk);

    const leafMaterial = new THREE.MeshStandardMaterial({ color: COLORS.snowPineLeaf, flatShading: true, roughness: 0.9 });
    const snowMaterial = new THREE.MeshStandardMaterial({ color: COLORS.snowWhite, flatShading: true, roughness: 0.85 });

    // Tier 1 (bottom)
    const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.9, 7), leafMaterial);
    tier1.position.y = 2.4;
    tier1.castShadow = true;
    pine.add(tier1);
    const snowCap1 = new THREE.Mesh(new THREE.ConeGeometry(1.76, 0.72, 7), snowMaterial);
    snowCap1.position.y = 2.95;
    snowCap1.castShadow = true;
    pine.add(snowCap1);

    // Tier 2 (middle)
    const tier2 = new THREE.Mesh(new THREE.ConeGeometry(1.32, 1.7, 7), leafMaterial);
    tier2.position.y = 3.65;
    tier2.castShadow = true;
    pine.add(tier2);
    const snowCap2 = new THREE.Mesh(new THREE.ConeGeometry(1.38, 0.65, 7), snowMaterial);
    snowCap2.position.y = 4.15;
    snowCap2.castShadow = true;
    pine.add(snowCap2);

    // Tier 3 (top)
    const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.92, 1.45, 7), leafMaterial);
    tier3.position.y = 4.8;
    tier3.castShadow = true;
    pine.add(tier3);
    const snowCap3 = new THREE.Mesh(new THREE.ConeGeometry(0.96, 0.6, 7), snowMaterial);
    snowCap3.position.y = 5.2;
    snowCap3.castShadow = true;
    pine.add(snowCap3);

    return pine;
  }

  private createIceCrystal(position: THREE.Vector3, scale: number, seed: number): THREE.Group {
    const crystalGroup = new THREE.Group();
    crystalGroup.position.copy(position);
    crystalGroup.scale.setScalar(scale);

    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: seed % 2 === 0 ? COLORS.iceCrystal : COLORS.iceCrystalLight,
      roughness: 0.16,
      metalness: 0.15,
      transparent: true,
      opacity: 0.86,
      flatShading: true,
    });

    // Main central spire
    const mainSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.48, 3.4, 5), crystalMaterial);
    mainSpire.position.y = 1.7;
    mainSpire.rotation.set(0.08, (seed * 1.3) % Math.PI, 0.05);
    mainSpire.castShadow = true;
    crystalGroup.add(mainSpire);

    // Side crystal spires
    const side1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.32, 2.2, 5), crystalMaterial);
    side1.position.set(-0.38, 1.0, 0.2);
    side1.rotation.set(0.18, 0.8, -0.22);
    side1.castShadow = true;
    crystalGroup.add(side1);

    const side2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.28, 1.8, 5), crystalMaterial);
    side2.position.set(0.35, 0.85, -0.25);
    side2.rotation.set(-0.15, -0.6, 0.25);
    side2.castShadow = true;
    crystalGroup.add(side2);

    return crystalGroup;
  }

  private createFrostRock(position: THREE.Vector3, scale: number): THREE.Group {
    const rockGroup = new THREE.Group();
    rockGroup.position.copy(position);
    rockGroup.scale.setScalar(scale);

    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.3, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.snowRock, flatShading: true, roughness: 0.92 }),
    );
    rock.position.y = 0.85;
    rock.scale.set(1.35, 0.82, 1.15);
    rock.rotation.set(0.1, position.x * 0.07, 0.08);
    rock.castShadow = true;
    rockGroup.add(rock);

    // Snow layer on top of rock
    const snowLayer = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.05, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.snowWhite, flatShading: true, roughness: 0.88 }),
    );
    snowLayer.position.set(0, 1.32, 0);
    snowLayer.scale.set(1.22, 0.38, 1.05);
    snowLayer.castShadow = true;
    rockGroup.add(snowLayer);

    return rockGroup;
  }

  private createSnowman(position: THREE.Vector3, scale: number): THREE.Group {
    const snowman = new THREE.Group();
    snowman.position.copy(position);
    snowman.scale.setScalar(scale);

    const snowMaterial = new THREE.MeshStandardMaterial({ color: COLORS.snowWhite, roughness: 0.85 });
    const coalMaterial = new THREE.MeshStandardMaterial({ color: COLORS.coalBlack, roughness: 0.9 });
    const carrotMaterial = new THREE.MeshStandardMaterial({ color: COLORS.carrotOrange, roughness: 0.8 });
    const scarfMaterial = new THREE.MeshStandardMaterial({ color: COLORS.scarfRed, roughness: 0.85 });

    // Lower snowball
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.72, 8, 8), snowMaterial);
    base.position.y = 0.62;
    base.castShadow = true;
    snowman.add(base);

    // Head snowball
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), snowMaterial);
    head.position.y = 1.55;
    head.castShadow = true;
    snowman.add(head);

    // Scarf
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 5, 8), scarfMaterial);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.25;
    scarf.castShadow = true;
    snowman.add(scarf);

    // Carrot nose
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 5), carrotMaterial);
    carrot.rotation.x = Math.PI / 2;
    carrot.position.set(0, 1.55, 0.52);
    carrot.castShadow = true;
    snowman.add(carrot);

    // Coal eyes
    const leftEye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), coalMaterial);
    leftEye.position.set(-0.16, 1.68, 0.44);
    snowman.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), coalMaterial);
    rightEye.position.set(0.16, 1.68, 0.44);
    snowman.add(rightEye);

    // Coal buttons
    for (let i = 0; i < 3; i += 1) {
      const button = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), coalMaterial);
      button.position.set(0, 0.88 - i * 0.22, 0.66 - i * 0.04);
      snowman.add(button);
    }

    return snowman;
  }

  private createIceLake(position: THREE.Vector3): THREE.Group {
    const lake = new THREE.Group();
    lake.position.copy(position);

    // Frozen ice sheet
    const ice = new THREE.Mesh(
      new THREE.CircleGeometry(5.8, 16),
      new THREE.MeshStandardMaterial({
        color: COLORS.snowLake,
        roughness: 0.12,
        metalness: 0.18,
        transparent: true,
        opacity: 0.88,
      }),
    );
    ice.rotation.x = -Math.PI / 2;
    ice.position.y = 0.03;
    lake.add(ice);

    // Surrounding pines & ice crystals
    for (let i = 0; i < 4; i += 1) {
      const angle = (i * Math.PI) / 2 + 0.35;
      const pineLocal = new THREE.Vector3(Math.cos(angle) * 5.6, 0, Math.sin(angle) * 5.6);
      const pineWorld = position.clone().add(pineLocal);
      if (this.isClearOfTrack(pineWorld, 8.5)) {
        lake.add(this.createSnowPine(pineLocal, 1.0 + (i % 2) * 0.2));
      }
    }
    return lake;
  }

  private buildSnowStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;

    const stoneMaterial = new THREE.MeshStandardMaterial({ color: COLORS.snowPost, roughness: 0.85, flatShading: true });
    const beamMaterial = new THREE.MeshStandardMaterial({ color: COLORS.snowWhite, roughness: 0.75, flatShading: true });

    // Arctic Navy Pillars
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 5.8, 0.75), stoneMaterial);
    leftPillar.position.set(-5.8, 2.9, 0);
    leftPillar.castShadow = true;
    arch.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 5.8;
    arch.add(rightPillar);

    // Frosted Snow Crossbeam
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.85, 0.85), beamMaterial);
    topBeam.position.y = 5.5;
    topBeam.castShadow = true;
    arch.add(topBeam);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.65, 0.92),
      new THREE.MeshStandardMaterial({ color: COLORS.snowCap, flatShading: true }),
    );
    sign.position.set(0, 5.5, 0);
    arch.add(sign);

    this.group.add(arch);
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
