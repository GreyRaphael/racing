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
      setTrack: (trackId: 'meadow' | 'desert' | 'snow') => boolean;
      getStorage: (trackId?: 'meadow' | 'desert' | 'snow') => unknown;
    };
  }
}
