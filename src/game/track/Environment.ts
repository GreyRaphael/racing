import * as THREE from 'three';
import { COLORS, TrackConfig } from '../constants';
import { Track } from './Track';

export class Environment {
  readonly group = new THREE.Group();
  private readonly config: TrackConfig;

  constructor(private readonly track: Track) {
    this.config = track.config;
    this.buildSkyDome();
    this.buildGround();
    this.buildDistantMountains();
    this.buildClouds();
    if (this.config.id === 'desert') {
      this.buildDesertScenery();
      this.buildDesertStartArch();
    } else if (this.config.id === 'snow') {
      this.buildSnowScenery();
      this.buildSnowStartArch();
    } else if (this.config.id === 'atoll') {
      this.buildAtollScenery();
      this.buildAtollStartArch();
    } else if (this.config.id === 'autumn') {
      this.buildAutumnScenery();
      this.buildAutumnStartArch();
    } else if (this.config.id === 'lava') {
      this.buildLavaScenery();
      this.buildLavaStartArch();
    } else if (this.config.id === 'sakura') {
      this.buildSakuraScenery();
      this.buildSakuraStartArch();
    } else {
      this.buildMeadowScenery();
      this.buildMeadowStartArch();
    }
  }

  private buildSkyDome(): void {
    const radius = 560;
    const geometry = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const pos = geometry.attributes.position;
    const cZenith = new THREE.Color(this.config.theme.skyZenith);
    const cHorizon = new THREE.Color(this.config.theme.skyHorizon);

    for (let i = 0; i < count; i += 1) {
      const y = pos.getY(i);
      const t = Math.max(0, Math.min(1, y / radius));
      const col = new THREE.Color();
      col.lerpColors(cHorizon, cZenith, Math.pow(t, 0.42));
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyDome = new THREE.Mesh(geometry, material);
    skyDome.position.y = -4;
    this.group.add(skyDome);
  }

  private buildGround(): void {
    const isDesert = this.config.id === 'desert';
    const isSnow = this.config.id === 'snow';
    const isLava = this.config.id === 'lava';

    // 1. Inner Ground (receives shadows from karts and scenery)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: this.config.theme.ground, roughness: isSnow || isLava ? 0.88 : 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);

    // 2. Outer Extended Horizon Ground Ring (seamlessly extends to 560m horizon, 0 shadow overhead)
    const outerGround = new THREE.Mesh(
      new THREE.RingGeometry(118, 560, 32, 2),
      new THREE.MeshBasicMaterial({ color: this.config.theme.ground }),
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.03;
    outerGround.receiveShadow = false;
    outerGround.castShadow = false;
    this.group.add(outerGround);

    // 3. Ground detail color patches
    const patches = new THREE.Group();
    const patchMaterial = new THREE.MeshStandardMaterial({
      color: this.config.theme.groundPatches,
      roughness: 1,
      transparent: true,
      opacity: isDesert ? 0.38 : isLava ? 0.45 : 0.28,
    });
    for (let i = 0; i < 32; i += 1) {
      const angle = i * 2.399;
      const radius = 13 + (i * 17) % 58;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.6 + (i % 5) * 0.8, 7), patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(Math.cos(angle) * radius, 0.005, Math.sin(angle) * radius);
      patch.scale.set(isDesert || isLava ? 2.2 : 1.7, 1, 0.65 + (i % 3) * 0.2);
      patches.add(patch);
    }
    this.group.add(patches);
  }

  private buildDistantMountains(): void {
    const isDesert = this.config.id === 'desert';
    const isSnow = this.config.id === 'snow';
    const isLava = this.config.id === 'lava';
    const isSakura = this.config.id === 'sakura';
    const isAtoll = this.config.id === 'atoll';
    const isAutumn = this.config.id === 'autumn';
    const group = new THREE.Group();
    const nearMat = new THREE.MeshLambertMaterial({ color: this.config.theme.mountainNear, flatShading: true });
    const farMat = new THREE.MeshLambertMaterial({ color: this.config.theme.mountainFar, flatShading: true });

    // Layer 1: Mid-Distant Foothills / Mesas / Alpine Peaks / Volcanic Cones (Radius 220m - 270m)
    const nearCount = 22;
    for (let i = 0; i < nearCount; i += 1) {
      const angle = (i / nearCount) * Math.PI * 2 + (i % 3) * 0.08;
      const r = 225 + (i % 4) * 12;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const height = 38 + (i % 5) * 14;
      const baseR = 32 + (i % 4) * 9;

      let geom: THREE.BufferGeometry;
      if (isDesert) {
        // Sandstone mesas and canyon buttes
        const topR = baseR * (0.42 + (i % 3) * 0.16);
        geom = new THREE.CylinderGeometry(topR, baseR, height, 6);
      } else if (isSnow || isLava) {
        // Alpine sharp jagged peaks or volcanic jagged calderas
        geom = new THREE.ConeGeometry(baseR, height * 1.35, 4 + (i % 2));
      } else if (isAtoll) {
        // Tropical ocean volcanic island cones
        geom = new THREE.ConeGeometry(baseR * 1.15, height * 0.85, 5 + (i % 2));
      } else if (isAutumn || isSakura) {
        // Serene mountain ridges
        geom = new THREE.ConeGeometry(baseR, height * 1.1, 5 + (i % 2));
      } else {
        // Rolling green foothills
        geom = new THREE.ConeGeometry(baseR, height, 5 + (i % 2));
      }

      const mesh = new THREE.Mesh(geom, nearMat);
      mesh.position.set(x, height / 2 - 2, z);
      mesh.rotation.y = angle + (i % 4);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);

      // Add snow-cap for snow mountains or Fuji silhouette
      if (isSnow || (isSakura && i % 4 === 0)) {
        const capGeom = new THREE.ConeGeometry(baseR * 0.42, height * 0.55, 4 + (i % 2));
        const cap = new THREE.Mesh(capGeom, new THREE.MeshLambertMaterial({ color: COLORS.snowWhite, flatShading: true }));
        cap.position.set(x, height * 0.95, z);
        cap.rotation.y = angle + (i % 4);
        cap.castShadow = false;
        cap.receiveShadow = false;
        group.add(cap);
      }
    }

    // Layer 2: Extreme Distant Panoramic Mountain Silhouettes (Radius 360m - 430m)
    const farCount = 28;
    for (let i = 0; i < farCount; i += 1) {
      const angle = (i / farCount) * Math.PI * 2 + (i % 2) * 0.06;
      const r = 375 + (i % 3) * 22;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const height = 70 + (i % 6) * 20;
      const baseR = 60 + (i % 4) * 15;
      const geom = new THREE.ConeGeometry(baseR, height, 4 + (i % 2));
      const mesh = new THREE.Mesh(geom, farMat);
      mesh.position.set(x, height / 2 - 5, z);
      mesh.rotation.y = angle * 2;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    }

    this.group.add(group);
  }

