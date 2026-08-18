export {};

declare global {
  interface Window {
    __gameDebug?: {
      getState: () => Record<string, unknown>;
      advance: (seconds: number) => void;
      finishRace: () => void;
      completeLap: () => void;
      setPlayerLateral: (offset: number) => boolean;
      setPlayerProgress: (progress: number, lateralOffset?: number) => boolean;
      resetPlayer: () => void;
      setTrack: (trackId: 'meadow' | 'desert' | 'snow' | 'atoll' | 'autumn' | 'lava' | 'sakura' | 'citadel' | 'crystal') => boolean;
      getStorage: (trackId?: 'meadow' | 'desert' | 'snow' | 'atoll' | 'autumn' | 'lava' | 'sakura' | 'citadel' | 'crystal') => unknown;
      getGhostStorage: (trackId?: 'meadow' | 'desert' | 'snow' | 'atoll' | 'autumn' | 'lava' | 'sakura' | 'citadel' | 'crystal') => unknown;
      setGhostEnabled: (enabled: boolean) => boolean;
    };
  }
}
