import { IAudioPlayer } from "./IAudioPlayer";

/**
 * Definition of an audio asset entry in the central audio registry.
 * @public
 */
export interface AudioAssetDefinition {
  /** Unique string key or identifier for the audio clip. */
  id: string;
  /** File path, URI, or URL to the audio asset. */
  path: string;
}

/**
 * Options for playing a sound effect with game feel / juice parameters.
 * @public
 */
export interface AudioPlayOptions {
  /** Relative volume scalar between 0.0 and 1.0. */
  volume?: number;
  /** Pitch variation percentage (e.g., 0.05 for ±5%). */
  pitchRange?: number;
  /** Minimum elapsed time in milliseconds before sound re-triggering. */
  cooldownMs?: number;
  /** Frequency offset detune value in cents. */
  detune?: number;
  /** Playback rate multiplier. */
  playbackRate?: number;
}

/**
 * Default audio presets applying game feel parameters (cooldowns, pitch variation, default volume) by event key.
 * @public
 */
export const DEFAULT_AUDIO_PRESETS: Record<string, AudioPlayOptions> = {
  // High-frequency combat actions -\> pitch variation & cooldowns
  shoot: { pitchRange: 0.05, cooldownMs: 60, volume: 0.8 },
  shoot_enemy: { pitchRange: 0.05, cooldownMs: 80, volume: 0.7 },
  hit: { pitchRange: 0.06, cooldownMs: 40, volume: 0.8 },
  hit_critical: { pitchRange: 0.04, volume: 1.0 },
  explosion_small: { pitchRange: 0.06, cooldownMs: 50, volume: 0.85 },
  explosion_large: { pitchRange: 0.03, volume: 1.0 },
  explosion: { pitchRange: 0.06, cooldownMs: 50, volume: 0.85 },
  explosion2: { pitchRange: 0.03, volume: 1.0 },
  shield_hit: { pitchRange: 0.04, volume: 0.7 },
  shield_break: { pitchRange: 0.02, volume: 0.9 },
  parry: { pitchRange: 0.03, volume: 0.95 },
  reload: { volume: 0.7 },
  cooldown_ready: { volume: 0.8 },

  // Movement
  thrust_loop: { volume: 0.5 },
  dash: { pitchRange: 0.05, volume: 0.8 },
  jump: { pitchRange: 0.04, volume: 0.75 },
  land: { pitchRange: 0.04, volume: 0.7 },
  land_heavy: { pitchRange: 0.03, volume: 0.9 },
  flap: { pitchRange: 0.06, cooldownMs: 70, volume: 0.75 },
  bounce: { pitchRange: 0.05, cooldownMs: 30, volume: 0.8 },
  wrap: { pitchRange: 0.04, volume: 0.8 },
  spin_charge: { volume: 0.8 },
  wall_slide: { volume: 0.6 },
  glide_loop: { volume: 0.5 },

  // Progression
  score: { pitchRange: 0.03, cooldownMs: 50, volume: 0.75 },
  collectible_pickup: { pitchRange: 0.04, volume: 0.85 },
  powerup_pickup: { pitchRange: 0.02, volume: 0.9 },
  powerup_expire: { volume: 0.7 },
  combo_up: { pitchRange: 0.03, volume: 0.85 },
  combo_break: { volume: 0.8 },
  achievement_unlock: { volume: 0.95 },

  // UI / Stingers
  menu_select: { cooldownMs: 30, volume: 0.6 },
  menu_confirm: { volume: 0.7 },
  wave_start: { volume: 0.85 },
  boss_incoming: { volume: 0.9 },
  game_over: { volume: 0.9 }
};

/**
 * Resolves playback options for an audio event by merging default presets with custom payload options.
 *
 * @param eventName - Identifier of the sound effect event.
 * @param payloadOptions - Optional explicit playback options provided with event payload.
 * @returns Combined AudioPlayOptions.
 * @public
 */
export function resolveAudioOptions(
  eventName: string,
  payloadOptions?: Record<string, unknown>
): AudioPlayOptions {
  const preset = DEFAULT_AUDIO_PRESETS[eventName] || {};
  return {
    ...preset,
    ...(payloadOptions as AudioPlayOptions)
  };
}