  private buildClouds(): void {
    const isDesert = this.config.id === 'desert';
    const isSnow = this.config.id === 'snow';
    const isLava = this.config.id === 'lava';
    const isAutumn = this.config.id === 'autumn';
    const isSakura = this.config.id === 'sakura';
    const clouds = new THREE.Group();
    const cloudColor = isDesert
      ? 0xfff0dd
      : isSnow
        ? 0xecf6fc
        : isLava
          ? 0x5a3232
          : isAutumn
            ? 0xffeed8
            : isSakura
              ? 0xfff0f6
              : 0xffffff;
    const cloudMat = new THREE.MeshBasicMaterial({ color: cloudColor, transparent: true, opacity: isLava ? 0.72 : 0.85 });

    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.2;
      const radius = 130 + (i * 37) % 150;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 65 + (i % 4) * 9;

      const cloudCluster = new THREE.Group();
      cloudCluster.position.set(x, y, z);
      const puffCount = 3 + (i % 3);
      for (let p = 0; p < puffCount; p += 1) {
        const puffSize = 8 + (p % 3) * 3.5;
        const puffGeom = new THREE.DodecahedronGeometry(puffSize, 0);
        const puff = new THREE.Mesh(puffGeom, cloudMat);
        puff.position.set((p - 1) * 7.5, (p % 2) * 2.2, ((p * 2) % 3) * 4);
        puff.scale.set(1.4, 0.6, 1);
        cloudCluster.add(puff);
      }
      clouds.add(cloudCluster);
    }
    this.group.add(clouds);
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
    for (let i = 0; i < 48; i += 1) {
      const progress = (i * 0.081 + 0.02) % 1;
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
    const oasisCenter = new THREE.Vector3(0, 0, -5);
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
    const iceLakeCenter = new THREE.Vector3(-2, 0, -10);
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

  // ==========================================
  // 🌴 4. ATOLL (碧海环礁) SCENERY & PROPS
  // ==========================================

  private buildAtollScenery(): void {
    const group = new THREE.Group();
    const trackSamples = this.track.samples;
    const step = 8;

    for (let i = 0; i < trackSamples.length; i += step) {
      const sample = trackSamples[i];
      const side = (i / step) % 2 === 0 ? -1 : 1;
      const offset = 14 + (i % 5) * 2.8;
      const pos = sample.position.clone().addScaledVector(sample.lateral, side * offset);
      if (!this.isClearOfTrack(pos, 8.8)) continue;

      if ((i / step) % 3 === 0) {
        group.add(this.createBeachUmbrella(pos, 1.0 + (i % 3) * 0.15));
      } else {
        group.add(this.createPalmTree(pos, 0.95 + (i % 4) * 0.15));
      }
    }

    // Seashell Reef Rocks
    for (let i = 0; i < 28; i += 1) {
      const angle = i * 2.4;
      const radius = 22 + (i * 13) % 45;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 8.8)) continue;
      group.add(this.createSeashellRock(pos, 0.8 + (i % 3) * 0.25));
    }

