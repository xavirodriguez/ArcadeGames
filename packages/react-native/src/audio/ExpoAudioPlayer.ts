import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from "expo-audio";
import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";
import {
  SHARED_AUDIO_MANIFEST,
  type AudioAssetDefinition,
  type AudioPlayOptions,
  type IAudioPlayer
} from "@tiny-aster/core";
import { resolveNativeAudioSource } from "./nativeAudioManifest";

interface AudioPlayerWithPan extends AudioPlayer {
  pan?: number;
}

const MAX_SFX_POOL_SIZE = 4;

/**
 * Configures the native audio mode settings for Expo audio.
 *
 * @remarks
 * Sets silent mode playback, restricts background playback, and sets interruption handling to `doNotMix`.
 * @public
 */
export async function configureNativeAudioMode(): Promise<void> {
  try {
    if (typeof setAudioModeAsync === "function") {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "doNotMix"
      });
    }
  } catch (e) {
    console.warn("[ExpoAudioPlayer] Failed to configure native audio mode:", e);
  }
}

/**
 * Native implementation of {@link IAudioPlayer} powered by `expo-audio`.
 *
 * @remarks
 * Designed for native React Native/Expo environments (iOS, Android, Hermes) where
 * Web Audio API (`window.AudioContext`) is unavailable. Manages preloaded sound effect
 * player pools, background music playback, volume controls, cooldown rate-limiting,
 * spatial audio panning, AppState lifecycle pause/resume, and resource disposal.
 *
 * @public
 */
export class ExpoAudioPlayer implements IAudioPlayer {
  private sfxPools = new Map<string, AudioPlayer[]>();
  private sfxPoolIndices = new Map<string, number>();
  private sfxSources = new Map<string, unknown>();
  private sfxLastPlayTime = new Map<string, number>();

  private bgmPlayer: AudioPlayer | null = null;
  private currentBgmUrl: string | null = null;
  private wasBgmPlayingBeforeBackground = false;

  private masterVolume = 1.0;
  private sfxVolume = 0.85;
  private bgmVolume = 0.35;

  private appStateSubscription: NativeEventSubscription | null = null;

  constructor() {
    configureNativeAudioMode().catch(() => {});

    if (typeof AppState?.addEventListener === "function") {
      try {
        this.appStateSubscription = AppState.addEventListener("change", this.handleAppStateChange);
      } catch (_e) {
        // Safe fallback when AppState listener cannot be registered
      }
    }
  }

