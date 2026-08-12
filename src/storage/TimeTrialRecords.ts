export interface TimeTrialRecord {
  bestTotalTime: number | null;
  bestLapTime: number | null;
  lastTotalTime: number | null;
  lastLapTimes: number[];
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

export class TimeTrialRecords {
  load(): TimeTrialRecord {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.empty();
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return this.empty();
      const record = parsed as Partial<TimeTrialRecord>;
      const laps = Array.isArray(record.lastLapTimes)
        ? record.lastLapTimes.filter(isFinitePositive).slice(0, 3)
        : [];
      return {
        bestTotalTime: isFinitePositive(record.bestTotalTime) ? record.bestTotalTime : null,
        bestLapTime: isFinitePositive(record.bestLapTime) ? record.bestLapTime : null,
        lastTotalTime: isFinitePositive(record.lastTotalTime) ? record.lastTotalTime : null,
        lastLapTimes: laps,
      };
    } catch {
      return this.empty();
    }
  }

  saveResult(totalTime: number, lapTimes: number[]): TimeTrialRecord {
    const old = this.load();
    const validLaps = lapTimes.filter(isFinitePositive).slice(0, 3);
    const bestLap = validLaps.length > 0 ? Math.min(...validLaps) : old.bestLapTime;
    const record: TimeTrialRecord = {
      bestTotalTime: old.bestTotalTime === null ? totalTime : Math.min(old.bestTotalTime, totalTime),
      bestLapTime: bestLap === null ? null : old.bestLapTime === null ? bestLap : Math.min(old.bestLapTime, bestLap),
      lastTotalTime: totalTime,
      lastLapTimes: validLaps,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
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
