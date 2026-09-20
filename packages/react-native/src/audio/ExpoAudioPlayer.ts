import { createAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";
import {
  SHARED_AUDIO_MANIFEST,
  type AudioAssetDefinition,
  type AudioPlayOptions,
  type IAudioPlayer
} from "@tiny-aster/core";

interface AudioPlayerWithPan extends AudioPlayer {
  pan?: number;
}

/**
 * Native implementation of {@link IAudioPlayer} powered by `expo-audio`.
 *
 * @remarks
 * Designed for native React Native/Expo environments (iOS, Android, Hermes) where
 * Web Audio API (`window.AudioContext`) is unavailable. Manages preloaded sound effect
 * players, background music playback, volume controls, cooldown rate-limiting, and spatial audio panning.
 *
 * @public
 */
export class ExpoAudioPlayer implements IAudioPlayer {
  private sfxPlayers = new Map<string, AudioPlayer>();
  private sfxLastPlayTime = new Map<string, number>();
  private bgmPlayer: AudioPlayer | null = null;
  private currentBgmUrl: string | null = null;

  private masterVolume = 1.0;
  private sfxVolume = 0.85;
  private bgmVolume = 0.35;

  /**
   * Preloads a sound effect using `expo-audio`.
   *
   * @param id - Sound effect identifier.
   * @param options - Audio source path, URI, or configuration object.
   *
   * @example
   * ```ts
   * await player.loadSFX("shoot", "/assets/audio/combat/shoot.wav");
   * ```
   */
  public async loadSFX(id: string, options?: unknown): Promise<void> {
    try {
      let source: unknown = options;

      if (!source || source === id) {
        const manifestEntry = SHARED_AUDIO_MANIFEST.find((a: AudioAssetDefinition) => a.id === id);
        if (manifestEntry) {
          source = manifestEntry.path;
        } else {
          source = id;
        }
      }

      let sourceToLoad: AudioSource = null;
      if (typeof source === "string") {
        sourceToLoad = { uri: source };
      } else if (typeof source === "number") {
        sourceToLoad = source;
      } else if (typeof source === "object" && source !== null) {
        const srcObj = source as Record<string, unknown>;
        if (srcObj.uri || srcObj.path) {
          sourceToLoad = { uri: String(srcObj.uri || srcObj.path) };
        } else {
          sourceToLoad = source as AudioSource;
        }
      }

      const player = createAudioPlayer(sourceToLoad);
      if (player) {
        this.sfxPlayers.set(id, player);
      }
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Failed to load/create AudioPlayer for SFX "${id}":`, e);
    }
  }

  /**
   * Triggers playback for a preloaded sound effect with cooldowns, volume scaling, and pitch.
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

    const player = this.sfxPlayers.get(id);
    if (!player) {
      // Lazy attempt to load/create if sound was requested without prior loadSFX
      this.loadSFX(id, options).then(() => {
        const loadedPlayer = this.sfxPlayers.get(id);
        if (loadedPlayer) {
          this.triggerPlayerSFX(id, loadedPlayer, opts);
        }
      }).catch((e) => {
        console.warn(`[ExpoAudioPlayer] Failed lazy load for SFX "${id}":`, e);
      });
      return;
    }

    this.triggerPlayerSFX(id, player, opts);
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
   * @param options - BGM source URL or path.
   */
  public playBGM(id: string, options?: unknown): void {
    const source: unknown = typeof options === "string" ? options : id;
    const url = typeof source === "string" ? source : id;

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
      let sourceToLoad: AudioSource = null;
      if (typeof source === "string") {
        sourceToLoad = { uri: source };
      } else if (typeof source === "number") {
        sourceToLoad = source;
      } else if (typeof source === "object" && source !== null) {
        sourceToLoad = source as AudioSource;
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
      } catch (e) {
        // Defensive safe catch
      }
    }
    this.currentBgmUrl = null;
    this.bgmPlayer = null;
  }

  /**
   * Pauses active background music.
   */
  public pauseBGM(): void {
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.pause();
      } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
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

    const player = this.sfxPlayers.get(id);
    if (!player) {
      this.playSFX(id, { volume: volumeScale });
      return;
    }

    try {
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
}
