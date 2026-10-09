import { IAudioPlayer } from "../audio/IAudioPlayer";
import { preloadSharedAudioManifest } from "./AudioEventMap";

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
/**
 * Preloads shared audio manifest with a timeout guard to prevent hung initializations.
 *
 * @param audio - Target audio player instance implementing `IAudioPlayer`.
 * @param timeoutMs - Maximum duration in milliseconds to wait before resolving (default: 2000ms).
 * @public
 */
export async function preloadSharedAudioWithTimeout(
  audio: IAudioPlayer,
  timeoutMs: number = 2000
): Promise<void> {
  if (!audio) return;
  await Promise.race([
    preloadSharedAudioManifest(audio),
    new Promise((resolve) => setTimeout(resolve, timeoutMs))
  ]);
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

  await Promise.all(
    assets.map((asset) =>
      audio.loadSFX(asset.id, asset.path).catch((e) => {
        console.error(`[Audio] Failed to load asset "${asset.id}" from "${asset.path}":`, e);
      })
    )
  );
}
