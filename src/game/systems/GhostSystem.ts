import { TrackId } from '../constants';
import { PlayerKart } from '../kart/PlayerKart';
import { GhostKart } from '../kart/GhostKart';
import { Track } from '../track/Track';
import { GhostData, GhostFrame, GhostStorage } from '../../storage/GhostStorage';

export interface GhostFinishResult {
  beatGhost: boolean;
  isNewRecord: boolean;
  previousBestTotal: number | null;
  improvement: number | null;
}

export class GhostSystem {
  readonly storage = new GhostStorage();
  readonly ghostKart: GhostKart;
  enabled = true;

  private activeTrackId: TrackId = 'meadow';
  private recordedFrames: GhostFrame[] = [];
  private timeSinceLastRecord = 0;
  private currentGhostData: GhostData | null = null;

  constructor(track: Track) {
    this.ghostKart = new GhostKart(track);
    this.loadGhostForTrack('meadow');
  }

  get trackId(): TrackId {
    return this.activeTrackId;
  }

  get hasActiveGhost(): boolean {
    return Boolean(this.currentGhostData && this.currentGhostData.frames.length > 0);
  }

  get currentGhost(): GhostData | null {
    return this.currentGhostData;
  }

  setTrack(track: Track, trackId: TrackId): void {
    this.activeTrackId = trackId;
    this.ghostKart.setTrack(track);
    this.loadGhostForTrack(trackId);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.ghostKart.group.visible = enabled && this.hasActiveGhost;
  }

  loadGhostForTrack(trackId: TrackId = this.activeTrackId): void {
    this.activeTrackId = trackId;
    this.currentGhostData = this.storage.loadGhost(trackId);
    this.ghostKart.setGhostData(this.currentGhostData);
    this.ghostKart.group.visible = this.enabled && this.hasActiveGhost;
  }

  beginRace(mode: string): void {
    this.recordedFrames = [];
    this.timeSinceLastRecord = 0;
    this.ghostKart.reset();
    this.ghostKart.group.visible = mode === 'time-trial' && this.enabled && this.hasActiveGhost;
  }

  update(delta: number, raceElapsedTime: number, player: PlayerKart, isRacing: boolean, mode: string): void {
    if (mode !== 'time-trial') {
      this.ghostKart.group.visible = false;
      return;
    }

    if (this.enabled && this.hasActiveGhost) {
      this.ghostKart.group.visible = true;
      if (isRacing) {
        this.ghostKart.playback(raceElapsedTime);
      }
    } else {
      this.ghostKart.group.visible = false;
    }

    if (isRacing) {
      this.timeSinceLastRecord += delta;
      // Record at ~30 fps
      if (this.timeSinceLastRecord >= 0.033 || this.recordedFrames.length === 0) {
        this.timeSinceLastRecord = 0;
        const totalProgress = (player.lap - 1) + player.progress;
        this.recordedFrames.push({
          t: raceElapsedTime,
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          pitch: player.pitch,
          yaw: player.yaw,
          steer: player.steering,
          drift: player.isDrifting,
          progress: totalProgress,
        });
      }
    }
  }

  /**
   * Calculates the delta time (Player Time - Ghost Time) at the player's current race progress.
   * Negative delta means player is ahead (faster). Positive delta means player is trailing (slower).
   */
  calculateDelta(playerRaceProgress: number, playerElapsedTime: number): number | null {
    if (!this.hasActiveGhost || !this.currentGhostData || this.currentGhostData.frames.length < 2) {
      return null;
    }

    const frames = this.currentGhostData.frames;
    if (playerRaceProgress <= frames[0].progress) {
      return playerElapsedTime - frames[0].t;
    }
    if (playerRaceProgress >= frames[frames.length - 1].progress) {
      return playerElapsedTime - frames[frames.length - 1].t;
    }

    // Binary search for surrounding progress frames
    let low = 0;
    let high = frames.length - 2;
    let idx = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (frames[mid].progress <= playerRaceProgress) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const f0 = frames[idx];
    const f1 = frames[idx + 1];
    const dp = Math.max(0.00001, f1.progress - f0.progress);
    const alpha = Math.max(0, Math.min(1, (playerRaceProgress - f0.progress) / dp));
    const ghostTime = f0.t + (f1.t - f0.t) * alpha;

    return playerElapsedTime - ghostTime;
  }

  handleRaceFinish(totalTime: number, lapTimes: number[]): GhostFinishResult {
    const previousGhost = this.currentGhostData;
    const previousBestTotal = previousGhost ? previousGhost.totalTime : null;
    const isFirstRecord = previousBestTotal === null;
    const beatGhost = isFirstRecord || totalTime < previousBestTotal;

    if (beatGhost) {
      if (this.recordedFrames.length === 0) {
        this.recordedFrames.push({
          t: 0,
          x: 0,
          y: 0.23,
          z: 0,
          pitch: 0,
          yaw: 0,
          steer: 0,
          drift: false,
          progress: 0,
        });
      }

      const lastLap = lapTimes.length > 0 ? lapTimes.length : 3;
      const finalProgress = lastLap;
      const last = this.recordedFrames[this.recordedFrames.length - 1];
      if (last.t < totalTime || this.recordedFrames.length === 1) {
        this.recordedFrames.push({
          ...last,
          t: totalTime,
          progress: finalProgress,
        });
      }

      const validLaps = lapTimes.length > 0 ? lapTimes : [totalTime];
      const bestLap = Math.min(...validLaps);

      const newGhostData: GhostData = {
        trackId: this.activeTrackId,
        totalTime,
        bestLapTime: bestLap,
        lapTimes: validLaps,
        recordedAt: Date.now(),
        frames: this.recordedFrames,
      };

      this.storage.saveGhost(newGhostData);
      this.currentGhostData = newGhostData;
      this.ghostKart.setGhostData(newGhostData);

      const improvement = previousBestTotal !== null ? previousBestTotal - totalTime : null;
      return {
        beatGhost: true,
        isNewRecord: true,
        previousBestTotal,
        improvement,
      };
    }

    return {
      beatGhost: false,
      isNewRecord: false,
      previousBestTotal,
      improvement: null,
    };
  }

  getDebugState(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      hasActiveGhost: this.hasActiveGhost,
      activeTrackId: this.activeTrackId,
      ghostTotalTime: this.currentGhostData?.totalTime ?? null,
      recordedFramesCount: this.recordedFrames.length,
      ghostKart: this.ghostKart.getDebugState(),
    };
  }
}
