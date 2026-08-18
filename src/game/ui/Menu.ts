import { RaceMode } from '../systems/RaceSystem';
import { TimeTrialRecords } from '../../storage/TimeTrialRecords';
import { GhostStorage } from '../../storage/GhostStorage';
import { TRACK_CONFIGS, TrackId, formatTime } from '../constants';

const TRACK_EYEBROWS: Record<TrackId, string> = {
  meadow: 'SUNNY MEADOW CIRCUIT',
  desert: 'GOLDEN DUNES CIRCUIT',
  snow: 'FROST PEAK CIRCUIT',
  atoll: 'TROPICAL ATOLL CIRCUIT',
  autumn: 'MAPLE VALLEY CIRCUIT',
  lava: 'MAGMA CALDERA CIRCUIT',
  sakura: 'CHERRY SAKURA CIRCUIT',
  citadel: 'CLOCKWORK CITADEL CIRCUIT',
  crystal: 'CRYSTAL CAVERNS CIRCUIT',
};

const ALL_TRACK_IDS: TrackId[] = ['meadow', 'desert', 'snow', 'atoll', 'autumn', 'lava', 'sakura', 'citadel', 'crystal'];

export class Menu {
  private readonly root = this.require<HTMLElement>('#menu-screen');
  private readonly startButton = this.require<HTMLButtonElement>('#start-race');
  private readonly recordLabel = this.require<HTMLElement>('#menu-record');
  private readonly eyebrow = this.require<HTMLElement>('#menu-eyebrow');
  private readonly trackName = this.require<HTMLElement>('#menu-track-name');
  private readonly subtitle = this.require<HTMLElement>('#menu-subtitle');
  private readonly ghostReplayRow = this.require<HTMLElement>('#ghost-replay-toggle');
  private readonly ghostStatusText = this.require<HTMLElement>('#menu-ghost-status');
  private readonly ghostToggleButton = this.require<HTMLButtonElement>('#ghost-toggle-button');
  private mode: RaceMode = 'time-trial';
  private trackId: TrackId = 'meadow';
  private ghostEnabled = true;

  constructor(
    private readonly records: TimeTrialRecords,
    private readonly ghostStorage: GhostStorage,
    onStart: (mode: RaceMode) => void,
    private readonly onSelectTrack: (trackId: TrackId) => void,
    private readonly onToggleGhost?: (enabled: boolean) => void,
  ) {
    const timeTrial = this.require<HTMLButtonElement>('#time-trial-mode');
    const race = this.require<HTMLButtonElement>('#race-mode');
    timeTrial.addEventListener('click', () => this.selectMode('time-trial'));
    race.addEventListener('click', () => this.selectMode('race'));

    ALL_TRACK_IDS.forEach((id) => {
      const btn = this.require<HTMLButtonElement>(`#track-${id}`);
      btn.addEventListener('click', () => this.selectTrack(id));
    });

    this.ghostToggleButton.addEventListener('click', () => {
      this.setGhostEnabled(!this.ghostEnabled);
    });

    this.startButton.addEventListener('click', () => onStart(this.mode));
    this.refreshRecord();
  }

  get selectedMode(): RaceMode { return this.mode; }
  get selectedTrack(): TrackId { return this.trackId; }
  get isGhostEnabled(): boolean { return this.ghostEnabled; }

  setGhostEnabled(enabled: boolean): void {
    this.ghostEnabled = enabled;
    this.ghostToggleButton.classList.toggle('active', enabled);
    this.ghostToggleButton.setAttribute('aria-pressed', String(enabled));
    this.ghostToggleButton.textContent = enabled ? '已开启' : '已关闭';
    this.onToggleGhost?.(enabled);
  }

  show(): void {
    this.root.classList.remove('hidden');
    this.refreshRecord();
  }

  hide(): void { this.root.classList.add('hidden'); }

  selectTrack(trackId: TrackId): void {
    this.trackId = trackId;
    ALL_TRACK_IDS.forEach((id) => {
      const btn = this.require<HTMLButtonElement>(`#track-${id}`);
      const isCurrent = id === trackId;
      btn.classList.toggle('selected', isCurrent);
      btn.setAttribute('aria-pressed', String(isCurrent));
    });

    const config = TRACK_CONFIGS[trackId];
    this.eyebrow.textContent = TRACK_EYEBROWS[trackId] || 'RACING CIRCUIT';
    this.trackName.textContent = config.name;
    this.subtitle.textContent = config.subtitle;

    this.refreshRecord();
    this.onSelectTrack(trackId);
  }

  private selectMode(mode: RaceMode): void {
    this.mode = mode;
    const timeTrial = this.require<HTMLButtonElement>('#time-trial-mode');
    const race = this.require<HTMLButtonElement>('#race-mode');
    timeTrial.classList.toggle('selected', mode === 'time-trial');
    race.classList.toggle('selected', mode === 'race');
    timeTrial.setAttribute('aria-pressed', String(mode === 'time-trial'));
    race.setAttribute('aria-pressed', String(mode === 'race'));
    this.ghostReplayRow.classList.toggle('hidden', mode !== 'time-trial');
    this.startButton.innerHTML = mode === 'race' ? '开始多人比赛 <span>→</span>' : '开始计时赛 <span>→</span>';
  }

  refreshRecord(): void {
    const record = this.records.load(this.trackId);
    const value = record.bestTotalTime === null ? '暂无记录' : formatTime(record.bestTotalTime);
    this.recordLabel.innerHTML = `最佳总时间 — <span>${value}</span>`;

    const ghost = this.ghostStorage.loadGhost(this.trackId);
    if (ghost) {
      this.ghostStatusText.textContent = `已记录 (${formatTime(ghost.totalTime)})`;
    } else {
      this.ghostStatusText.textContent = '暂无记录';
    }
  }

  private require<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
}
