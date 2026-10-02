/**
 * Data structures and types for pure procedural fantasy landscape backdrop generation.
 */

/**
 * Macro biome zone types for landscape layout.
 * @public
 */
export type MacroZoneType = "mountain" | "valley" | "plain" | "lake";

/**
 * Quality levels for procedural background rendering.
 * @public
 */
export type BackdropQuality = "low" | "med" | "high";

/**
 * Fantasy feature types that can appear in a backdrop layer.
 * @public
 */
export type FantasyFeatureType = "floating_island" | "giant_tree" | "twin_moons" | "crystal_spire" | "aurora";

/**
 * Point 2D interface for procedural curves and polygons.
 * @public
 */
export interface BackdropPoint {
  x: number;
  y: number;
}

/**
 * Configuration for a waterfall feature.
 * @public
 */
export interface WaterfallSpec {
  /** Start X position in world space */
  x: number;
  /** Top Y position (ledge) */
  topY: number;
  /** Bottom Y position (splash pool / river) */
  bottomY: number;
  /** Width of the waterfall stream */
  width: number;
  /** Alpha / opacity */
  alpha: number;
}

/**
 * Configuration for a river feature.
 * @public
 */
export interface RiverSpec {
  /** Points defining the river path across the chunk */
  path: BackdropPoint[];
  /** River width */
  width: number;
  /** Accent color token or hex */
  colorToken: string;
}

/**
 * Configuration for a fantasy element (floating islands, crystals, giant trees, etc.).
 * @public
 */
export interface FantasyFeatureSpec {
  type: FantasyFeatureType;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  colorToken?: string;
}

/**
 * Particle spec for subtle dynamic particles (spores, fog motes, stars).
 * @public
 */
export interface BackdropParticleSpec {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  colorToken: string;
}

/**
 * Specification for a single terrain layer (e.g. distant mountain, middle mountain, hill, river, foreground).
 * @public
 */
export interface BackdropLayerSpec {
  id: string;
  name: string;
  /** Parallax depth multiplier from 0 (far sky) to 1 (foreground) */
  depth: number;
  /** Base terrain polyline sampled across the chunk */
  points: BackdropPoint[];
  /** Primary color token for terrain fill */
  fillColorToken: string;
  /** Secondary or highlight color token */
  strokeColorToken?: string;
  /** Alpha transparency */
  alpha: number;
  /** Desaturation / fog factor (0 = crisp, 1 = heavy fog) */
  fogFactor: number;
  /** Waterfalls belonging to this layer */
  waterfalls: WaterfallSpec[];
  /** Rivers belonging to this layer */
  rivers: RiverSpec[];
  /** Fantasy elements embedded in this layer */
  fantasyFeatures: FantasyFeatureSpec[];
}

/**
 * Specification for a chunk in infinite scroll mode.
 * @public
 */
export interface ChunkSpec {
  chunkX: number;
  macroZone: MacroZoneType;
  /** Height offset at start of chunk for seamless joining with chunkX - 1 */
  entryHeight: number;
  /** Height offset at end of chunk for seamless joining with chunkX + 1 */
  exitHeight: number;
  layers: BackdropLayerSpec[];
}

/**
 * Configuration for playfield readability mask.
 * @public
 */
export interface PlayfieldMaskConfig {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  colorToken: string;
}

/**
 * Theme color tokens map passed to procedural generator.
 * @public
 */
export interface BackdropThemeTokens {
  skyGradientTop: string;
  skyGradientBottom: string;
  mountainFar: string;
  mountainMid: string;
  hills: string;
  river: string;
  waterfall: string;
  accentGlow: string;
  fogColor: string;
  maskColor?: string;
}

/**
 * Configuration input for generating a procedural backdrop.
 * @public
 */
export interface BackdropConfig {
  seed: number;
  viewportWidth: number;
  viewportHeight: number;
  chunkWidth?: number;
  quality?: BackdropQuality;
  theme: BackdropThemeTokens;
  playfieldMask?: PlayfieldMaskConfig;
  /** Fantasy feature spawn probability multiplier (0 = realistic, 1 = default, 2 = high fantasy) */
  fantasyDensity?: number;
}

/**
 * Complete serializable specification produced by pure generator `generateBackdrop`.
 * @public
 */
export interface BackdropSpec {
  seed: number;
  viewportWidth: number;
  viewportHeight: number;
  chunkWidth: number;
  quality: BackdropQuality;
  theme: BackdropThemeTokens;
  playfieldMask: PlayfieldMaskConfig;
  /** Sky layers / stars / auroras specs */
  skyFeatures: FantasyFeatureSpec[];
  /** Chunks generated for viewport (or single chunk in fixed mode) */
  chunks: ChunkSpec[];
  /** Ambient particles for dynamic animation */
  particles: BackdropParticleSpec[];
}
