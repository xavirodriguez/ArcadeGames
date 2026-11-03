/**
 * PixelFX Integration Layer — Manifest (V1 candidates)
 *
 * Thin map: pfxId → sheet metadata. Not a second SpriteRegistry.
 * IDs and pixelFxSourceId must be exact. Values for anchor/duration/scale
 * are placeholders until the export spike fills them from real meta.pixelfx.
 *
 * Status: CANDIDATES. Require visual review + exact upstream id confirmation
 * before locking for production.
 */

import type { PixelFXManifestEntry } from "./PixelFXTypes";

/**
 * Candidate manifest. Do not treat as final until spike validates:
 * - exact pixelFxSourceId exists
 * - duration and scale fit the game event
 * - Sumi-e variants pass art review for Hit & Run
 */
export const PIXELFX_MANIFEST: readonly PixelFXManifestEntry[] = [
  {
    id: "pfx-impact-spark",
    category: "impact",
    pixelFxSourceId: "impacts/hit-flash",
    sheetId: "pixelfx/impacts/hit-flash",
    animation: "main",
    // From export: pivot [40,54], frame 80×64 → verified by spike-adapt-fixtures
    anchor: { x: 0.5, y: 0.84375 },
    duration: 0.5333, // 16 frames @ 30 fps
    scale: 0.9,
    fallback: "shockwave",
    usedBy: ["asteroids", "platformer", "hitandrun"],
  },
  {
    id: "pfx-explosion-small",
    category: "explosion",
    pixelFxSourceId: "explosions/cartoon-pow",
    sheetId: "pixelfx/explosions/cartoon-pow",
    animation: "main",
    // From export: pivot [92,72], frame 184×144 → verified by spike
    anchor: { x: 0.5, y: 0.5 },
    duration: 1.0667, // 32 frames @ 30 fps
    // Native 184×144 is large; keep logical scale down for Asteroids
    scale: 0.45,
    fallback: "shockwave",
    usedBy: ["asteroids"],
  },
  {
    id: "pfx-muzzle",
    category: "projectile",
    pixelFxSourceId: "projectiles/cannon-shot",
    sheetId: "pixelfx/projectiles/cannon-shot",
    animation: "main",
    anchor: { x: 0.25, y: 0.5 },
    duration: 0.15,
    scale: 0.7,
    fallback: "thruster_flame",
    usedBy: ["asteroids"],
  },
  {
    id: "pfx-dust-land",
    category: "dust",
    pixelFxSourceId: "impacts/heavy-landing",
    sheetId: "pixelfx/impacts/heavy-landing",
    animation: "main",
    anchor: { x: 0.5, y: 0.85 },
    duration: 0.4,
    scale: 1.0,
    fallback: "comet_trail",
    usedBy: ["platformer", "hitandrun"],
  },
  {
    id: "pfx-pickup",
    category: "pickup",
    pixelFxSourceId: "pickups/collect-burst",
    sheetId: "pixelfx/pickups/collect-burst",
    animation: "main",
    anchor: { x: 0.5, y: 0.5 },
    duration: 0.45,
    scale: 0.85,
    fallback: "floating_text",
    usedBy: ["asteroids", "platformer", "hitandrun"],
  },
  {
    id: "pfx-debris",
    category: "debris",
    pixelFxSourceId: "explosions/dirt-explosion",
    sheetId: "pixelfx/explosions/dirt-explosion",
    animation: "main",
    anchor: { x: 0.5, y: 0.5 },
    duration: 0.6,
    scale: 1.0,
    fallback: "shockwave",
    usedBy: ["asteroids", "platformer"],
  },
  {
    id: "pfx-slash",
    category: "melee",
    pixelFxSourceId: "melee/sword-slash",
    sheetId: "pixelfx/melee/sword-slash",
    animation: "main",
    anchor: { x: 0.3, y: 0.5 },
    duration: 0.35,
    scale: 1.0,
    fallback: "hologram_glitch",
    usedBy: ["hitandrun"],
    actTiming: { windup: 0.12, hitAt: 0.18, freeze: 0.08, recovery: 0.2 },
  },
  {
    id: "pfx-block",
    category: "block",
    pixelFxSourceId: "impacts/blunt-hit",
    sheetId: "pixelfx/impacts/blunt-hit",
    animation: "main",
    anchor: { x: 0.5, y: 0.5 },
    duration: 0.22,
    scale: 0.95,
    fallback: "shield_bubble",
    usedBy: ["hitandrun"],
  },
] as const;

export const PIXELFX_MANIFEST_BY_ID: ReadonlyMap<string, PixelFXManifestEntry> =
  new Map(PIXELFX_MANIFEST.map((e) => [e.id, e]));
