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
 * Shared audio asset manifest mapping standard arcade audio events to high-quality WAV audio assets.
 * @public
 */
export const SHARED_AUDIO_MANIFEST: AudioAssetDefinition[] = [
  // Combat
  { id: "shoot", path: "/audio/combat/shoot.wav" },
  { id: "shoot_enemy", path: "/audio/combat/shoot_enemy.wav" },
  { id: "hit", path: "/audio/combat/hit.wav" },
  { id: "hit_critical", path: "/audio/combat/hit_critical.wav" },
  { id: "explosion_small", path: "/audio/combat/explosion_small.wav" },
  { id: "explosion_large", path: "/audio/combat/explosion_large.wav" },
  { id: "explosion", path: "/audio/combat/explosion_small.wav" },
  { id: "explosion2", path: "/audio/combat/explosion_large.wav" },
  { id: "shield_hit", path: "/audio/combat/shield_hit.wav" },
  { id: "shield_break", path: "/audio/combat/shield_break.wav" },
  { id: "parry", path: "/audio/combat/parry.wav" },
  { id: "reload", path: "/audio/combat/reload.wav" },
  { id: "cooldown_ready", path: "/audio/combat/cooldown_ready.wav" },

  // Movement
  { id: "thrust_loop", path: "/audio/movement/thrust_loop.wav" },
  { id: "dash", path: "/audio/movement/dash.wav" },
  { id: "jump", path: "/audio/movement/jump.wav" },
  { id: "land", path: "/audio/movement/land.wav" },
  { id: "land_heavy", path: "/audio/movement/land_heavy.wav" },
  { id: "flap", path: "/audio/movement/flap.wav" },
  { id: "bounce", path: "/audio/movement/bounce.wav" },
  { id: "wrap", path: "/audio/movement/wrap.wav" },
  { id: "spin_charge", path: "/audio/movement/spin_charge.wav" },
  { id: "wall_slide", path: "/audio/movement/wall_slide.wav" },
  { id: "glide_loop", path: "/audio/movement/glide_loop.wav" },

  // Progression
  { id: "score", path: "/audio/progression/score.wav" },
  { id: "collectible_pickup", path: "/audio/progression/collectible_pickup.wav" },
  { id: "powerup_pickup", path: "/audio/progression/powerup_pickup.wav" },
  { id: "powerup_expire", path: "/audio/progression/powerup_expire.wav" },
  { id: "combo_up", path: "/audio/progression/combo_up.wav" },
  { id: "combo_break", path: "/audio/progression/combo_break.wav" },
  { id: "achievement_unlock", path: "/audio/progression/achievement_unlock.wav" },

  // UI
  { id: "menu_select", path: "/audio/ui/menu_select.wav" },
  { id: "menu_confirm", path: "/audio/ui/menu_confirm.wav" },
  { id: "wave_start", path: "/audio/ui/wave_start.wav" },
  { id: "boss_incoming", path: "/audio/ui/boss_incoming.wav" },
  { id: "game_over", path: "/audio/ui/game_over.wav" },

  // Atmosphere / BGM
  { id: "dark_atmosphere", path: "/audio/dark-atmosphere.wav" },
  { id: "ambient_loop", path: "/audio/ambient_loop.wav" },
  { id: "pad_chords", path: "/audio/pad-chords.wav" }
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
