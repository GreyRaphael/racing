import * as THREE from 'three';

export const TOTAL_LAPS = 3;
export const TRACK_SAMPLE_COUNT = 420;
// The road has enough room for two karts to pass without making the scenery feel empty.
export const ROAD_HALF_WIDTH = 5.2;
// The collision wall is aligned with the visible guard-rail center.
export const GRASS_FENCE_LIMIT = 6.4;
export const KART_COLLISION_DISTANCE = 1.6;
export const TRACK_LENGTH = 0;
export const COLORS = {
  sky: 0x9bdcf5,
  grass: 0x76b85e,
  grassLight: 0x8ccf6b,
  road: 0x66717a,
  roadEdge: 0xe8e6d2,
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
