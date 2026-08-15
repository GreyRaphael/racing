import * as THREE from 'three';
import { COLORS, DESTROY_CLOSING_SPEED, TRACK_CONFIGS, TrackConfig, TrackId } from './constants';
import { Environment } from './track/Environment';
import { Track } from './track/Track';
import { AiKart } from './kart/AiKart';
import { PlayerKart } from './kart/PlayerKart';
import { AudioSystem } from './systems/AudioSystem';
import { CameraSystem } from './systems/CameraSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { InputSystem } from './systems/InputSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { RaceMode, RaceSystem } from './systems/RaceSystem';
import { Hud } from './ui/Hud';
import { Menu } from './ui/Menu';
import { Results } from './ui/Results';
import { TimeTrialRecords } from '../storage/TimeTrialRecords';

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(61, window.innerWidth / window.innerHeight, 0.25, 750);
  readonly renderer: THREE.WebGLRenderer;
  track = new Track(TRACK_CONFIGS.meadow);
  environment = new Environment(this.track);
  readonly input = new InputSystem();
  readonly records = new TimeTrialRecords();
  readonly audio = new AudioSystem();
  readonly particles = new ParticleSystem();
  readonly player = new PlayerKart(this.track);
  readonly ai: AiKart[] = [
    new AiKart('小蓝', COLORS.blue, this.track, { speed: 19.5, lookahead: 0.026, steeringBias: -0.025 }),
    new AiKart('阳光', COLORS.yellow, this.track, { speed: 18.2, lookahead: 0.031, steeringBias: 0.018 }),
    new AiKart('紫电', COLORS.purple, this.track, { speed: 17.3, lookahead: 0.035, steeringBias: -0.01 }),
  ];
  readonly race: RaceSystem;
  readonly collision: CollisionSystem;
  readonly cameraSystem: CameraSystem;
  readonly menu: Menu;
  readonly hud: Hud;
  readonly results: Results;
  private readonly clock = new THREE.Clock();
  private hemisphereLight!: THREE.HemisphereLight;
  private sunlight!: THREE.DirectionalLight;
  private activeMode: RaceMode = 'time-trial';
  private activeTrackId: TrackId = 'meadow';
  private animationFrame = 0;
  private lastPhase = 'menu';
  private lastCountdownNumber = 0;
  private started = false;
  private readonly onResize = (): void => this.resize();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const initialTheme = TRACK_CONFIGS.meadow.theme;
    this.scene.background = new THREE.Color(initialTheme.sky);
    this.scene.fog = new THREE.Fog(initialTheme.fog, initialTheme.fogNear, initialTheme.fogFar);
    this.setupLighting();
    this.scene.add(this.environment.group, this.track.group, this.particles.group);
    this.scene.add(this.player.group);
    for (const kart of this.ai) {
      kart.group.visible = false;
      this.scene.add(kart.group);
    }

    this.race = new RaceSystem(this.track, this.player, this.ai, this.records, this.activeTrackId);
    this.collision = new CollisionSystem(this.track);
    this.cameraSystem = new CameraSystem(this.camera);
    this.menu = new Menu(
      this.records,
      (mode) => this.startRace(mode),
      (trackId) => this.setTrack(trackId),
    );
    this.hud = new Hud(this.records);
    this.results = new Results(() => this.startRace(this.activeMode), () => this.returnToMenu());
    window.addEventListener('resize', this.onResize);
    this.installDebugInterface();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.menu.show();
    this.clock.start();
    this.loop();
  }

  setTrack(trackId: TrackId): void {
    if (this.activeTrackId === trackId && this.started) return;
    this.activeTrackId = trackId;
    const config: TrackConfig = TRACK_CONFIGS[trackId];

    // Remove old geometry
    this.scene.remove(this.track.group, this.environment.group);
    this.track.dispose();
    this.environment.dispose();

    // Create new track & scenery
    this.track = new Track(config);
    this.environment = new Environment(this.track);
    this.scene.add(this.environment.group, this.track.group);

    // Apply atmospheric theme
    const theme = config.theme;
    (this.scene.background as THREE.Color).set(theme.sky);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.set(theme.fog);
      this.scene.fog.near = theme.fogNear;
      this.scene.fog.far = theme.fogFar;
    }
    this.hemisphereLight.color.set(theme.hemisphereSky);
    this.hemisphereLight.groundColor.set(theme.hemisphereGround);
    this.hemisphereLight.intensity = theme.hemisphereIntensity;
    this.sunlight.color.set(theme.sunlightColor);
    this.sunlight.intensity = theme.sunlightIntensity;
    this.sunlight.position.set(...theme.sunlightPos);
    this.particles.setDustColor(theme.dustColor);

    // Re-bind systems
    this.player.setTrack(this.track);
    for (const kart of this.ai) kart.setTrack(this.track);
    this.collision.setTrack(this.track);
    this.race.setTrack(this.track, trackId);

    // Reset player position on new track
    this.player.resetRaceState();
    this.player.placeAt(0.002, 0);
    this.cameraSystem.update(1 / 60, this.player);
    this.hud.refreshRecord(trackId);
  }

  private startRace(mode: RaceMode): void {
    this.activeMode = mode;
    this.audio.initialize();
    this.audio.resume();
    this.race.begin(mode);
    this.lastCountdownNumber = 0;
    this.menu.hide();
    this.results.hide();
    this.hud.show(mode, TRACK_CONFIGS[this.activeTrackId]);
    this.lastPhase = this.race.phase;
    this.hud.update(this.race, this.player);
  }

  private returnToMenu(): void {
    this.race.phase = 'menu';
    this.audio.stopEngine();
    this.results.hide();
    this.hud.hide();
    this.menu.show();
    for (const kart of this.ai) kart.group.visible = false;
    this.player.resetRaceState();
    this.player.placeAt(0.002, 0);
  }

  private loop = (): void => {
    this.animationFrame = window.requestAnimationFrame(this.loop);
    const delta = Math.min(0.05, this.clock.getDelta());
    this.step(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private step(delta: number): void {
    const canDrive = this.race.isDrivingAllowed();
    const allKarts = this.race.karts;
    for (const kart of allKarts) kart.collisionCooldown = Math.max(0, kart.collisionCooldown - delta);
    const resetPressed = this.input.consumeReset();
    if (resetPressed && this.race.phase !== 'menu') {
      this.collision.reset(this.player);
      this.particles.burst(this.player.position);
    }

    if (this.race.phase !== 'menu' && this.race.phase !== 'results') {
      this.player.update(delta, this.input.state, canDrive);
      const playerRaceProgress = this.player.lap - 1 + this.player.progress;
      if (this.race.mode === 'race') {
        for (const kart of this.ai) kart.update(delta, canDrive, playerRaceProgress);
      }
      const collisionResolution = this.collision.resolve(allKarts);
      for (const [kart, result] of collisionResolution.results) {
        if (result.fenceHit && kart.collisionCooldown <= 0) {
          kart.collisionCooldown = 0.18;
          this.audio.collision();
          this.particles.burst(kart.position);
        } else if (result.grassEntered) {
          this.audio.grass();
        }
      }
      for (const collision of collisionResolution.vehicleCollisions) {
        // Only an opponent in front is removed. The rear kart keeps its speed,
        // steering and drift state instead of exchanging velocities and sticking.
        if (
          collision.front !== this.player &&
          collision.destructiveCandidate &&
          collision.closingSpeed >= DESTROY_CLOSING_SPEED &&
          !collision.front.destroyed
        ) {
          collision.rear.speed = collision.rearSpeed;
          collision.rear.lateralVelocity = collision.rearLateralVelocity;
          collision.rear.yaw = collision.rearYaw;
          collision.rear.updateVisual(0);
          collision.front.destroyFor(3);
          this.audio.collision();
          this.particles.burst(collision.front.position);
        } else if (this.player.collisionCooldown <= 0) {
          this.player.collisionCooldown = 0.18;
          this.audio.collision();
          this.particles.burst(this.player.position);
        }
      }
      if (this.player.isDrifting && canDrive) this.audio.drift();
      this.race.update(delta);
      this.syncCountdownBeep();
      this.audio.update(this.player.speed, this.input.state.throttle);
      this.particles.update(delta, this.player);
      this.cameraSystem.update(delta, this.player);
      this.hud.update(this.race, this.player);
    }

    if (this.race.phase !== this.lastPhase) {
      this.handlePhaseChange();
      this.lastPhase = this.race.phase;
    }
  }

  private handlePhaseChange(): void {
    if (this.race.phase === 'results' && this.race.result) {
      this.hud.hide();
      this.audio.stopEngine();
      this.results.show(this.race.result, this.activeMode, TRACK_CONFIGS[this.activeTrackId]);
      this.audio.finish();
    }
  }

  private syncCountdownBeep(): void {
    const number = this.race.phase === 'countdown' ? this.race.countdownNumber : 0;
    if (number === this.lastCountdownNumber) return;
    this.lastCountdownNumber = number;
    if (number > 0) this.audio.countdown();
  }

  private setupLighting(): void {
    this.hemisphereLight = new THREE.HemisphereLight(0xe4f7ff, 0x6d9a55, 2.2);
    this.scene.add(this.hemisphereLight);
    this.sunlight = new THREE.DirectionalLight(0xfff4cf, 3.8);
    this.sunlight.position.set(-35, 62, -28);
    this.sunlight.castShadow = true;
    this.sunlight.shadow.bias = -0.0003;
    this.sunlight.shadow.normalBias = 0.02;
    this.sunlight.shadow.mapSize.set(2048, 2048);
    this.sunlight.shadow.camera.left = -70;
    this.sunlight.shadow.camera.right = 70;
    this.sunlight.shadow.camera.top = 70;
    this.sunlight.shadow.camera.bottom = -70;
    this.sunlight.shadow.camera.near = 1;
    this.sunlight.shadow.camera.far = 180;
    this.scene.add(this.sunlight);
  }

  private resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private installDebugInterface(): void {
    if (!import.meta.env.DEV) return;
    window.__gameDebug = {
      getState: () => ({
        ...this.race.getDebugState(),
        trackId: this.activeTrackId,
        player: this.player.getDebugState(),
        karts: this.race.karts.map((kart) => kart.getDebugState()),
        input: { ...this.input.state },
        storage: this.records.load(this.activeTrackId),
      }),
      advance: (seconds: number) => {
        const safeSeconds = Math.max(0, Math.min(seconds, 120));
        const frames = Math.ceil(safeSeconds * 60);
        for (let i = 0; i < frames; i += 1) this.step(Math.min(1 / 60, safeSeconds / Math.max(1, frames)));
        this.renderer.render(this.scene, this.camera);
      },
      finishRace: () => {
        this.race.forceFinish();
        this.syncAfterDebugCommand();
      },
      completeLap: () => {
        this.race.forceCompleteLap();
        this.syncAfterDebugCommand();
      },
      setPlayerLateral: (offset: number) => {
        this.collision.forceToOffset(this.player, offset);
        return true;
      },
      setPlayerProgress: (progress: number, lateralOffset = 0) => {
        this.player.placeAt(progress, lateralOffset);
        this.player.speed = 0;
        this.player.updateTrackQuery();
        this.cameraSystem.update(1 / 60, this.player);
        this.hud.update(this.race, this.player);
        return true;
      },
      resetPlayer: () => this.collision.reset(this.player),
      setTrack: (trackId: TrackId) => {
        this.setTrack(trackId);
        this.menu.selectTrack(trackId);
        return true;
      },
      getStorage: (trackId: TrackId = this.activeTrackId) => this.records.load(trackId),
    };
  }

  private syncAfterDebugCommand(): void {
    this.hud.refreshRecord(this.activeTrackId);
    this.hud.update(this.race, this.player);
    if (this.race.phase !== this.lastPhase) {
      this.handlePhaseChange();
      this.lastPhase = this.race.phase;
    }
  }

  dispose(): void {
    window.cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.track.dispose();
    this.environment.dispose();
    this.particles.dispose();
    this.audio.dispose();
    this.renderer.dispose();
  }
}
