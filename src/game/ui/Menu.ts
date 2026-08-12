import { RaceMode } from '../systems/RaceSystem';
import { TimeTrialRecords } from '../../storage/TimeTrialRecords';
import { formatTime } from '../constants';

export class Menu {
  private readonly root = this.require<HTMLElement>('#menu-screen');
  private readonly modeMenu = this.require<HTMLElement>('#mode-menu');
  private readonly startButton = this.require<HTMLButtonElement>('#start-race');
  private readonly recordLabel = this.require<HTMLElement>('#menu-record');
  private mode: RaceMode = 'time-trial';

  constructor(private readonly records: TimeTrialRecords, onStart: (mode: RaceMode) => void) {
    const timeTrial = this.require<HTMLButtonElement>('#time-trial-mode');
    const race = this.require<HTMLButtonElement>('#race-mode');
    timeTrial.addEventListener('click', () => this.selectMode('time-trial'));
    race.addEventListener('click', () => this.selectMode('race'));
    this.startButton.addEventListener('click', () => onStart(this.mode));
    this.refreshRecord();
  }

  get selectedMode(): RaceMode { return this.mode; }

  show(): void {
    this.root.classList.remove('hidden');
    this.refreshRecord();
  }

  hide(): void { this.root.classList.add('hidden'); }

  private selectMode(mode: RaceMode): void {
    this.mode = mode;
    const timeTrial = this.require<HTMLButtonElement>('#time-trial-mode');
    const race = this.require<HTMLButtonElement>('#race-mode');
    timeTrial.classList.toggle('selected', mode === 'time-trial');
    race.classList.toggle('selected', mode === 'race');
    timeTrial.setAttribute('aria-pressed', String(mode === 'time-trial'));
    race.setAttribute('aria-pressed', String(mode === 'race'));
    this.startButton.innerHTML = mode === 'race' ? '开始多人比赛 <span>→</span>' : '开始计时赛 <span>→</span>';
  }

  private refreshRecord(): void {
    const record = this.records.load();
    const value = record.bestTotalTime === null ? '暂无记录' : formatTime(record.bestTotalTime);
    this.recordLabel.innerHTML = `最佳总时间 — <span>${value}</span>`;
  }

  private require<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
}
