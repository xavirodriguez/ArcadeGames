/**
 * PixelFX Integration Layer — Resolver (Juice bridge)
 */

import type { PixelFXResolveOptions, PixelFXResolveResult } from "./PixelFXTypes";
import { resolveManifest, hasManifestEntry } from "./PixelFXRegistry";

export interface PixelFXWorldLike {
  isReSimulating?: boolean;
}

export interface ResolveForJuiceArgs {
  pixelFxId: string;
  options: PixelFXResolveOptions;
  world?: PixelFXWorldLike;
}

export interface ResolveForJuiceResult {
  sprite?: PixelFXResolveResult;
  useFallback: boolean;
  fallbackPrimitive?: string;
  skip: boolean;
}

export function resolveForJuice(args: ResolveForJuiceArgs): ResolveForJuiceResult {
  const { pixelFxId, options, world } = args;

  if (world?.isReSimulating === true) {
    return { useFallback: false, skip: true };
  }

  if (!hasManifestEntry(pixelFxId)) {
    return { useFallback: true, fallbackPrimitive: undefined, skip: false };
  }

  const resolved = resolveManifest(pixelFxId, options);
  if (!resolved) {
    return { useFallback: true, skip: false };
  }

  if (resolved.useFallback) {
    return {
      useFallback: true,
      fallbackPrimitive: resolved.fallback,
      skip: false,
      sprite: resolved,
    };
  }

  return { useFallback: false, skip: false, sprite: resolved };
}

export function getPixelFxIdFromProfile(profile: {
  pixelFxId?: string;
  effect?: string;
}): string | null {
  if (profile.pixelFxId && hasManifestEntry(profile.pixelFxId)) {
    return profile.pixelFxId;
  }
  return null;
}
