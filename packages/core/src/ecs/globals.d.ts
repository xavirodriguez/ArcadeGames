declare global {
  var __DEV__: boolean;
  var __ACTIVE_GAME_LOOPS__: Array<{ stop: () => void }> | undefined;
}
export {};
