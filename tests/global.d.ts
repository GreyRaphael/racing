export {};

declare global {
  interface Window {
    __gameDebug?: {
      getState: () => Record<string, unknown>;
      advance: (seconds: number) => void;
      finishRace: () => void;
      completeLap: () => void;
      setPlayerLateral: (offset: number) => boolean;
      resetPlayer: () => void;
      getStorage: () => unknown;
    };
  }
}
