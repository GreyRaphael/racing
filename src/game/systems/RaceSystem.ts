import { TOTAL_LAPS, clamp, wrapProgress } from '../constants';
import { AiKart } from '../kart/AiKart';
import { Kart } from '../kart/Kart';
import { PlayerKart } from '../kart/PlayerKart';
import { Track } from '../track/Track';
import { TimeTrialRecord, TimeTrialRecords } from '../../storage/TimeTrialRecords';

export type RaceMode = 'time-trial' | 'race';
export type RacePhase = 'menu' | 'countdown' | 'racing' | 'results';

export interface RankingEntry {
  name: string;
  progress: number;
  finished: boolean;
  finishTime: number | null;
}

export interface RaceResult {
  totalTime: number;
  lapTimes: number[];
  ranking: RankingEntry[];
  record: TimeTrialRecord | null;
}

export class RaceSystem {
  readonly totalLaps = TOTAL_LAPS;
  phase: RacePhase = 'menu';
  mode: RaceMode = 'time-trial';
  elapsedTime = 0;
  lapElapsedTime = 0;
  countdownTimer = 0;
  result: RaceResult | null = null;
  private readonly lastProgress = new Map<Kart, number>();
  private readonly hasLeftStart = new Map<Kart, boolean>();
  private readonly lapTimes: number[] = [];

  constructor(
    private readonly track: Track,
    readonly player: PlayerKart,
    readonly ai: AiKart[],
    private readonly records: TimeTrialRecords,
  ) {}

  get karts(): Kart[] {
    return this.mode === 'race' ? [this.player, ...this.ai] : [this.player];
  }

  begin(mode: RaceMode): void {
    this.mode = mode;
    this.phase = 'countdown';
    this.countdownTimer = 3;
    this.elapsedTime = 0;
    this.lapElapsedTime = 0;
    this.lapTimes.length = 0;
    this.result = null;
    this.ai.forEach((kart) => {
      kart.resetRaceState();
      kart.group.visible = mode === 'race';
    });
    const grid = [0, -2.2, 2.2, -4.35];
    this.karts.forEach((kart, index) => {
      kart.resetRaceState();
      kart.placeAt(0.002, grid[index] ?? 0);
      this.lastProgress.set(kart, kart.progress);
      this.hasLeftStart.set(kart, false);
    });
  }

  update(delta: number): void {
    if (this.phase === 'countdown') {
      this.countdownTimer = Math.max(0, this.countdownTimer - delta);
      if (this.countdownTimer <= 0) {
        this.phase = 'racing';
        this.elapsedTime = 0;
        this.lapElapsedTime = 0;
        this.karts.forEach((kart) => {
          this.lastProgress.set(kart, kart.progress);
          this.hasLeftStart.set(kart, false);
        });
      }
      return;
    }
    if (this.phase !== 'racing') return;
    this.elapsedTime += delta;
    this.lapElapsedTime += delta;
    for (const kart of this.karts) this.processLap(kart);
    // The race ends the moment the player crosses the finish line. AI that
    // have not completed all laps are ranked by track progress instead of by
    // finish time, so the standings reflect the order at the moment of the
    // player's finish rather than forcing every AI to complete the race.
    if (this.player.finished) this.finishRace();
  }

  isDrivingAllowed(): boolean {
    return this.phase === 'racing';
  }

  get countdownNumber(): number {
    return Math.max(1, Math.ceil(this.countdownTimer));
  }

  get playerPosition(): number {
    return Math.max(1, this.getRanking().findIndex((entry) => entry.name === this.player.name) + 1);
  }

  get currentLapTime(): number {
    return this.lapElapsedTime;
  }

  get bestLapTime(): number | null {
    return this.records.load().bestLapTime;
  }

  getRanking(): RankingEntry[] {
    return this.karts
      .map((kart) => ({
        name: kart.name,
        progress: kart.finished ? this.totalLaps + 1 : (kart.lap - 1) + wrapProgress(kart.progress),
        finished: kart.finished,
        finishTime: kart.finishTime,
      }))
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished && b.finished) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
        return b.progress - a.progress;
      });
  }

  forceCompleteLap(): void {
    if (this.phase === 'countdown') this.phase = 'racing';
    if (this.phase !== 'racing' || this.player.finished) return;
    this.completeLap(this.player);
  }

  forceFinish(): void {
    if (this.phase === 'menu') this.begin(this.mode);
    if (this.phase === 'countdown') this.phase = 'racing';
    while (this.phase === 'racing' && !this.player.finished) this.completeLap(this.player);
  }

  getDebugState(): Record<string, unknown> {
    return {
      phase: this.phase,
      mode: this.mode,
      countdown: this.phase === 'countdown' ? this.countdownNumber : 0,
      elapsedTime: this.elapsedTime,
      lapTime: this.lapElapsedTime,
      currentLap: this.player.lap,
      playerPosition: this.playerPosition,
      totalLaps: this.totalLaps,
      ranking: this.getRanking(),
      result: this.result,
    };
  }

  private processLap(kart: Kart): void {
    const previous = this.lastProgress.get(kart) ?? kart.progress;
    const current = kart.progress;
    if (current > 0.14) this.hasLeftStart.set(kart, true);
    const crossedStart = Boolean(this.hasLeftStart.get(kart)) && previous > 0.78 && current < 0.22;
    this.lastProgress.set(kart, current);
    if (crossedStart && !kart.finished) this.completeLap(kart);
  }

  private completeLap(kart: Kart): void {
    if (kart.finished) return;
    const completedLapTime = this.lapElapsedTime;
    if (kart === this.player) {
      this.lapTimes.push(completedLapTime);
      this.lapElapsedTime = 0;
    }
    if (kart.lap >= this.totalLaps) {
      kart.finished = true;
      kart.finishTime = this.elapsedTime;
      return;
    }
    kart.lap += 1;
  }

  private finishRace(): void {
    if (this.phase === 'results') return;
    // Intentional:结算以玩家完赛为触发点。未完赛 AI 通过 getRanking 按
    // 赛道进度排序展示"进行中"状态，而非等待所有 AI 跑完。设计上把玩家
    // 体验放在首位，多人赛的最终名次因此反映玩家冲线瞬间的场上态势。
    this.phase = 'results';
    const totalTime = Math.max(0, this.elapsedTime);
    const lapTimes = this.lapTimes.slice(0, this.totalLaps);
    const record = this.mode === 'time-trial' ? this.records.saveResult(totalTime, lapTimes) : null;
    this.result = { totalTime, lapTimes, ranking: this.getRanking(), record };
  }
}