  /**
   * Handles React Native AppState changes to pause BGM on background and resume on active.
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === "background" || nextAppState === "inactive") {
      if (this.bgmPlayer) {
        try {
          this.wasBgmPlayingBeforeBackground = true;
          this.bgmPlayer.pause();
        } catch (_e) {
          // Defensive safe catch
        }
      }
    } else if (nextAppState === "active") {
      configureNativeAudioMode().catch(() => {});
      if (this.wasBgmPlayingBeforeBackground && this.bgmPlayer) {
        try {
          this.bgmPlayer.play();
        } catch (_e) {
          // Defensive safe catch
        }
      }
      this.wasBgmPlayingBeforeBackground = false;
    }
  };

  /**
   * Preloads a sound effect using `expo-audio` and registers it in the sound player pool.
   *
   * @param id - Sound effect identifier.
   * @param options - Audio source path, URI, module ID, or configuration object.
   *
   * @example
   * ```ts
   * await player.loadSFX("shoot", "/assets/audio/combat/shoot.wav");
   * ```
   */
  public async loadSFX(id: string, options?: unknown): Promise<void> {
    try {
      let sourcePathOrUri: unknown = options;

      if (!sourcePathOrUri || sourcePathOrUri === id) {
        const manifestEntry = SHARED_AUDIO_MANIFEST.find((a: AudioAssetDefinition) => a.id === id);
        if (manifestEntry) {
          sourcePathOrUri = manifestEntry.path;
        } else {
          sourcePathOrUri = id;
        }
      }

      const resolvedSource = resolveNativeAudioSource(sourcePathOrUri);
      this.sfxSources.set(id, resolvedSource);

      let sourceToLoad: AudioSource = null;
      if (typeof resolvedSource === "number") {
        sourceToLoad = resolvedSource;
      } else if (typeof resolvedSource === "string") {
        sourceToLoad = { uri: resolvedSource };
      } else if (typeof resolvedSource === "object" && resolvedSource !== null) {
        sourceToLoad = resolvedSource as AudioSource;
      }

      const player = createAudioPlayer(sourceToLoad);
      if (player) {
        const pool = this.sfxPools.get(id) || [];
        pool.push(player);
        this.sfxPools.set(id, pool);
      }
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Failed to load/create AudioPlayer for SFX "${id}":`, e);
    }
  }

  /**
   * Triggers playback for a preloaded sound effect with cooldowns, volume scaling, pitch, and pooling.
   *
   * @param id - Sound effect identifier.
   * @param options - Playback options like volume, pitchRange, or cooldownMs.
   */
  public playSFX(id: string, options?: unknown): void {
    const opts = (typeof options === "object" && options !== null ? options : {}) as AudioPlayOptions;

    const now = performance.now();
    if (opts.cooldownMs && opts.cooldownMs > 0) {
      const last = this.sfxLastPlayTime.get(id) || 0;
      if (now - last < opts.cooldownMs) {
        return;
      }
    }
    this.sfxLastPlayTime.set(id, now);

    const pool = this.sfxPools.get(id);
    if (!pool || pool.length === 0) {
      // Lazy attempt to load/create if sound was requested without prior loadSFX
      this.loadSFX(id, options)
        .then(() => {
          const loadedPool = this.sfxPools.get(id);
          if (loadedPool && loadedPool.length > 0) {
            const player = this.selectPlayerFromPool(id, loadedPool);
            this.triggerPlayerSFX(id, player, opts);
          }
        })
        .catch((e) => {
          console.warn(`[ExpoAudioPlayer] Failed lazy load for SFX "${id}":`, e);
        });
      return;
    }

    const player = this.selectPlayerFromPool(id, pool);
    this.triggerPlayerSFX(id, player, opts);
  }

  /**
   * Selects an available player from the pool, expanding the pool up to `MAX_SFX_POOL_SIZE` if needed.
   */
  private selectPlayerFromPool(id: string, pool: AudioPlayer[]): AudioPlayer {
    const currentIndex = this.sfxPoolIndices.get(id) || 0;
    let selectedPlayer = pool[currentIndex % pool.length];

    // Check if we can allocate a new player instance up to max pool size
    if (pool.length < MAX_SFX_POOL_SIZE) {
      const rawSource = this.sfxSources.get(id);
      if (rawSource !== undefined) {
        let sourceToLoad: AudioSource = null;
        if (typeof rawSource === "number") {
          sourceToLoad = rawSource;
        } else if (typeof rawSource === "string") {
          sourceToLoad = { uri: rawSource };
        } else if (typeof rawSource === "object" && rawSource !== null) {
          sourceToLoad = rawSource as AudioSource;
        }
        try {
          const newPlayer = createAudioPlayer(sourceToLoad);
          if (newPlayer) {
            pool.push(newPlayer);
            selectedPlayer = newPlayer;
          }
        } catch (_e) {
          // Fall back to round-robin selected player if allocation fails
        }
      }
    }

    this.sfxPoolIndices.set(id, currentIndex + 1);
    return selectedPlayer;
  }

  /**
   * Helper method to trigger playback on an `AudioPlayer` instance with applied options.
   */
  private triggerPlayerSFX(_id: string, player: AudioPlayer, opts: AudioPlayOptions): void {
    try {
      const targetVol = Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume * (opts.volume ?? 1.0)));
      player.volume = targetVol;

      let rate = opts.playbackRate ?? 1.0;
      if (opts.pitchRange && opts.pitchRange > 0) {
        const delta = (Math.random() * 2 - 1) * opts.pitchRange;
        rate *= 1.0 + delta;
      }

      if (typeof player.setPlaybackRate === "function") {
        player.setPlaybackRate(rate);
      } else {
        player.playbackRate = rate;
      }

      if (typeof player.seekTo === "function") {
        player.seekTo(0).catch(() => {});
      }
      player.play();
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Error playing SFX "${_id}":`, e);
    }
  }

  /**
   * Starts background music playback.
   *
   * @param id - Track identifier.
   * @param options - BGM source URL, path, or module ID.
   */
  public playBGM(id: string, options?: unknown): void {
    const rawSource = options !== undefined ? options : id;
    const url = typeof rawSource === "string" ? rawSource : String(id);

    if (this.currentBgmUrl === url && this.bgmPlayer) {
      try {
        this.bgmPlayer.play();
      } catch (e) {
        console.warn(`[ExpoAudioPlayer] Error resuming BGM "${url}":`, e);
      }
      return;
    }

    this.stopBGM();

    try {
      this.currentBgmUrl = url;
      const resolvedSource = resolveNativeAudioSource(rawSource);
      let sourceToLoad: AudioSource = null;

      if (typeof resolvedSource === "number") {
        sourceToLoad = resolvedSource;
      } else if (typeof resolvedSource === "string") {
        sourceToLoad = { uri: resolvedSource };
      } else if (typeof resolvedSource === "object" && resolvedSource !== null) {
        sourceToLoad = resolvedSource as AudioSource;
      }

      this.bgmPlayer = createAudioPlayer(sourceToLoad);
      if (this.bgmPlayer) {
        this.bgmPlayer.loop = true;
        this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume));
        this.bgmPlayer.play();
      }
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Failed to play BGM "${url}":`, e);
    }
  }

  /**
   * Stops active background music and releases native resources.
   */
  public stopBGM(): void {
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.pause();
        if (typeof this.bgmPlayer.remove === "function") {
          this.bgmPlayer.remove();
        }
      } catch (_e) {
        // Defensive safe catch
      }
    }
    this.currentBgmUrl = null;
    this.bgmPlayer = null;
    this.wasBgmPlayingBeforeBackground = false;
  }

  /**
   * Pauses active background music.
   */
  public pauseBGM(): void {
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.pause();
      } catch (_e) {
        // Defensive safe catch
      }
    }
  }

  /**
   * Sets the global master volume.
   *
   * @param v - Volume ratio between 0.0 and 1.0.
   */
  public setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume));
      } catch (_e) {
        // Defensive safe catch
      }
    }
  }

  /**
   * Sets the sound effects (SFX) bus volume.
   *
   * @param v - Volume ratio between 0.0 and 1.0.
   */
  public setSFXVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  /**
   * Sets the background music (BGM) bus volume.
   *
   * @param v - Volume ratio between 0.0 and 1.0.
   */
  public setBGMVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume));
      } catch (_e) {
        // Defensive safe catch
      }
    }
  }

  /**
   * Triggers a sound effect with 2D spatial distance attenuation and panning.
   *
   * @param id - Sound effect identifier.
   * @param x - Sound emitter X coordinate.
   * @param y - Sound emitter Y coordinate.
   * @param listenerX - Listener X coordinate.
   * @param listenerY - Listener Y coordinate.
   * @param maxDistance - Distance at which sound becomes silent.
   */
  public playSpatialSFX(
    id: string,
    x: number,
    y: number,
    listenerX: number,
    listenerY: number,
    maxDistance: number
  ): void {
    const dx = x - listenerX;
    const dy = y - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) return;

    const volumeScale = 1.0 - distance / maxDistance;
    const pan = maxDistance > 0 ? Math.max(-1, Math.min(1, dx / maxDistance)) : 0;

    const pool = this.sfxPools.get(id);
    if (!pool || pool.length === 0) {
      this.playSFX(id, { volume: volumeScale });
      return;
    }

    try {
      const player = this.selectPlayerFromPool(id, pool);
      const targetVol = Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume * volumeScale));
      player.volume = targetVol;
      const panPlayer = player as AudioPlayerWithPan;
      if (typeof panPlayer.pan === "number" || "pan" in panPlayer) {
        panPlayer.pan = pan;
      }
      if (typeof player.seekTo === "function") {
        player.seekTo(0).catch(() => {});
      }
      player.play();
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Error playing spatial SFX "${id}":`, e);
    }
  }

  /**
   * Disposes all active audio players (SFX pools and BGM) and cleans up native resources.
   *
   * @public
   */
  public dispose(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;

    this.stopBGM();

    for (const pool of this.sfxPools.values()) {
      for (const player of pool) {
        try {
          player.pause();
          if (typeof player.remove === "function") {
            player.remove();
          }
        } catch (_e) {
          // Defensive safe catch
        }
      }
    }

    this.sfxPools.clear();
    this.sfxPoolIndices.clear();
    this.sfxSources.clear();
    this.sfxLastPlayTime.clear();
  }

  /**
   * Alias for {@link dispose} to release all native audio resources.
   *
   * @public
   */
  public releaseAll(): void {
    this.dispose();
  }
}
