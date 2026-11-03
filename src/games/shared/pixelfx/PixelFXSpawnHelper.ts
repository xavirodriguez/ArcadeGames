/**
 * Thin helper: Juice profile with optional pixelFxId → existing ECS presentation entity.
 */

import type {
  JuiceOrchestrator,
  JuiceProfile,
  JuiceSpawnOptions,
  SharedVFXPrimitiveName,
} from "../rendering/JuiceOrchestrator";
import { resolveManifest, hasManifestEntry } from "./PixelFXRegistry";
import { themeIdToVariant } from "./PixelFXPaletteAdapter";

export interface SpawnFromProfileContext {
  x?: number;
  y?: number;
  rotation?: number;
  overrideTint?: string;
  themeId?: string;
  juiceLevel?: number;
  lowStimulationMode?: boolean;
}

export function spawnFromJuiceProfile(
  juice: JuiceOrchestrator,
  profile: JuiceProfile,
  context: SpawnFromProfileContext = {}
): number | null {
  let scale = profile.scale;
  let ttl = profile.ttl;
  let effect: SharedVFXPrimitiveName = profile.effect;

  if (profile.pixelFxId && hasManifestEntry(profile.pixelFxId)) {
    const resolved = resolveManifest(profile.pixelFxId, {
      x: context.x ?? 0,
      y: context.y ?? 0,
      scale: profile.scale,
      themeVariant: themeIdToVariant(context.themeId),
      juiceLevel: context.juiceLevel,
      lowStimulationMode: context.lowStimulationMode,
    });

    if (resolved) {
      if (resolved.useFallback && resolved.fallback) {
        effect = profile.effect;
      } else {
        scale = resolved.scale;
        ttl = resolved.duration;
      }
    }
  }

  const options: JuiceSpawnOptions = {
    x: context.x,
    y: context.y,
    rotation: context.rotation,
    tint: context.overrideTint ?? profile.tint,
    scale,
    intensity: profile.intensity,
    ttl,
    text: profile.text,
    hitStopMs: profile.hitStopMs,
    hitStopPriority: profile.hitStopPriority,
    shakeIntensity: profile.shakeIntensity,
    shakeDurationMs: profile.shakeDurationMs,
  };

  return juice.spawn(effect, options);
}
