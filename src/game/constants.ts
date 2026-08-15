import * as THREE from 'three';

export const TOTAL_LAPS = 3;
export const TRACK_SAMPLE_COUNT = 420;
// The road has enough room for two karts to pass without making the scenery feel empty.
export const ROAD_HALF_WIDTH = 5.2;
// The collision wall is aligned with the visible guard-rail center.
export const GRASS_FENCE_LIMIT = 6.4;
export const KART_COLLISION_DISTANCE = 1.6;
export const COLLISION_RESTITUTION = 0.48;
export const DESTROY_CLOSING_SPEED = 4.5;
export type TrackId = 'meadow' | 'desert' | 'snow';

export interface TrackTheme {
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  sunlightColor: number;
  sunlightIntensity: number;
  sunlightPos: [number, number, number];
  ground: number;
  groundPatches: number;
  road: number;
  roadEdge: number;
  fence: number;
  fencePost: number;
  fenceCap: number;
  marker: number;
  dustColor: number;
}

export interface TrackConfig {
  id: TrackId;
  name: string;
  shortCode: string;
  subtitle: string;
  controls: THREE.Vector3[];
  theme: TrackTheme;
}

export const COLORS = {
  sky: 0x9bdcf5,
  grass: 0x76b85e,
  grassLight: 0x8ccf6b,
  road: 0x53656b,
  roadEdge: 0xf1e8c9,
  fence: 0xf4f1dc,
  red: 0xf15a4a,
  yellow: 0xffce58,
  blue: 0x48a9e8,
  purple: 0x9d76e8,
  leaf: 0x3f9d59,
  leafLight: 0x72c76d,
  trunk: 0x76513d,
  rock: 0x899295,
  flowerPink: 0xf38ab4,
  flowerYellow: 0xffd15c,
  flowerWhite: 0xf6f2da,
  // Desert theme colors
  desertSky: 0xfebf88,
  desertFog: 0xfebf88,
  sand: 0xd9a860,
  sandPatches: 0xc28f46,
  desertRoad: 0x564942,
  desertRoadEdge: 0xe8d29b,
  desertFence: 0xdc9766,
  desertPost: 0xa84828,
  desertCap: 0xf9a838,
  cactus: 0x487e42,
  cactusDark: 0x376433,
  palmTrunk: 0x78553d,
  palmLeaf: 0x549442,
  palmLeafLight: 0x74b85d,
  canyonRock: 0xc57646,
  canyonRockDark: 0x9e522d,
  oasisWater: 0x40a8c4,
  sandDust: 0xe2a85e,
  // Snow theme colors
  snowSky: 0x7cb8e2,
  snowFog: 0x88c4e8,
  snowGround: 0xe4eff7,
  snowPatches: 0xc8e0f0,
  snowRoad: 0x3e4f5c,
  snowRoadEdge: 0xdaf0fc,
  snowFence: 0xd8effa,
  snowPost: 0x2a527a,
  snowCap: 0x66c7f4,
  snowPineTrunk: 0x4e3e36,
  snowPineLeaf: 0x224939,
  snowWhite: 0xf2f7fc,
  iceCrystal: 0x5ebbe8,
  iceCrystalLight: 0xa6e6fd,
  snowRock: 0x697882,
  snowLake: 0x72c8eb,
  snowDust: 0xeaf5fc,
  carrotOrange: 0xeb6728,
  coalBlack: 0x242729,
  scarfRed: 0xde3f3f,
};