/**
 * Shared audio asset manifest mapping standard arcade audio events to high-quality WAV audio assets.
 * @public
 */
export const SHARED_AUDIO_MANIFEST: AudioAssetDefinition[] = [
  // Combat
  { id: "shoot", path: "/assets/audio/combat/shoot.wav" },
  { id: "shoot_enemy", path: "/assets/audio/combat/shoot_enemy.wav" },
  { id: "hit", path: "/assets/audio/combat/hit.wav" },
  { id: "hit_critical", path: "/assets/audio/combat/hit_critical.wav" },
  { id: "explosion_small", path: "/assets/audio/combat/explosion_small.wav" },
  { id: "explosion_large", path: "/assets/audio/combat/explosion_large.wav" },
  { id: "explosion", path: "/assets/audio/combat/explosion_small.wav" },
  { id: "explosion2", path: "/assets/audio/combat/explosion_large.wav" },
  { id: "shield_hit", path: "/assets/audio/combat/shield_hit.wav" },
  { id: "shield_break", path: "/assets/audio/combat/shield_break.wav" },
  { id: "parry", path: "/assets/audio/combat/parry.wav" },
  { id: "reload", path: "/assets/audio/combat/reload.wav" },
  { id: "cooldown_ready", path: "/assets/audio/combat/cooldown_ready.wav" },

  // Movement
  { id: "thrust_loop", path: "/assets/audio/movement/thrust_loop.wav" },
  { id: "dash", path: "/assets/audio/movement/dash.wav" },
  { id: "jump", path: "/assets/audio/movement/jump.wav" },
  { id: "land", path: "/assets/audio/movement/land.wav" },
  { id: "land_heavy", path: "/assets/audio/movement/land_heavy.wav" },
  { id: "flap", path: "/assets/audio/movement/flap.wav" },
  { id: "bounce", path: "/assets/audio/movement/bounce.wav" },
  { id: "wrap", path: "/assets/audio/movement/wrap.wav" },
  { id: "spin_charge", path: "/assets/audio/movement/spin_charge.wav" },
  { id: "wall_slide", path: "/assets/audio/movement/wall_slide.wav" },
  { id: "glide_loop", path: "/assets/audio/movement/glide_loop.wav" },

  // Progression
  { id: "score", path: "/assets/audio/progression/score.wav" },
  { id: "collectible_pickup", path: "/assets/audio/progression/collectible_pickup.wav" },
  { id: "powerup_pickup", path: "/assets/audio/progression/powerup_pickup.wav" },
  { id: "powerup_expire", path: "/assets/audio/progression/powerup_expire.wav" },
  { id: "combo_up", path: "/assets/audio/progression/combo_up.wav" },
  { id: "combo_break", path: "/assets/audio/progression/combo_break.wav" },
  { id: "achievement_unlock", path: "/assets/audio/progression/achievement_unlock.wav" },

  // UI
  { id: "menu_select", path: "/assets/audio/ui/menu_select.wav" },
  { id: "menu_confirm", path: "/assets/audio/ui/menu_confirm.wav" },
  { id: "wave_start", path: "/assets/audio/ui/wave_start.wav" },
  { id: "boss_incoming", path: "/assets/audio/ui/boss_incoming.wav" },
  { id: "game_over", path: "/assets/audio/ui/game_over.wav" },

  // Atmosphere / BGM
  { id: "dark_atmosphere", path: "/assets/audio/dark-atmosphere.wav" },
  { id: "ambient_loop", path: "/assets/audio/ambient_loop.wav" },
  { id: "pad_chords", path: "/assets/audio/pad-chords.wav" }
];

/**
 * Preloads all shared audio manifest assets into the provided audio player.
 *
 * @param audio - Target audio player instance implementing `IAudioPlayer`.
 * @returns A promise that resolves when all shared sound effects are preloaded.
 * @public
 */
export async function preloadSharedAudioManifest(audio: IAudioPlayer): Promise<void> {
  if (!audio) return;
  for (let i = 0; i < SHARED_AUDIO_MANIFEST.length; i++) {
    const asset = SHARED_AUDIO_MANIFEST[i];
    await audio.loadSFX(asset.id, asset.path);
  }
}
