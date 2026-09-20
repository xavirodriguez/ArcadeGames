import { IAudioPlayer, SHARED_AUDIO_MANIFEST } from "@tiny-aster/core";
import { createAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";

/**
 * Native implementation of IAudioPlayer utilizing `expo-audio`
 * for low-latency sound effects and streaming background music in Expo / React Native environments.
 *
 * @remarks
 * Safe for native platforms (Hermes / JSC) where Web Audio API (`AudioContext`) is unavailable.
 * Supports volume control, rate-limiting (cooldowns), pitch modulation, BGM state, and 2D spatial attenuation.
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
   * Resolves an audio source parameter into an `AudioSource` acceptable by `expo-audio`.
   */
  private resolveSource(id: string, options?: unknown): AudioSource {
    if (typeof options === "number") {
      return options;
    }

    if (typeof options === "string" && options.length > 0) {
      return { uri: options };
    }

    if (typeof options === "object" && options !== null) {
      const optsObj = options as { uri?: string; path?: string };
      if (optsObj.uri) {
        return { uri: optsObj.uri };
      }
      if (optsObj.path) {
        return { uri: optsObj.path };
      }
    }

    const manifestEntry = SHARED_AUDIO_MANIFEST.find((item) => item.id === id);
    if (manifestEntry?.path) {
      return { uri: manifestEntry.path };
    }

    return { uri: id };
  }

  /**
   * Asynchronously preloads a sound effect resource using `expo-audio`.
   */
  public async loadSFX(id: string, options?: unknown): Promise<void> {
    try {
      const source = this.resolveSource(id, options);
      const player = createAudioPlayer(source);
      this.sfxPlayers.set(id, player);
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Failed to load SFX "${id}":`, e);
    }
  }

  /**
   * Plays a sound effect with optional rate-limiting (cooldowns), pitch variation, and volume scaling.
   */
  public playSFX(id: string, options?: unknown): void {
    const opts = (typeof options === "object" && options !== null ? options : {}) as {
      volume?: number;
      pitchRange?: number;
      cooldownMs?: number;
      playbackRate?: number;
    };

    const now = performance.now();
    if (opts.cooldownMs && opts.cooldownMs > 0) {
      const last = this.sfxLastPlayTime.get(id) || 0;
      if (now - last < opts.cooldownMs) {
        return;
      }
    }
    this.sfxLastPlayTime.set(id, now);

    let player = this.sfxPlayers.get(id);
    if (!player) {
      try {
        const source = this.resolveSource(id, options);
        player = createAudioPlayer(source);
        this.sfxPlayers.set(id, player);
      } catch (e) {
        console.warn(`[ExpoAudioPlayer] SFX "${id}" not loaded and fallback creation failed:`, e);
        return;
      }
    }

    try {
      const volScale = opts.volume ?? 1.0;
      const finalVolume = Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume * volScale));
      player.volume = finalVolume;

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
        const res = player.seekTo(0);
        if (res && typeof (res as Promise<void>).catch === "function") {
          (res as Promise<void>).catch(() => {});
        }
      }

      player.play();
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Error playing SFX "${id}":`, e);
    }
  }

  /**
   * Plays background music using `expo-audio` AudioPlayer in loop mode.
   */
  public playBGM(id: string, options?: unknown): void {
    const opts = (typeof options === "object" && options !== null ? options : {}) as {
      volume?: number;
    };
    const urlOrPath = typeof options === "string" ? options : id;

    if (this.currentBgmUrl === urlOrPath && this.bgmPlayer) {
      try {
        const volScale = opts.volume ?? 1.0;
        this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume * volScale));
        this.bgmPlayer.play();
      } catch (e) {
        console.warn(`[ExpoAudioPlayer] Failed to resume BGM "${id}":`, e);
      }
      return;
    }

    this.stopBGM();

    try {
      const source = this.resolveSource(id, options);
      this.bgmPlayer = createAudioPlayer(source);
      this.bgmPlayer.loop = true;

      const volScale = opts.volume ?? 1.0;
      this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume * volScale));
      this.bgmPlayer.play();
      this.currentBgmUrl = urlOrPath;
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Failed to play BGM "${id}":`, e);
    }
  }

  /**
   * Stops background music playback and disposes of the active BGM player.
   */
  public stopBGM(): void {
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.pause();
        if (typeof this.bgmPlayer.seekTo === "function") {
          const res = this.bgmPlayer.seekTo(0);
          if (res && typeof (res as Promise<void>).catch === "function") {
            (res as Promise<void>).catch(() => {});
          }
        }
        if (typeof this.bgmPlayer.remove === "function") {
          this.bgmPlayer.remove();
        }
      } catch (_e) {
        // Safe catch
      }
    }
    this.bgmPlayer = null;
    this.currentBgmUrl = null;
  }

  /**
   * Pauses active background music.
   */
  public pauseBGM(): void {
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.pause();
      } catch (_e) {
        // Safe catch
      }
    }
  }

  /**
   * Adjusts the global master volume level.
   */
  public setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume));
      } catch (_e) {
        // Safe catch
      }
    }
  }

  /**
   * Adjusts the sound effects (SFX) bus volume level.
   */
  public setSFXVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  /**
   * Adjusts the background music (BGM) bus volume level.
   */
  public setBGMVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmPlayer) {
      try {
        this.bgmPlayer.volume = Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume));
      } catch (_e) {
        // Safe catch
      }
    }
  }

  /**
   * Plays a sound effect with spatial attenuation based on 2D listener distance.
   */
  public playSpatialSFX(
    id: string,
    x: number,
    y: number,
    listenerX: number,
    listenerY: number,
    maxDistance: number
  ): void {
    try {
      const dx = x - listenerX;
      const dy = y - listenerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance) return;

      const spatialVolume = maxDistance > 0 ? 1.0 - distance / maxDistance : 1.0;
      this.playSFX(id, { volume: spatialVolume });
    } catch (e) {
      console.warn(`[ExpoAudioPlayer] Error playing spatial SFX "${id}":`, e);
    }
  }
}
