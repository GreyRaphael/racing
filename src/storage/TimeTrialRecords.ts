import { TrackId } from '../game/constants';

export interface TimeTrialRecord {
  bestTotalTime: number | null;
  bestLapTime: number | null;
  lastTotalTime: number | null;
  lastLapTimes: number[];
}

interface MultiTrackStorage {
  bestTotalTime?: number | null;
  bestLapTime?: number | null;
  lastTotalTime?: number | null;
  lastLapTimes?: number[];
  tracks?: Partial<Record<TrackId, Partial<TimeTrialRecord>>>;
  meadow?: Partial<TimeTrialRecord>;
  desert?: Partial<TimeTrialRecord>;
}

const STORAGE_KEY = 'sunny-kart-time-trial-v1';
const EMPTY_RECORD: TimeTrialRecord = {
  bestTotalTime: null,
  bestLapTime: null,
  lastTotalTime: null,
  lastLapTimes: [],
};

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseRecord(raw: unknown): TimeTrialRecord {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_RECORD, lastLapTimes: [] };
  const record = raw as Partial<TimeTrialRecord>;
  const laps = Array.isArray(record.lastLapTimes)
    ? record.lastLapTimes.filter(isFinitePositive).slice(0, 3)
    : [];
  return {
    bestTotalTime: isFinitePositive(record.bestTotalTime) ? record.bestTotalTime : null,
    bestLapTime: isFinitePositive(record.bestLapTime) ? record.bestLapTime : null,
    lastTotalTime: isFinitePositive(record.lastTotalTime) ? record.lastTotalTime : null,
    lastLapTimes: laps,
  };
}

export class TimeTrialRecords {
  load(trackId: TrackId = 'meadow'): TimeTrialRecord {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.empty();
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return this.empty();
      const storage = parsed as MultiTrackStorage;

      // Check if track-specific record exists under tracks or directly
      if (storage.tracks && storage.tracks[trackId]) {
        return parseRecord(storage.tracks[trackId]);
      }
      if (storage[trackId]) {
        return parseRecord(storage[trackId]);
      }

      // If loading meadow, fallback to root-level legacy record
      if (trackId === 'meadow') {
        return parseRecord(storage);
      }

      return this.empty();
    } catch {
      return this.empty();
    }
  }

  saveResult(totalTime: number, lapTimes: number[], trackId?: TrackId): TimeTrialRecord;
  saveResult(trackIdOrTotal: TrackId | number, totalOrLaps: number | number[], lapsOrTrack?: number[] | TrackId): TimeTrialRecord {
    let trackId: TrackId = 'meadow';
    let totalTime = 0;
    let lapTimes: number[] = [];

    if (typeof trackIdOrTotal === 'string') {
      trackId = trackIdOrTotal;
      totalTime = typeof totalOrLaps === 'number' ? totalOrLaps : 0;
      lapTimes = Array.isArray(lapsOrTrack) ? lapsOrTrack : [];
    } else {
      totalTime = trackIdOrTotal;
      lapTimes = Array.isArray(totalOrLaps) ? totalOrLaps : [];
      if (typeof lapsOrTrack === 'string') trackId = lapsOrTrack;
    }

    const old = this.load(trackId);
    const validLaps = lapTimes.filter(isFinitePositive).slice(0, 3);
    const bestLap = validLaps.length > 0 ? Math.min(...validLaps) : old.bestLapTime;
    const record: TimeTrialRecord = {
      bestTotalTime: old.bestTotalTime === null ? totalTime : Math.min(old.bestTotalTime, totalTime),
      bestLapTime: bestLap === null ? null : old.bestLapTime === null ? bestLap : Math.min(old.bestLapTime, bestLap),
      lastTotalTime: totalTime,
      lastLapTimes: validLaps,
    };

    try {
      let rawStorage: MultiTrackStorage = {};
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') rawStorage = parsed;
      }

      if (!rawStorage.tracks) rawStorage.tracks = {};
      rawStorage.tracks[trackId] = record;
      rawStorage[trackId] = record;

      // Keep root updated for meadow to retain backward compatibility
      if (trackId === 'meadow') {
        rawStorage.bestTotalTime = record.bestTotalTime;
        rawStorage.bestLapTime = record.bestLapTime;
        rawStorage.lastTotalTime = record.lastTotalTime;
        rawStorage.lastLapTimes = record.lastLapTimes;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawStorage));
    } catch {
      // Storage can be disabled in private browsing; gameplay should still work.
    }
    return record;
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }

  empty(): TimeTrialRecord {
    return { ...EMPTY_RECORD, lastLapTimes: [] };
  }

  static get key(): string {
    return STORAGE_KEY;
  }
}
