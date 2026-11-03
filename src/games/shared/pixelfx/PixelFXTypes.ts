/**
 * PixelFX Integration Layer — Minimal Types (V1)
 *
 * Thin contract only. No parallel sprite registry, no instance manager,
 * no runtime procedural path in V1.
 *
 * Games reference effects by stable pfxId. Assets live in the existing
 * SpriteRegistry / SPRITE_SHEET_CATALOG pipeline.
 */

/** Semantic categories (documentation + filtering only) */
export type PixelFXCategory =
  | "explosion"
  | "impact"
  | "projectile"
  | "melee"
  | "dust"
  | "pickup"
  | "debris"
  | "energy"
  | "death"
  | "block";

/** Build-time visual identity for sheet variants */
export type PixelFXThemeVariant =
  | "default"
  | "cosmic"
  | "sumi-e"
  | "iceberg"
  | "nature";

/**
 * One entry in the PixelFX manifest.
 * Maps a stable ArcadeGames id → existing sprite sheet + clip.
 * Does NOT own image data or animation state.
 */
export interface PixelFXManifestEntry {
  /** Stable id used by Juice profiles, e.g. "pfx-impact-spark" */
  id: string;

  category: PixelFXCategory;

  /**
   * Exact PixelFX source id used at export time, e.g. "impacts/hit-flash".
   * Must exist in the upstream library; never a glob.
   */
  pixelFxSourceId: string;

  /**
   * sheetId already registered (or to be registered) in SpriteRegistry /
   * SPRITE_SHEET_CATALOG. Variant sheets use a suffix, e.g. "...__sumi-e".
   */
  sheetId: string;

  /** Animation / clip name inside the sheet */
  animation: string;

  /**
   * Normalized anchor derived from PixelFX pivot:
   *   anchor.x = pivot.x / frameWidth
   *   anchor.y = pivot.y / frameHeight
   * Filled by the export adapter; do not invent values.
   */
  anchor: { x: number; y: number };

  /**
   * Duration in seconds = frameCount / fps (from meta.pixelfx).
   * Single source of truth for TTL of the ECS entity.
   */
  duration: number;

  /** Logical presentation scale in world units (not pixel size of PNG) */
  scale: number;

  /** SharedVFX primitive name used when sheet is missing or juice is low */
  fallback: string;

  /** Optional per-theme sheetId overrides (build-time variants) */
  variants?: Partial<Record<PixelFXThemeVariant, string>>;

  /** Games that may reference this id (documentation / validation) */
  usedBy?: Array<"asteroids" | "platformer" | "hitandrun">;

  /**
   * Optional act timing from PixelFX createAct metadata.
   * Consumed only as data for Juice / HitStop; never drives combat.
   */
  actTiming?: {
    windup?: number;
    hitAt?: number;
    freeze?: number;
    recovery?: number;
  };
}

/** Options when resolving + requesting a spawn via Juice */
export interface PixelFXResolveOptions {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  rotation?: number;
  /** Theme variant selects which pre-baked sheet to use */
  themeVariant?: PixelFXThemeVariant;
  /** Juice / accessibility already applied by orchestrator */
  juiceLevel?: number;
  lowStimulationMode?: boolean;
}

export interface PixelFXResolveResult {
  /** sheetId + animation to feed into existing Sprite + SpriteAnimator */
  sheetId: string;
  animation: string;
  anchor: { x: number; y: number };
  duration: number;
  scale: number;
  /** True when caller should use SharedVFX instead */
  useFallback: boolean;
  fallback?: string;
  /** Original manifest id */
  id: string;
}