    // Central Lagoon / Tropical Basin
    const basinCenter = new THREE.Vector3(8, 0, 4);
    if (this.isClearOfTrack(basinCenter, 15)) {
      group.add(this.createTropicalBasin(basinCenter));
    }

    this.group.add(group);
  }

  private createPalmTree(position: THREE.Vector3, scale = 1): THREE.Group {
    const tree = new THREE.Group();
    tree.position.copy(position);
    tree.scale.setScalar(scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.palmTrunk, roughness: 0.85, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({ color: COLORS.atollPalmLeaf, roughness: 0.65, flatShading: true });
    const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 });

    // Segmented curved trunk
    let currY = 0;
    let currX = 0;
    const segments = 4;
    const curveDir = ((position.x * 13 + position.z * 7) % 6.28);
    for (let i = 0; i < segments; i += 1) {
      const segH = 1.25;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.32 - i * 0.04, 0.4 - i * 0.04, segH, 6), trunkMat);
      seg.position.set(currX, currY + segH / 2, 0);
      seg.rotation.z = Math.sin(curveDir) * 0.08 * (i + 1);
      seg.castShadow = true;
      tree.add(seg);
      currY += segH;
      currX += Math.sin(curveDir) * 0.25;
    }

    // Coconuts
    for (let i = 0; i < 3; i += 1) {
      const angle = (i * Math.PI * 2) / 3;
      const nut = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), coconutMat);
      nut.position.set(currX + Math.cos(angle) * 0.35, currY - 0.2, Math.sin(angle) * 0.35);
      nut.castShadow = true;
      tree.add(nut);
    }

    // Palm Fronds
    const fronds = 7;
    for (let i = 0; i < fronds; i += 1) {
      const angle = (i * Math.PI * 2) / fronds;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 4), leafMat);
      frond.position.set(currX + Math.cos(angle) * 1.4, currY - 0.25, Math.sin(angle) * 1.4);
      frond.rotation.x = Math.PI / 2.3;
      frond.rotation.z = -angle;
      frond.scale.set(1, 1, 0.2);
      frond.castShadow = true;
      tree.add(frond);
    }

    return tree;
  }

  private createBeachUmbrella(position: THREE.Vector3, scale = 1): THREE.Group {
    const umbrella = new THREE.Group();
    umbrella.position.copy(position);
    umbrella.scale.setScalar(scale);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc49d68, roughness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: COLORS.atollUmbrella, roughness: 0.6, flatShading: true });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true });

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), woodMat);
    pole.position.y = 1.4;
    pole.rotation.z = 0.08;
    pole.castShadow = true;
    umbrella.add(pole);

    // Canopy
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 8), canopyMat);
    canopy.position.set(0.12, 2.75, 0);
    canopy.castShadow = true;
    umbrella.add(canopy);

    // Lounge chair
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 1.8), whiteMat);
    chair.position.set(0.9, 0.18, 0.4);
    chair.rotation.y = 0.3;
    chair.castShadow = true;
    umbrella.add(chair);

    return umbrella;
  }

  private createSeashellRock(position: THREE.Vector3, scale = 1): THREE.Group {
    const rockGroup = new THREE.Group();
    rockGroup.position.copy(position);
    rockGroup.scale.setScalar(scale);

    const rockMat = new THREE.MeshStandardMaterial({ color: COLORS.atollReef, roughness: 0.9, flatShading: true });
    const starMat = new THREE.MeshStandardMaterial({ color: 0xeb5b5b, roughness: 0.7, flatShading: true });

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), rockMat);
    rock.position.y = 0.6;
    rock.scale.set(1.4, 0.8, 1.1);
    rock.castShadow = true;
    rockGroup.add(rock);

    // Starfish on rock
    const star = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.1, 5), starMat);
    star.position.set(0.4, 1.15, 0.3);
    star.rotation.x = 0.4;
    rockGroup.add(star);

    return rockGroup;
  }

  private createTropicalBasin(position: THREE.Vector3): THREE.Group {
    const basin = new THREE.Group();
    basin.position.copy(position);

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(6.4, 16),
      new THREE.MeshStandardMaterial({
        color: COLORS.atollWater,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.88,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.03;
    basin.add(water);

    for (let i = 0; i < 4; i += 1) {
      const angle = (i * Math.PI) / 2 + 0.3;
      const palmLocal = new THREE.Vector3(Math.cos(angle) * 6.2, 0, Math.sin(angle) * 6.2);
      const palmWorld = position.clone().add(palmLocal);
      if (this.isClearOfTrack(palmWorld, 8.5)) {
        basin.add(this.createPalmTree(palmLocal, 1.05 + (i % 2) * 0.15));
      }
    }
    return basin;
  }

  private buildAtollStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;

    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x78553d, roughness: 0.8, flatShading: true });
    const bannerMaterial = new THREE.MeshStandardMaterial({ color: 0x2c728c, roughness: 0.7, flatShading: true });

    const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 5.8, 8), woodMaterial);
    leftPillar.position.set(-5.8, 2.9, 0);
    leftPillar.castShadow = true;
    arch.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 5.8;
    arch.add(rightPillar);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.75, 0.75), woodMaterial);
    topBeam.position.y = 5.5;
    topBeam.castShadow = true;
    arch.add(topBeam);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.65, 0.88),
      bannerMaterial,
    );
    sign.position.set(0, 5.5, 0);
    arch.add(sign);

    this.group.add(arch);
  }

  // ==========================================
  // 🍂 5. AUTUMN (枫叶山谷) SCENERY & PROPS
  // ==========================================

  private buildAutumnScenery(): void {
    const group = new THREE.Group();
    const trackSamples = this.track.samples;
    const step = 7;

    for (let i = 0; i < trackSamples.length; i += step) {
      const sample = trackSamples[i];
      const side = (i / step) % 2 === 0 ? -1 : 1;
      const offset = 13 + (i % 4) * 2.6;
      const pos = sample.position.clone().addScaledVector(sample.lateral, side * offset);
      if (!this.isClearOfTrack(pos, 8.8)) continue;

      const variant = (i / step) % 3;
      group.add(this.createMapleTree(pos, 0.95 + (i % 3) * 0.18, variant));
    }

    // Rustic Windmills & Autumn Stone Lanterns
    for (let i = 0; i < 26; i += 1) {
      const angle = i * 2.35;
      const radius = 24 + (i * 15) % 46;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 9.0)) continue;

      if (i % 6 === 0) {
        group.add(this.createWindmill(pos, 1.1));
      } else if (i % 3 === 0) {
        group.add(this.createAutumnStoneLantern(pos, 0.95));
      } else {
        group.add(this.createMapleTree(pos, 1.1, i % 3));
      }
    }

    this.group.add(group);
  }

  private createMapleTree(position: THREE.Vector3, scale = 1, variant = 0): THREE.Group {
    const tree = new THREE.Group();
    tree.position.copy(position);
    tree.scale.setScalar(scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.mapleTrunk, roughness: 0.85, flatShading: true });
    const leafColor = variant === 0 ? COLORS.mapleRed : variant === 1 ? COLORS.mapleOrange : COLORS.mapleYellow;
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.72, flatShading: true });

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 2.2, 6), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    tree.add(trunk);

    // Multi-tiered foliage
    const tiers = 3;
    for (let i = 0; i < tiers; i += 1) {
      const r = 1.8 - i * 0.4;
      const h = 1.6;
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), leafMat);
      foliage.position.y = 2.2 + i * 1.05;
      foliage.rotation.y = (i * 0.5);
      foliage.castShadow = true;
      tree.add(foliage);
    }

    return tree;
  }

  private createWindmill(position: THREE.Vector3, scale = 1): THREE.Group {
    const windmill = new THREE.Group();
    windmill.position.copy(position);
    windmill.scale.setScalar(scale);

    const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.windmillWood, roughness: 0.85, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: COLORS.mapleRed, roughness: 0.75, flatShading: true });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf5f0dd, roughness: 0.7, flatShading: true });

    // Tapered tower body
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 6.2, 8), bodyMat);
    tower.position.y = 3.1;
    tower.castShadow = true;
    windmill.add(tower);

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.0, 8), roofMat);
    roof.position.y = 7.2;
    roof.castShadow = true;
    windmill.add(roof);

    // 4 Blades
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.1), bladeMat);
      blade.position.set(0, 5.8, 1.45);
      blade.rotation.z = (i * Math.PI) / 2 + 0.4;
      blade.castShadow = true;
      windmill.add(blade);
    }

    return windmill;
  }

  private createAutumnStoneLantern(position: THREE.Vector3, scale = 1): THREE.Group {
    const lantern = new THREE.Group();
    lantern.position.copy(position);
    lantern.scale.setScalar(scale);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x827c76, roughness: 0.9, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb84d });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), stoneMat);
    base.position.y = 0.2;
    lantern.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6), stoneMat);
    pillar.position.y = 1.0;
    lantern.add(pillar);

    const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), stoneMat);
    chamber.position.y = 1.8;
    lantern.add(chamber);

    const light = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), glowMat);
    light.position.y = 1.8;
    lantern.add(light);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.55, 4), stoneMat);
    cap.position.y = 2.35;
    cap.rotation.y = Math.PI / 4;
    lantern.add(cap);

    return lantern;
  }

  private buildAutumnStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;

    const woodMaterial = new THREE.MeshStandardMaterial({ color: COLORS.mapleTrunk, roughness: 0.85, flatShading: true });
    const signMaterial = new THREE.MeshStandardMaterial({ color: COLORS.mapleOrange, roughness: 0.72, flatShading: true });

    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 5.8, 0.75), woodMaterial);
    leftPillar.position.set(-5.8, 2.9, 0);
    leftPillar.castShadow = true;
    arch.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 5.8;
    arch.add(rightPillar);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.85, 0.85), woodMaterial);
    topBeam.position.y = 5.5;
    topBeam.castShadow = true;
    arch.add(topBeam);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.65, 0.92), signMaterial);
    sign.position.set(0, 5.5, 0);
    arch.add(sign);

    this.group.add(arch);
  }

  // ==========================================
  // 🌋 6. LAVA (熔岩裂谷) SCENERY & PROPS
  // ==========================================

  private buildLavaScenery(): void {
    const group = new THREE.Group();
    const trackSamples = this.track.samples;
    const step = 7;

    for (let i = 0; i < trackSamples.length; i += step) {
      const sample = trackSamples[i];
      const side = (i / step) % 2 === 0 ? -1 : 1;
      const offset = 13 + (i % 4) * 2.5;
      const pos = sample.position.clone().addScaledVector(sample.lateral, side * offset);
      if (!this.isClearOfTrack(pos, 8.8)) continue;

      if ((i / step) % 3 === 0) {
        group.add(this.createVolcanicRock(pos, 1.0 + (i % 3) * 0.2));
      } else {
        group.add(this.createBasaltPillar(pos, 1.0, 3 + (i % 4) * 1.5));
      }
    }

    // Magma pools and obsidian formations
    for (let i = 0; i < 24; i += 1) {
      const angle = i * 2.5;
      const radius = 20 + (i * 17) % 48;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 9.0)) continue;

      if (i % 4 === 0) {
        group.add(this.createMagmaPool(pos, 3.8 + (i % 3) * 0.8));
      } else {
        group.add(this.createBasaltPillar(pos, 1.0 + (i % 2) * 0.3, 4 + (i % 3) * 2));
      }
    }

    this.group.add(group);
  }

  private createBasaltPillar(position: THREE.Vector3, scale = 1, height = 4): THREE.Group {
    const cluster = new THREE.Group();
    cluster.position.copy(position);
    cluster.scale.setScalar(scale);

    const basaltMat = new THREE.MeshStandardMaterial({ color: COLORS.basaltPillar, roughness: 0.88, flatShading: true });
    const mainPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, height, 6), basaltMat);
    mainPillar.position.y = height / 2;
    mainPillar.castShadow = true;
    cluster.add(mainPillar);

    // Subsidiary side pillars
    for (let i = 0; i < 2; i += 1) {
      const subH = height * (0.55 + i * 0.2);
      const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, subH, 6), basaltMat);
      sub.position.set(0.95 * (i === 0 ? 1 : -1), subH / 2, 0.7);
      sub.castShadow = true;
      cluster.add(sub);
    }

    return cluster;
  }

  private createMagmaPool(position: THREE.Vector3, radius = 4.2): THREE.Group {
    const pool = new THREE.Group();
    pool.position.copy(position);

    const lavaMesh = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 14),
      new THREE.MeshStandardMaterial({
        color: 0xff3b10,
        emissive: 0xff4818,
        emissiveIntensity: 1.6,
        roughness: 0.25,
      }),
    );
    lavaMesh.rotation.x = -Math.PI / 2;
    lavaMesh.position.y = 0.03;
    pool.add(lavaMesh);

    // Rim rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: COLORS.basaltPillar, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 6; i += 1) {
      const angle = (i * Math.PI * 2) / 6;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rockMat);
      rock.position.set(Math.cos(angle) * (radius + 0.5), 0.4, Math.sin(angle) * (radius + 0.5));
      rock.castShadow = true;
      pool.add(rock);
    }

    return pool;
  }

  private createVolcanicRock(position: THREE.Vector3, scale = 1): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.setScalar(scale);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x362c30, roughness: 0.92, flatShading: true });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 0), rockMat);
    rock.position.y = 0.75;
    rock.scale.set(1.3, 1.1, 1.4);
    rock.castShadow = true;
    group.add(rock);

    return group;
  }

  private buildLavaStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;

    const stoneMaterial = new THREE.MeshStandardMaterial({ color: COLORS.basaltPillar, roughness: 0.88, flatShading: true });
    const magmaMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3b10,
      emissive: 0xff4818,
      emissiveIntensity: 1.8,
    });

    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.8, 0.85), stoneMaterial);
    leftPillar.position.set(-5.8, 2.9, 0);
    leftPillar.castShadow = true;
    arch.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 5.8;
    arch.add(rightPillar);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.9, 0.9), stoneMaterial);
    topBeam.position.y = 5.5;
    topBeam.castShadow = true;
    arch.add(topBeam);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.65, 0.98), magmaMaterial);
    sign.position.set(0, 5.5, 0);
    arch.add(sign);

    this.group.add(arch);
  }

  // ==========================================
  // 🌸 7. SAKURA (樱花幽谷) SCENERY & PROPS
  // ==========================================

  private buildSakuraScenery(): void {
    const group = new THREE.Group();
    const trackSamples = this.track.samples;
    const step = 7;

    for (let i = 0; i < trackSamples.length; i += step) {
      const sample = trackSamples[i];
      const side = (i / step) % 2 === 0 ? -1 : 1;
      const offset = 13 + (i % 4) * 2.5;
      const pos = sample.position.clone().addScaledVector(sample.lateral, side * offset);
      if (!this.isClearOfTrack(pos, 8.8)) continue;

      if ((i / step) % 4 === 0) {
        group.add(this.createToroLantern(pos, 1.0));
      } else {
        group.add(this.createSakuraTree(pos, 0.95 + (i % 3) * 0.18));
      }
    }

    // Zen rocks, lanterns, and extra cherry blossoms
    for (let i = 0; i < 28; i += 1) {
      const angle = i * 2.3;
      const radius = 22 + (i * 14) % 48;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (!this.isClearOfTrack(pos, 9.0)) continue;

      if (i % 5 === 0) {
        group.add(this.createZenRock(pos, 1.1));
      } else if (i % 3 === 0) {
        group.add(this.createToroLantern(pos, 0.9));
      } else {
        group.add(this.createSakuraTree(pos, 1.05 + (i % 2) * 0.2));
      }
    }

    this.group.add(group);
  }

  private createSakuraTree(position: THREE.Vector3, scale = 1): THREE.Group {
    const tree = new THREE.Group();
    tree.position.copy(position);
    tree.scale.setScalar(scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543828, roughness: 0.85, flatShading: true });
    const pinkMat = new THREE.MeshStandardMaterial({ color: COLORS.sakuraPink, roughness: 0.75, flatShading: true });
    const lightPinkMat = new THREE.MeshStandardMaterial({ color: COLORS.sakuraPinkLight, roughness: 0.75, flatShading: true });

    // Curved wood trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.46, 2.4, 6), trunkMat);
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Multi-puff sakura blossom canopy
    const puff1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), pinkMat);
    puff1.position.set(0, 2.9, 0);
    puff1.castShadow = true;
    tree.add(puff1);

    const puff2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), lightPinkMat);
    puff2.position.set(0.8, 3.4, 0.4);
    puff2.castShadow = true;
    tree.add(puff2);

    const puff3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), pinkMat);
    puff3.position.set(-0.7, 3.2, -0.4);
    puff3.castShadow = true;
    tree.add(puff3);

    return tree;
  }

  private createToroLantern(position: THREE.Vector3, scale = 1): THREE.Group {
    const toro = new THREE.Group();
    toro.position.copy(position);
    toro.scale.setScalar(scale);

    const stoneMat = new THREE.MeshStandardMaterial({ color: COLORS.stoneToro, roughness: 0.88, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe6a3 });

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.35, 6), stoneMat);
    base.position.y = 0.18;
    toro.add(base);

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.1, 6), stoneMat);
    stem.position.y = 0.9;
    toro.add(stem);

    // Platform
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 0.3, 6), stoneMat);
    plat.position.y = 1.6;
    toro.add(plat);

    // Firebox light
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.42), glowMat);
    light.position.y = 1.95;
    toro.add(light);

    // Pagoda roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.5, 6), stoneMat);
    roof.position.y = 2.45;
    toro.add(roof);

    return toro;
  }

  private createZenRock(position: THREE.Vector3, scale = 1): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.setScalar(scale);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x727e85, roughness: 0.9, flatShading: true });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x5a8a52, roughness: 0.95 });

    const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), rockMat);
    mainRock.position.y = 0.65;
    mainRock.scale.set(1.4, 0.9, 1.1);
    mainRock.castShadow = true;
    group.add(mainRock);

    const moss = new THREE.Mesh(new THREE.CircleGeometry(1.8, 8), mossMat);
    moss.rotation.x = -Math.PI / 2;
    moss.position.y = 0.02;
    group.add(moss);

    return group;
  }

  private buildSakuraStartArch(): void {
    const sample = this.track.samples[0];
    const arch = new THREE.Group();
    const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
    arch.position.copy(sample.position);
    arch.rotation.y = yaw;

    const vermilionMat = new THREE.MeshStandardMaterial({ color: COLORS.toriiRed, roughness: 0.72, flatShading: true });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.65, flatShading: true });

    // Torii round pillars
    const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 6.0, 8), vermilionMat);
    leftPillar.position.set(-5.8, 3.0, 0);
    leftPillar.castShadow = true;
    arch.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 5.8;
    arch.add(rightPillar);

    // Intermediate tie beam (Nuki)
    const nukiBeam = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.55, 0.55), vermilionMat);
    nukiBeam.position.y = 4.8;
    nukiBeam.castShadow = true;
    arch.add(nukiBeam);

    // Top main beam (Kasagi) with black cap
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.75, 0.8), blackMat);
    topBeam.position.y = 5.8;
    topBeam.castShadow = true;
    arch.add(topBeam);

    // Central tablet
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.25), blackMat);
    tablet.position.set(0, 5.3, 0);
    arch.add(tablet);

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
