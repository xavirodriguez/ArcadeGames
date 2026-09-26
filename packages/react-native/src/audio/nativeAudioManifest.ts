import { SHARED_AUDIO_MANIFEST, type AudioAssetDefinition } from "@tiny-aster/core";

/**
 * Safely executes a `require()` call for bundled Metro asset modules.
 * Returns the module ID or falls back to the path string if executed outside Metro (e.g., unit tests).
 */
function safeRequireAsset(requireFn: () => number, fallbackPath: string): number | string {
  try {
    return requireFn();
  } catch (_e) {
    return fallbackPath;
  }
}

/**
 * Native asset map mapping audio IDs and web file paths to bundled Metro module IDs.
 *
 * @public
 */
export const NATIVE_AUDIO_MAP: Record<string, number | string> = {
  // Combat
  shoot: safeRequireAsset(() => require("../../../../public/assets/audio/combat/shoot.wav"), "/assets/audio/combat/shoot.wav"),
  "/assets/audio/combat/shoot.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/shoot.wav"), "/assets/audio/combat/shoot.wav"),
  "/assets/audio/shoot.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/shoot.mp3"), "/assets/audio/shoot.mp3"),
  "/audio/shoot.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/shoot.mp3"), "/assets/audio/shoot.mp3"),

  shoot_enemy: safeRequireAsset(() => require("../../../../public/assets/audio/combat/shoot_enemy.wav"), "/assets/audio/combat/shoot_enemy.wav"),
  "/assets/audio/combat/shoot_enemy.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/shoot_enemy.wav"), "/assets/audio/combat/shoot_enemy.wav"),

  hit: safeRequireAsset(() => require("../../../../public/assets/audio/combat/hit.wav"), "/assets/audio/combat/hit.wav"),
  "/assets/audio/combat/hit.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/hit.wav"), "/assets/audio/combat/hit.wav"),
  "/assets/audio/hit.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/hit.mp3"), "/assets/audio/hit.mp3"),
  "/audio/hit.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/hit.mp3"), "/assets/audio/hit.mp3"),

  hit_critical: safeRequireAsset(() => require("../../../../public/assets/audio/combat/hit_critical.wav"), "/assets/audio/combat/hit_critical.wav"),
  "/assets/audio/combat/hit_critical.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/hit_critical.wav"), "/assets/audio/combat/hit_critical.wav"),

  explosion_small: safeRequireAsset(() => require("../../../../public/assets/audio/combat/explosion_small.wav"), "/assets/audio/combat/explosion_small.wav"),
  "/assets/audio/combat/explosion_small.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/explosion_small.wav"), "/assets/audio/combat/explosion_small.wav"),

  explosion_large: safeRequireAsset(() => require("../../../../public/assets/audio/combat/explosion_large.wav"), "/assets/audio/combat/explosion_large.wav"),
  "/assets/audio/combat/explosion_large.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/explosion_large.wav"), "/assets/audio/combat/explosion_large.wav"),

  explosion: safeRequireAsset(() => require("../../../../public/assets/audio/combat/explosion_small.wav"), "/assets/audio/combat/explosion_small.wav"),
  "/assets/audio/explosion.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/explosion.mp3"), "/assets/audio/explosion.mp3"),
  "/audio/explosion.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/explosion.mp3"), "/assets/audio/explosion.mp3"),

  explosion2: safeRequireAsset(() => require("../../../../public/assets/audio/combat/explosion_large.wav"), "/assets/audio/combat/explosion_large.wav"),
  "/assets/audio/explosion2.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/explosion2.mp3"), "/assets/audio/explosion2.mp3"),
  "/audio/explosion2.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/explosion2.mp3"), "/assets/audio/explosion2.mp3"),

  shield_hit: safeRequireAsset(() => require("../../../../public/assets/audio/combat/shield_hit.wav"), "/assets/audio/combat/shield_hit.wav"),
  "/assets/audio/combat/shield_hit.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/shield_hit.wav"), "/assets/audio/combat/shield_hit.wav"),

  shield_break: safeRequireAsset(() => require("../../../../public/assets/audio/combat/shield_break.wav"), "/assets/audio/combat/shield_break.wav"),
  "/assets/audio/combat/shield_break.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/shield_break.wav"), "/assets/audio/combat/shield_break.wav"),

  parry: safeRequireAsset(() => require("../../../../public/assets/audio/combat/parry.wav"), "/assets/audio/combat/parry.wav"),
  "/assets/audio/combat/parry.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/parry.wav"), "/assets/audio/combat/parry.wav"),

  reload: safeRequireAsset(() => require("../../../../public/assets/audio/combat/reload.wav"), "/assets/audio/combat/reload.wav"),
  "/assets/audio/combat/reload.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/reload.wav"), "/assets/audio/combat/reload.wav"),

  cooldown_ready: safeRequireAsset(() => require("../../../../public/assets/audio/combat/cooldown_ready.wav"), "/assets/audio/combat/cooldown_ready.wav"),
  "/assets/audio/combat/cooldown_ready.wav": safeRequireAsset(() => require("../../../../public/assets/audio/combat/cooldown_ready.wav"), "/assets/audio/combat/cooldown_ready.wav"),

  // Movement
  thrust_loop: safeRequireAsset(() => require("../../../../public/assets/audio/movement/thrust_loop.wav"), "/assets/audio/movement/thrust_loop.wav"),
  "/assets/audio/movement/thrust_loop.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/thrust_loop.wav"), "/assets/audio/movement/thrust_loop.wav"),

  dash: safeRequireAsset(() => require("../../../../public/assets/audio/movement/dash.wav"), "/assets/audio/movement/dash.wav"),
  "/assets/audio/movement/dash.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/dash.wav"), "/assets/audio/movement/dash.wav"),

  jump: safeRequireAsset(() => require("../../../../public/assets/audio/movement/jump.wav"), "/assets/audio/movement/jump.wav"),
  "/assets/audio/movement/jump.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/jump.wav"), "/assets/audio/movement/jump.wav"),

  land: safeRequireAsset(() => require("../../../../public/assets/audio/movement/land.wav"), "/assets/audio/movement/land.wav"),
  "/assets/audio/movement/land.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/land.wav"), "/assets/audio/movement/land.wav"),

  land_heavy: safeRequireAsset(() => require("../../../../public/assets/audio/movement/land_heavy.wav"), "/assets/audio/movement/land_heavy.wav"),
  "/assets/audio/movement/land_heavy.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/land_heavy.wav"), "/assets/audio/movement/land_heavy.wav"),

  flap: safeRequireAsset(() => require("../../../../public/assets/audio/movement/flap.wav"), "/assets/audio/movement/flap.wav"),
  "/assets/audio/movement/flap.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/flap.wav"), "/assets/audio/movement/flap.wav"),
  "/assets/audio/flap.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/flap.mp3"), "/assets/audio/flap.mp3"),
  "/audio/flap.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/flap.mp3"), "/assets/audio/flap.mp3"),

  bounce: safeRequireAsset(() => require("../../../../public/assets/audio/movement/bounce.wav"), "/assets/audio/movement/bounce.wav"),
  "/assets/audio/movement/bounce.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/bounce.wav"), "/assets/audio/movement/bounce.wav"),

  wrap: safeRequireAsset(() => require("../../../../public/assets/audio/movement/wrap.wav"), "/assets/audio/movement/wrap.wav"),
  "/assets/audio/movement/wrap.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/wrap.wav"), "/assets/audio/movement/wrap.wav"),

  spin_charge: safeRequireAsset(() => require("../../../../public/assets/audio/movement/spin_charge.wav"), "/assets/audio/movement/spin_charge.wav"),
  "/assets/audio/movement/spin_charge.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/spin_charge.wav"), "/assets/audio/movement/spin_charge.wav"),

  wall_slide: safeRequireAsset(() => require("../../../../public/assets/audio/movement/wall_slide.wav"), "/assets/audio/movement/wall_slide.wav"),
  "/assets/audio/movement/wall_slide.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/wall_slide.wav"), "/assets/audio/movement/wall_slide.wav"),

  glide_loop: safeRequireAsset(() => require("../../../../public/assets/audio/movement/glide_loop.wav"), "/assets/audio/movement/glide_loop.wav"),
  "/assets/audio/movement/glide_loop.wav": safeRequireAsset(() => require("../../../../public/assets/audio/movement/glide_loop.wav"), "/assets/audio/movement/glide_loop.wav"),

  // Progression
  score: safeRequireAsset(() => require("../../../../public/assets/audio/progression/score.wav"), "/assets/audio/progression/score.wav"),
  "/assets/audio/progression/score.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/score.wav"), "/assets/audio/progression/score.wav"),
  "/assets/audio/score.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/score.mp3"), "/assets/audio/score.mp3"),
  "/audio/score.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/score.mp3"), "/assets/audio/score.mp3"),

  collectible_pickup: safeRequireAsset(() => require("../../../../public/assets/audio/progression/collectible_pickup.wav"), "/assets/audio/progression/collectible_pickup.wav"),
  "/assets/audio/progression/collectible_pickup.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/collectible_pickup.wav"), "/assets/audio/progression/collectible_pickup.wav"),

  powerup_pickup: safeRequireAsset(() => require("../../../../public/assets/audio/progression/powerup_pickup.wav"), "/assets/audio/progression/powerup_pickup.wav"),
  "/assets/audio/progression/powerup_pickup.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/powerup_pickup.wav"), "/assets/audio/progression/powerup_pickup.wav"),

  powerup_expire: safeRequireAsset(() => require("../../../../public/assets/audio/progression/powerup_expire.wav"), "/assets/audio/progression/powerup_expire.wav"),
  "/assets/audio/progression/powerup_expire.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/powerup_expire.wav"), "/assets/audio/progression/powerup_expire.wav"),

  combo_up: safeRequireAsset(() => require("../../../../public/assets/audio/progression/combo_up.wav"), "/assets/audio/progression/combo_up.wav"),
  "/assets/audio/progression/combo_up.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/combo_up.wav"), "/assets/audio/progression/combo_up.wav"),

  combo_break: safeRequireAsset(() => require("../../../../public/assets/audio/progression/combo_break.wav"), "/assets/audio/progression/combo_break.wav"),
  "/assets/audio/progression/combo_break.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/combo_break.wav"), "/assets/audio/progression/combo_break.wav"),

  achievement_unlock: safeRequireAsset(() => require("../../../../public/assets/audio/progression/achievement_unlock.wav"), "/assets/audio/progression/achievement_unlock.wav"),
  "/assets/audio/progression/achievement_unlock.wav": safeRequireAsset(() => require("../../../../public/assets/audio/progression/achievement_unlock.wav"), "/assets/audio/progression/achievement_unlock.wav"),

  // UI
  menu_select: safeRequireAsset(() => require("../../../../public/assets/audio/ui/menu_select.wav"), "/assets/audio/ui/menu_select.wav"),
  "/assets/audio/ui/menu_select.wav": safeRequireAsset(() => require("../../../../public/assets/audio/ui/menu_select.wav"), "/assets/audio/ui/menu_select.wav"),

  menu_confirm: safeRequireAsset(() => require("../../../../public/assets/audio/ui/menu_confirm.wav"), "/assets/audio/ui/menu_confirm.wav"),
  "/assets/audio/ui/menu_confirm.wav": safeRequireAsset(() => require("../../../../public/assets/audio/ui/menu_confirm.wav"), "/assets/audio/ui/menu_confirm.wav"),

  wave_start: safeRequireAsset(() => require("../../../../public/assets/audio/ui/wave_start.wav"), "/assets/audio/ui/wave_start.wav"),
  "/assets/audio/ui/wave_start.wav": safeRequireAsset(() => require("../../../../public/assets/audio/ui/wave_start.wav"), "/assets/audio/ui/wave_start.wav"),

  boss_incoming: safeRequireAsset(() => require("../../../../public/assets/audio/ui/boss_incoming.wav"), "/assets/audio/ui/boss_incoming.wav"),
  "/assets/audio/ui/boss_incoming.wav": safeRequireAsset(() => require("../../../../public/assets/audio/ui/boss_incoming.wav"), "/assets/audio/ui/boss_incoming.wav"),

  game_over: safeRequireAsset(() => require("../../../../public/assets/audio/ui/game_over.wav"), "/assets/audio/ui/game_over.wav"),
  "/assets/audio/ui/game_over.wav": safeRequireAsset(() => require("../../../../public/assets/audio/ui/game_over.wav"), "/assets/audio/ui/game_over.wav"),
  "/assets/audio/game_over.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/game_over.mp3"), "/assets/audio/game_over.mp3"),
  "/audio/game_over.mp3": safeRequireAsset(() => require("../../../../public/assets/audio/game_over.mp3"), "/assets/audio/game_over.mp3"),

  // Atmosphere / BGM
  dark_atmosphere: safeRequireAsset(() => require("../../../../public/assets/audio/dark-atmosphere.wav"), "/assets/audio/dark-atmosphere.wav"),
  "/assets/audio/dark-atmosphere.wav": safeRequireAsset(() => require("../../../../public/assets/audio/dark-atmosphere.wav"), "/assets/audio/dark-atmosphere.wav"),

  ambient_loop: safeRequireAsset(() => require("../../../../public/assets/audio/ambient_loop.wav"), "/assets/audio/ambient_loop.wav"),
  "/assets/audio/ambient_loop.wav": safeRequireAsset(() => require("../../../../public/assets/audio/ambient_loop.wav"), "/assets/audio/ambient_loop.wav"),

  pad_chords: safeRequireAsset(() => require("../../../../public/assets/audio/pad-chords.wav"), "/assets/audio/pad-chords.wav"),
  "/assets/audio/pad-chords.wav": safeRequireAsset(() => require("../../../../public/assets/audio/pad-chords.wav"), "/assets/audio/pad-chords.wav")
};

