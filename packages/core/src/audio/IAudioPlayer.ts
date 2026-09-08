/**
 * Contract interface for audio playback services across platforms (web, mobile, headless).
 *
 * @remarks
 * Implementations manage sound effect (SFX) loading and playback, background music (BGM) playback state,
 * volume settings, and 2D spatial audio positioning.
 *
 * @example
 * ```ts
 * const audioPlayer: IAudioPlayer = new NullAudioPlayer();
 * await audioPlayer.loadSFX("laser", { uri: "assets/sfx/laser.wav" });
 * audioPlayer.playSFX("laser");
 * ```
 *
 * @public
 */
export interface IAudioPlayer {
  /**
   * Asynchronously preloads a sound effect resource.
   *
   * @param id - Unique identifier for the sound effect.
   * @param options - Platform-dependent audio loading options or source path configuration.
   * @returns A promise that resolves when the audio clip is fully loaded and ready for playback.
   */
  loadSFX(id: string, options: unknown): Promise<void>;

  /**
   * Plays a preloaded sound effect.
   *
   * @param id - Unique identifier of the sound effect to trigger.
   * @param options - Optional playback configuration options (e.g. volume, pitch, loop).
   */
  playSFX(id: string, options?: unknown): void;

  /**
   * Starts playback of a background music track.
   *
   * @param id - Unique identifier of the background music track.
   * @param options - Optional music playback options.
   */
  playBGM(id: string, options?: unknown): void;

  /**
   * Stops active background music playback completely.
   */
  stopBGM(): void;

  /**
   * Pauses active background music playback at its current position.
   */
  pauseBGM(): void;

  /**
   * Adjusts the global master volume level.
   *
   * @param v - Volume ratio between 0.0 (silent) and 1.0 (full output).
   */
  setMasterVolume(v: number): void;

  /**
   * Adjusts the sound effects (SFX) bus volume level.
   *
   * @param v - Volume ratio between 0.0 (silent) and 1.0 (full output).
   */
  setSFXVolume(v: number): void;

  /**
   * Adjusts the background music (BGM) bus volume level.
   *
   * @param v - Volume ratio between 0.0 (silent) and 1.0 (full output).
   */
  setBGMVolume(v: number): void;

  /**
   * Plays a sound effect with 2D spatial panning and distance attenuation.
   *
   * @param id - Unique identifier of the sound effect.
   * @param x - Sound emitter X coordinate in world space.
   * @param y - Sound emitter Y coordinate in world space.
   * @param listenerX - Audio listener X coordinate in world space.
   * @param listenerY - Audio listener Y coordinate in world space.
   * @param maxDistance - Maximum distance beyond which the audio is completely attenuated.
   */
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
 * A fallback implementation of {@link IAudioPlayer} that performs no operations.
 * Suitable for headless environments, server execution, or unit testing.
 *
 * @remarks
 * All playback and volume control methods execute as no-ops. `loadSFX` returns an instantly resolving promise.
 *
 * @example
 * ```ts
 * const nullAudio = new NullAudioPlayer();
 * nullAudio.playSFX("explosion"); // Safe no-op in headless/server tests
 * ```
 *
 * @public
 */
export class NullAudioPlayer implements IAudioPlayer {
  /**
   * No-op implementation of sound effect preloading.
   *
   * @param _id - Ignored sound identifier.
   * @param _options - Ignored loading options.
   * @returns Resolves immediately.
   */
  public async loadSFX(_id: string, _options: unknown): Promise<void> {}

  /**
   * No-op implementation of sound effect trigger.
   *
   * @param _id - Ignored sound identifier.
   * @param _options - Ignored playback options.
   */
  public playSFX(_id: string, _options?: unknown): void {}

  /**
   * No-op implementation of background music playback.
   *
   * @param _id - Ignored track identifier.
   * @param _options - Ignored playback options.
   */
  public playBGM(_id: string, _options?: unknown): void {}

  /**
   * No-op implementation of background music stopping.
   */
  public stopBGM(): void {}

  /**
   * No-op implementation of background music pausing.
   */
  public pauseBGM(): void {}

  /**
   * No-op implementation of master volume adjustment.
   *
   * @param _v - Ignored volume level.
   */
  public setMasterVolume(_v: number): void {}

  /**
   * No-op implementation of SFX bus volume adjustment.
   *
   * @param _v - Ignored volume level.
   */
  public setSFXVolume(_v: number): void {}

  /**
   * No-op implementation of BGM bus volume adjustment.
   *
   * @param _v - Ignored volume level.
   */
  public setBGMVolume(_v: number): void {}

  /**
   * No-op implementation of spatial sound effect playback.
   *
   * @param _id - Ignored sound identifier.
   * @param _x - Ignored sound X position.
   * @param _y - Ignored sound Y position.
   * @param _listenerX - Ignored listener X position.
   * @param _listenerY - Ignored listener Y position.
   * @param _maxDistance - Ignored distance threshold.
   */
  public playSpatialSFX(
    _id: string,
    _x: number,
    _y: number,
    _listenerX: number,
    _listenerY: number,
    _maxDistance: number
  ): void {}
}
