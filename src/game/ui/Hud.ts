import { TRACK_CONFIGS, TrackConfig, TrackId, formatTime } from '../constants';
import { PlayerKart } from '../kart/PlayerKart';
import { RaceMode, RaceSystem } from '../systems/RaceSystem';
import { GhostSystem } from '../systems/GhostSystem';
import { TimeTrialRecords } from '../../storage/TimeTrialRecords';

export class Hud {
  private readonly root = this.require<HTMLElement>('#race-hud');
  private readonly brandMark = this.require<HTMLElement>('#brand-mark');
  private readonly modeLabel = this.require<HTMLElement>('#mode-label');
  private readonly lap = this.require<HTMLElement>('#lap-counter');
  private readonly lapTime = this.require<HTMLElement>('#lap-time');
  private readonly raceTime = this.require<HTMLElement>('#race-time');
  private readonly bestLap = this.require<HTMLElement>('#best-lap');
  private readonly speed = this.require<HTMLElement>('#speed-value');
  private readonly countdown = this.require<HTMLElement>('#countdown');
  private readonly positionCard = this.require<HTMLElement>('#position-card');
  private readonly position = this.require<HTMLElement>('#position-counter');
  private readonly leaderName = this.require<HTMLElement>('#leader-name');
  private readonly progressFill = this.require<HTMLElement>('#progress-fill');
  private readonly ghostProgressMarker = this.require<HTMLElement>('#ghost-progress-marker');
  private readonly ghostDeltaCard = this.require<HTMLElement>('#ghost-delta-card');
  private readonly ghostDelta = this.require<HTMLElement>('#ghost-delta');
  private readonly ghostTargetTime = this.require<HTMLElement>('#ghost-target-time');
  private readonly driftIndicator = this.require<HTMLElement>('#drift-indicator');
  private activeTrackId: TrackId = 'meadow';

  constructor(private readonly records: TimeTrialRecords) {}

  show(mode: RaceMode, trackConfig: TrackConfig = TRACK_CONFIGS.meadow): void {
    this.activeTrackId = trackConfig.id;
    this.root.classList.remove('hidden');
    this.brandMark.innerHTML = `${trackConfig.shortCode.split('•')[0].trim()} <span>•</span> ${trackConfig.shortCode.split('•')[1]?.trim() ?? '01'}`;
    this.modeLabel.textContent = `${trackConfig.name} · ${mode === 'race' ? '多人比赛' : '个人计时赛'}`;
    this.positionCard.classList.toggle('hidden', mode !== 'race');
    this.refreshRecord(trackConfig.id);
  }

  hide(): void { this.root.classList.add('hidden'); }

  refreshRecord(trackId: TrackId = this.activeTrackId): void {
    this.activeTrackId = trackId;
    const record = this.records.load(trackId);
    this.bestLap.textContent = record.bestLapTime === null ? '最佳 —' : `最佳 ${formatTime(record.bestLapTime)}`;
  }

  update(race: RaceSystem, player: PlayerKart, ghostSystem?: GhostSystem): void {
    this.lap.innerHTML = `${Math.min(player.lap, race.totalLaps)} <small>/ ${race.totalLaps}</small>`;
    this.lapTime.textContent = formatTime(race.currentLapTime);
    this.raceTime.textContent = formatTime(race.elapsedTime);
    this.speed.textContent = Math.round(Math.abs(player.speed) * 3.6).toString();
    this.progressFill.style.width = `${Math.round(player.progress * 1000) / 10}%`;
    this.driftIndicator.classList.toggle('active', player.isDrifting);
    this.driftIndicator.textContent = player.isDrifting ? 'DRIFTING' : player.isOffRoad ? 'OFF ROAD' : 'DRIFT READY';

    const isCountdown = race.phase === 'countdown';
    this.countdown.classList.toggle('hidden', !isCountdown);
    this.countdown.textContent = isCountdown ? String(race.countdownNumber) : '';

    if (race.mode === 'race') {
      this.position.innerHTML = `${race.playerPosition} <small>/ ${race.karts.length}</small>`;
      const leader = race.getRanking()[0];
      this.leaderName.textContent = `领先：${leader?.name ?? '你'}`;
      this.ghostDeltaCard.classList.add('hidden');
      this.ghostProgressMarker.classList.add('hidden');
    } else if (ghostSystem && ghostSystem.enabled && ghostSystem.hasActiveGhost) {
      this.ghostDeltaCard.classList.remove('hidden');
      this.ghostProgressMarker.classList.remove('hidden');
      const ghostData = ghostSystem.currentGhost;
      if (ghostData) {
        this.ghostTargetTime.textContent = `幽灵 ${formatTime(ghostData.totalTime)}`;
      }

      const playerTotalProgress = (player.lap - 1) + player.progress;
      const delta = ghostSystem.calculateDelta(playerTotalProgress, race.elapsedTime);
      if (delta !== null && race.phase === 'racing') {
        const sign = delta < 0 ? '-' : '+';
        const formatted = `${sign}${Math.abs(delta).toFixed(2)}s`;
        this.ghostDelta.textContent = formatted;
        this.ghostDelta.className = delta <= 0 ? 'leading' : 'trailing';
      } else {
        this.ghostDelta.textContent = '±0.00s';
        this.ghostDelta.className = '';
      }

      const ghostLapProgress = ghostSystem.ghostKart.progress % 1;
      this.ghostProgressMarker.style.left = `${Math.round(ghostLapProgress * 1000) / 10}%`;
    } else {
      this.ghostDeltaCard.classList.add('hidden');
      this.ghostProgressMarker.classList.add('hidden');
    }
  }

  private require<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
}
