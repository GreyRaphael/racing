export class AudioSystem {
  private context: AudioContext | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private enabled = true;
  private readonly lastPlayed = new Map<string, number>();

  initialize(): void {
    if (!this.enabled || this.context) return;
    try {
      this.context = new AudioContext();
      this.engineOscillator = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.engineOscillator.type = 'sawtooth';
      this.engineGain.gain.value = 0;
      this.engineOscillator.connect(this.engineGain).connect(this.context.destination);
      this.engineOscillator.start();
    } catch {
      this.enabled = false;
    }
  }

  resume(): void {
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  update(speed: number, throttle: boolean): void {
    if (!this.context || !this.engineOscillator || !this.engineGain) return;
    const now = this.context.currentTime;
    const magnitude = Math.min(1, Math.abs(speed) / 22);
    this.engineOscillator.frequency.setTargetAtTime(70 + magnitude * 170 + (throttle ? 22 : 0), now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.012 + magnitude * 0.035, now, 0.08);
  }

  countdown(): void { this.playThrottled('countdown', 440, 0.09, 0); }
  finish(): void { this.playThrottled('finish', 740, 0.18, 0); }
  collision(): void { this.playThrottled('collision', 115, 0.1, 0.12); }
  grass(): void { this.playThrottled('grass', 82, 0.045, 0.16); }
  drift(): void { this.playThrottled('drift', 210, 0.045, 0.09); }

  dispose(): void {
    this.engineOscillator?.stop();
    this.context?.close();
    this.engineOscillator = null;
    this.engineGain = null;
    this.context = null;
  }

  private playThrottled(key: string, frequency: number, duration: number, cooldown: number): void {
    const now = performance.now() / 1000;
    if ((this.lastPlayed.get(key) ?? -Infinity) + cooldown > now) return;
    this.lastPlayed.set(key, now);
    this.beep(frequency, duration);
  }

  private beep(frequency: number, duration: number): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
