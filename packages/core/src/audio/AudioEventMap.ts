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
  { id: "shoot", path: "/assets/combat/shoot.wav" },
  { id: "shoot_enemy", path: "/assets/combat/shoot_enemy.wav" },
  { id: "hit", path: "/assets/combat/hit.wav" },
  { id: "hit_critical", path: "/assets/combat/hit_critical.wav" },
  { id: "explosion_small", path: "/assets/combat/explosion_small.wav" },
  { id: "explosion_large", path: "/assets/combat/explosion_large.wav" },
  { id: "explosion", path: "/assets/combat/explosion_small.wav" },
  { id: "explosion2", path: "/assets/combat/explosion_large.wav" },
  { id: "shield_hit", path: "/assets/combat/shield_hit.wav" },
  { id: "shield_break", path: "/assets/combat/shield_break.wav" },
  { id: "parry", path: "/assets/combat/parry.wav" },
  { id: "reload", path: "/assets/combat/reload.wav" },
  { id: "cooldown_ready", path: "/assets/combat/cooldown_ready.wav" },

  // Movement
  { id: "thrust_loop", path: "/assets/movement/thrust_loop.wav" },
  { id: "dash", path: "/assets/movement/dash.wav" },
  { id: "jump", path: "/assets/movement/jump.wav" },
  { id: "land", path: "/assets/movement/land.wav" },
  { id: "land_heavy", path: "/assets/movement/land_heavy.wav" },
  { id: "flap", path: "/assets/movement/flap.wav" },
  { id: "bounce", path: "/assets/movement/bounce.wav" },
  { id: "wrap", path: "/assets/movement/wrap.wav" },
  { id: "spin_charge", path: "/assets/movement/spin_charge.wav" },
  { id: "wall_slide", path: "/assets/movement/wall_slide.wav" },
  { id: "glide_loop", path: "/assets/movement/glide_loop.wav" },

  // Progression
  { id: "score", path: "/assets/progression/score.wav" },
  { id: "collectible_pickup", path: "/assets/progression/collectible_pickup.wav" },
  { id: "powerup_pickup", path: "/assets/progression/powerup_pickup.wav" },
  { id: "powerup_expire", path: "/assets/progression/powerup_expire.wav" },
  { id: "combo_up", path: "/assets/progression/combo_up.wav" },
  { id: "combo_break", path: "/assets/progression/combo_break.wav" },
  { id: "achievement_unlock", path: "/assets/progression/achievement_unlock.wav" },

  // UI
  { id: "menu_select", path: "/assets/ui/menu_select.wav" },
  { id: "menu_confirm", path: "/assets/ui/menu_confirm.wav" },
  { id: "wave_start", path: "/assets/ui/wave_start.wav" },
  { id: "boss_incoming", path: "/assets/ui/boss_incoming.wav" },
  { id: "game_over", path: "/assets/ui/game_over.wav" },

  // Atmosphere / BGM
  { id: "dark_atmosphere", path: "/assets/dark-atmosphere.wav" },
  { id: "ambient_loop", path: "/assets/ambient_loop.wav" },
  { id: "pad_chords", path: "/assets/pad-chords.wav" }
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