/**
 * Shared audio manifest adapted for native Expo bundler.
 * @public
 */
export const SHARED_AUDIO_MANIFEST_NATIVE: AudioAssetDefinition[] = SHARED_AUDIO_MANIFEST.map((asset) => {
  const nativeSource = NATIVE_AUDIO_MAP[asset.id] ?? NATIVE_AUDIO_MAP[asset.path] ?? asset.path;
  return {
    id: asset.id,
    path: typeof nativeSource === "string" ? nativeSource : String(nativeSource)
  };
});

/**
 * Resolves an audio source (ID, web path, or options object) to a native asset source (module ID or URI source).
 *
 * @param sourceInput - Sound ID, relative path, module ID number, or source configuration object.
 * @returns Resolved native audio source suitable for `expo-audio`.
 * @public
 */
export function resolveNativeAudioSource(sourceInput: unknown): unknown {
  if (typeof sourceInput === "number") {
    return sourceInput;
  }

  if (typeof sourceInput === "string") {
    const mapped = NATIVE_AUDIO_MAP[sourceInput];
    if (mapped !== undefined) {
      return mapped;
    }

    // Try finding by ID from SHARED_AUDIO_MANIFEST
    const manifestEntry = SHARED_AUDIO_MANIFEST.find((a) => a.id === sourceInput);
    if (manifestEntry) {
      const mappedManifest = NATIVE_AUDIO_MAP[manifestEntry.id] ?? NATIVE_AUDIO_MAP[manifestEntry.path];
      if (mappedManifest !== undefined) {
        return mappedManifest;
      }
    }

    // If string starts with http or file scheme, wrap as URI object
    if (sourceInput.startsWith("http://") || sourceInput.startsWith("https://") || sourceInput.startsWith("file://")) {
      return { uri: sourceInput };
    }

    return { uri: sourceInput };
  }

  if (typeof sourceInput === "object" && sourceInput !== null) {
    const obj = sourceInput as { uri?: string | number; path?: string | number; source?: string | number };
    const pathOrUri = obj.uri ?? obj.path ?? obj.source;

    if (typeof pathOrUri === "string") {
      const mapped = NATIVE_AUDIO_MAP[pathOrUri];
      if (mapped !== undefined) {
        return mapped;
      }
    } else if (typeof pathOrUri === "number") {
      return pathOrUri;
    }

    return sourceInput;
  }

  return sourceInput;
}
