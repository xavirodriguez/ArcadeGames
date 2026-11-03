/**
 * PixelFX Integration Layer — Manifest lookup (V1)
 *
 * NOT a second SpriteRegistry. Only resolves pfxId → manifest entry
 * and selects the sheetId for a theme variant.
 * Image/animation ownership stays in SpriteRegistry + SPRITE_SHEET_CATALOG.
 */

import type {
  PixelFXManifestEntry,
  PixelFXThemeVariant,
  PixelFXResolveOptions,
  PixelFXResolveResult,
} from "./PixelFXTypes";
import { PIXELFX_MANIFEST, PIXELFX_MANIFEST_BY_ID } from "./PixelFXCatalog";

export function getManifestEntry(id: string): PixelFXManifestEntry | undefined {
  return PIXELFX_MANIFEST_BY_ID.get(id);
}

export function hasManifestEntry(id: string): boolean {
  return PIXELFX_MANIFEST_BY_ID.has(id);
}

export function getAllManifestEntries(): readonly PixelFXManifestEntry[] {
  return PIXELFX_MANIFEST;
}

/**
 * Resolve a pfxId into the data needed to spawn via existing ECS Sprite path,
 * or signal SharedVFX fallback.
 *
 * Rules:
 * - lowStimulationMode / very low juice → prefer fallback
 * - missing entry → fallback if options provide one, else empty
 * - themeVariant selects pre-baked sheet variant when present
 */
export function resolveManifest(
  id: string,
  options: PixelFXResolveOptions = { x: 0, y: 0 }
): PixelFXResolveResult | null {
  const entry = PIXELFX_MANIFEST_BY_ID.get(id);
  if (!entry) {
    return null;
  }

  const lowJuice =
    options.lowStimulationMode === true ||
    (options.juiceLevel !== undefined && options.juiceLevel < 0.25);

  if (lowJuice) {
    return {
      id: entry.id,
      sheetId: entry.sheetId,
      animation: entry.animation,
      anchor: entry.anchor,
      duration: entry.duration,
      scale: options.scale ?? entry.scale,
      useFallback: true,
      fallback: entry.fallback,
    };
  }

  const variant = options.themeVariant ?? "default";
  const sheetId =
    (entry.variants && entry.variants[variant]) || entry.sheetId;

  return {
    id: entry.id,
    sheetId,
    animation: entry.animation,
    anchor: entry.anchor,
    duration: entry.duration,
    scale: options.scale ?? entry.scale,
    useFallback: false,
    fallback: entry.fallback,
  };
}

/**
 * Structural checks only (no disk I/O).
 * Asset existence is the job of sprites:validate + SpriteRegistry.
 */
export function validateManifest(): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const e of PIXELFX_MANIFEST) {
    if (seen.has(e.id)) errors.push(`Duplicate id: ${e.id}`);
    seen.add(e.id);

    if (!e.id.startsWith("pfx-")) {
      errors.push(`${e.id}: id should start with "pfx-"`);
    }
    if (!e.pixelFxSourceId || e.pixelFxSourceId.includes("*")) {
      errors.push(`${e.id}: pixelFxSourceId must be an exact upstream id, not a glob`);
    }
    if (!e.sheetId || !e.animation) {
      errors.push(`${e.id}: missing sheetId or animation`);
    }
    if (e.duration <= 0) {
      errors.push(`${e.id}: duration must be > 0`);
    }
    if (e.scale <= 0) {
      errors.push(`${e.id}: scale must be > 0`);
    }
    if (!e.fallback) {
      warnings.push(`${e.id}: no SharedVFX fallback defined`);
    }
    // Placeholder detection
    if (e.anchor.x === 0.5 && e.anchor.y === 0.5) {
      warnings.push(
        `${e.id}: anchor still at default 0.5,0.5 — replace from export pivot`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
