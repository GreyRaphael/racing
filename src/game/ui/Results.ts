import { TRACK_CONFIGS, TrackConfig, formatTime } from '../constants';
import { RaceResult, RaceMode } from '../systems/RaceSystem';

export class Results {
  private readonly root = this.require<HTMLElement>('#results-panel');
  private readonly title = this.require<HTMLElement>('#results-title');
  private readonly caption = this.require<HTMLElement>('#results-caption');
  private readonly total = this.require<HTMLElement>('#result-total-time');
  private readonly bestLap = this.require<HTMLElement>('#result-best-lap');
  private readonly ranking = this.require<HTMLElement>('#results-ranking');

  constructor(onRestart: () => void, onMenu: () => void) {
    this.require<HTMLButtonElement>('#restart-race').addEventListener('click', onRestart);
    this.require<HTMLButtonElement>('#back-to-menu').addEventListener('click', onMenu);
  }

  show(result: RaceResult, mode: RaceMode, trackConfig: TrackConfig = TRACK_CONFIGS.meadow): void {
    this.root.classList.remove('hidden');
    this.title.textContent = mode === 'race' ? this.getRaceTitle(result) : '漂亮完赛！';
    this.caption.textContent = mode === 'race' ? `${trackConfig.name}最终排名` : `${trackConfig.name}圈速记录`;
    this.total.textContent = formatTime(result.totalTime);
    const laps = result.lapTimes.length > 0 ? result.lapTimes : [result.totalTime];
    this.bestLap.textContent = formatTime(Math.min(...laps));
    this.ranking.innerHTML = result.ranking.map((entry, index) => `
      <div class="rank-row ${entry.name === '你' ? 'player' : ''}">
        <span class="rank-number">${index + 1}</span>
        <span>${entry.name}</span>
        <strong>${entry.finished ? (entry.finishTime === null ? 'FINISH' : formatTime(entry.finishTime)) : '进行中'}</strong>
      </div>
    `).join('');
  }

  hide(): void { this.root.classList.add('hidden'); }

  private getRaceTitle(result: RaceResult): string {
    const position = result.ranking.findIndex((entry) => entry.name === '你') + 1;
    return position === 1 ? '你是冠军！' : `冲过终点：第 ${position} 名`;
  }

  private require<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
}