export const TRACK_CONFIGS: Record<TrackId, TrackConfig> = {
  meadow: {
    id: 'meadow',
    name: '阳光草原',
    shortCode: 'SMC • 01',
    subtitle: '微风、花朵与起伏弯道',
    controls: [
      new THREE.Vector3(-32, 0, -36),
      new THREE.Vector3(10, 0, -44),
      new THREE.Vector3(44, 0, -28),
      new THREE.Vector3(50, 0, 2),
      new THREE.Vector3(38, 0, 28),
      new THREE.Vector3(16, 0, 48),
      new THREE.Vector3(-18, 0, 50),
      new THREE.Vector3(-44, 0, 36),
      new THREE.Vector3(-52, 0, 8),
      new THREE.Vector3(-46, 0, -18),
    ],
    theme: {
      sky: COLORS.sky,
      fog: COLORS.sky,
      fogNear: 85,
      fogFar: 170,
      hemisphereSky: 0xe4f7ff,
      hemisphereGround: 0x6d9a55,
      hemisphereIntensity: 2.2,
      sunlightColor: 0xfff4cf,
      sunlightIntensity: 3.8,
      sunlightPos: [-35, 62, -28],
      ground: COLORS.grass,
      groundPatches: COLORS.grassLight,
      road: 0x53656b,
      roadEdge: 0xf1e8c9,
      fence: COLORS.fence,
      fencePost: COLORS.red,
      fenceCap: COLORS.yellow,
      marker: 0xf8f3d8,
      dustColor: 0xd8c49a,
    },
  },
  desert: {
    id: 'desert',
    name: '黄金沙漠',
    shortCode: 'GDC • 02',
    subtitle: '沙丘、仙人掌与绿洲急弯',
    controls: [
      new THREE.Vector3(-46, 0, -36),
      new THREE.Vector3(-15, 0, -54),
      new THREE.Vector3(25, 0, -54),
      new THREE.Vector3(60, 0, -36),
      new THREE.Vector3(68, 0, -4),
      new THREE.Vector3(56, 0, 24),
      new THREE.Vector3(32, 0, 48),
      new THREE.Vector3(-4, 0, 54),
      new THREE.Vector3(-38, 0, 46),
      new THREE.Vector3(-62, 0, 24),
      new THREE.Vector3(-64, 0, 0),
      new THREE.Vector3(-58, 0, -22),
    ],
    theme: {
      sky: COLORS.desertSky,
      fog: COLORS.desertFog,
      fogNear: 80,
      fogFar: 165,
      hemisphereSky: 0xffeedb,
      hemisphereGround: 0xa0673b,
      hemisphereIntensity: 2.4,
      sunlightColor: 0xffeed0,
      sunlightIntensity: 4.0,
      sunlightPos: [-40, 58, -30],
      ground: COLORS.sand,
      groundPatches: COLORS.sandPatches,
      road: COLORS.desertRoad,
      roadEdge: COLORS.desertRoadEdge,
      fence: COLORS.desertFence,
      fencePost: COLORS.desertPost,
      fenceCap: COLORS.desertCap,
      marker: 0xf7e9b8,
      dustColor: COLORS.sandDust,
    },
  },
  snow: {
    id: 'snow',
    name: '冰封雪原',
    shortCode: 'FPC • 03',
    subtitle: '冰川、雪松与极地冰道',
    controls: [
      new THREE.Vector3(-44, 0, -42),
      new THREE.Vector3(10, 0, -48),
      new THREE.Vector3(48, 0, -36),
      new THREE.Vector3(58, 0, -10),
      new THREE.Vector3(48, 0, 20),
      new THREE.Vector3(24, 0, 40),
      new THREE.Vector3(-6, 0, 50),
      new THREE.Vector3(-36, 0, 46),
      new THREE.Vector3(-52, 0, 22),
      new THREE.Vector3(-48, 0, -4),
      new THREE.Vector3(-54, 0, -22),
    ],
    theme: {
      sky: COLORS.snowSky,
      fog: COLORS.snowFog,
      fogNear: 85,
      fogFar: 175,
      hemisphereSky: 0xdcf0ff,
      hemisphereGround: 0x789eb8,
      hemisphereIntensity: 2.3,
      sunlightColor: 0xf0f7ff,
      sunlightIntensity: 3.8,
      sunlightPos: [-30, 65, -30],
      ground: COLORS.snowGround,
      groundPatches: COLORS.snowPatches,
      road: COLORS.snowRoad,
      roadEdge: COLORS.snowRoadEdge,
      fence: COLORS.snowFence,
      fencePost: COLORS.snowPost,
      fenceCap: COLORS.snowCap,
      marker: 0xf0f8ff,
      dustColor: COLORS.snowDust,
    },
  },
};

export const UP = new THREE.Vector3(0, 1, 0);

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe - minutes * 60;
  return `${minutes.toString().padStart(2, '0')}:${remaining.toFixed(3).padStart(6, '0')}`;
}

export function wrapProgress(progress: number): number {
  return ((progress % 1) + 1) % 1;
}

export function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
