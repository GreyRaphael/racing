import { TrackId } from '../game/constants';

export interface GhostFrame {
  t: number;      // 相对比赛开始经过的时间（秒，精确到毫秒）
  x: number;      // 3D 坐标 X
  y: number;      // 3D 坐标 Y (跟随 3D 起伏地形)
  z: number;      // 3D 坐标 Z
  pitch: number;  // 俯仰角
  yaw: number;    // 偏航角
  steer: number;  // 前轮转向角
  drift: boolean; // 是否漂移
  progress: number; // 赛道总进度 (lap - 1 + progress)
}

export interface GhostData {
  trackId: TrackId;
  totalTime: number;
  bestLapTime: number;
  lapTimes: number[];
  recordedAt: number;
  frames: GhostFrame[];
}

export class GhostStorage {
  private static readonly KEY_PREFIX = 'sunny_kart_ghost_v1_';

  static getKey(trackId: TrackId): string {
    return `${this.KEY_PREFIX}${trackId}`;
  }

  loadGhost(trackId: TrackId): GhostData | null {
    try {
      const raw = localStorage.getItem(GhostStorage.getKey(trackId));
      if (!raw) return null;
      const data = JSON.parse(raw) as GhostData;
      if (!data || !Array.isArray(data.frames) || typeof data.totalTime !== 'number') {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  saveGhost(data: GhostData): boolean {
    try {
      const compactFrames: GhostFrame[] = data.frames.map((f) => ({
        t: Math.round(f.t * 1000) / 1000,
        x: Math.round(f.x * 100) / 100,
        y: Math.round(f.y * 100) / 100,
        z: Math.round(f.z * 100) / 100,
        pitch: Math.round(f.pitch * 1000) / 1000,
        yaw: Math.round(f.yaw * 1000) / 1000,
        steer: Math.round(f.steer * 1000) / 1000,
        drift: Boolean(f.drift),
        progress: Math.round(f.progress * 10000) / 10000,
      }));

      const payload: GhostData = {
        trackId: data.trackId,
        totalTime: Math.round(data.totalTime * 1000) / 1000,
        bestLapTime: Math.round(data.bestLapTime * 1000) / 1000,
        lapTimes: data.lapTimes.map((t) => Math.round(t * 1000) / 1000),
        recordedAt: data.recordedAt || Date.now(),
        frames: compactFrames,
      };

      localStorage.setItem(GhostStorage.getKey(data.trackId), JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('Failed to save ghost replay data:', e);
      return false;
    }
  }

  clearGhost(trackId?: TrackId): void {
    try {
      if (trackId) {
        localStorage.removeItem(GhostStorage.getKey(trackId));
      } else {
        const trackIds: TrackId[] = ['meadow', 'desert', 'snow', 'atoll', 'autumn', 'lava', 'sakura', 'citadel', 'crystal'];
        trackIds.forEach((id) => localStorage.removeItem(GhostStorage.getKey(id)));
      }
    } catch {
      // Storage unavailable
    }
  }

  hasGhost(trackId: TrackId): boolean {
    return this.loadGhost(trackId) !== null;
  }
}
