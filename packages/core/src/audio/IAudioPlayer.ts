/** @public */
export interface IAudioPlayer {
  loadSFX(id: string, options: unknown): Promise<void>;
  playSFX(id: string, options?: unknown): void;

  // Background Music (BGM)
  playBGM(id: string, options?: unknown): void;
  stopBGM(): void;
  pauseBGM(): void;

  // Volume Control
  setMasterVolume(v: number): void;
  setSFXVolume(v: number): void;
  setBGMVolume(v: number): void;

  // Spatial Audio
  playSpatialSFX(
    id: string,
    x: number,
    y: number,
    listenerX: number,
    listenerY: number,
    maxDistance: number
  ): void;
}

/**
 * A fallback implementation of IAudioPlayer that performs no operations.
 * Suitable for headless environments, server execution, or testing.
 * @public
 */
export class NullAudioPlayer implements IAudioPlayer {
  public async loadSFX(_id: string, _options: unknown): Promise<void> {}
  public playSFX(_id: string, _options?: unknown): void {}

  public playBGM(_id: string, _options?: unknown): void {}
  public stopBGM(): void {}
  public pauseBGM(): void {}

  public setMasterVolume(_v: number): void {}
  public setSFXVolume(_v: number): void {}
  public setBGMVolume(_v: number): void {}

  public playSpatialSFX(
    _id: string,
    _x: number,
    _y: number,
    _listenerX: number,
    _listenerY: number,
    _maxDistance: number
  ): void {}
}
