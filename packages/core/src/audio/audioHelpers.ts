import { IAudioPlayer } from "../audio/IAudioPlayer";

/**
 * Audio asset entry representing a sound effect identifier and file path.
 *
 * @example
 * ```ts
 * const sfxAsset: AudioAsset = {
 *   id: "laser_fire",
 *   path: "assets/audio/sfx/laser.wav"
 * };
 * ```
 *
 * @public
 */
export interface AudioAsset {
  /** Unique string key or identifier for the audio clip. */
  id: string;
  /** File path, URI, or URL to the audio asset. */
  path: string;
}

/**
 * Loads a collection of audio assets using the provided `IAudioPlayer` with unified error handling.
 *
 * @param audio - Target audio player instance implementing `IAudioPlayer`.
 * @param assets - Array of audio assets to load.
 * @public
 */
export async function loadAudioAssets(
  audio: IAudioPlayer,
  assets: AudioAsset[]
): Promise<void> {
  if (!audio || !assets || assets.length === 0) return;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    try {
      await audio.loadSFX(asset.id, asset.path);
    } catch (e) {
      console.error(`[Audio] Failed to load asset "${asset.id}" from "${asset.path}":`, e);
    }
  }
}
