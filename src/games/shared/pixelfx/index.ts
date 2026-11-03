/**
 * PixelFX Integration Layer — Public API (V1 minimal)
 */

export type {
  PixelFXCategory,
  PixelFXThemeVariant,
  PixelFXManifestEntry,
  PixelFXResolveOptions,
  PixelFXResolveResult,
} from "./PixelFXTypes";

export {
  PIXELFX_MANIFEST,
  PIXELFX_MANIFEST_BY_ID,
} from "./PixelFXCatalog";

export {
  getManifestEntry,
  hasManifestEntry,
  getAllManifestEntries,
  resolveManifest,
  validateManifest,
} from "./PixelFXRegistry";

export {
  resolveForJuice,
  getPixelFxIdFromProfile,
} from "./PixelFXResolver";
export type {
  PixelFXWorldLike,
  ResolveForJuiceArgs,
  ResolveForJuiceResult,
} from "./PixelFXResolver";

export {
  themeIdToVariant,
  selectSheetForVariant,
  BUILD_TIME_PALETTE_HINTS,
} from "./PixelFXPaletteAdapter";

export {
  adaptPixelFXExport,
  clipDurationSeconds,
} from "./PixelFXSpriteAdapter";
export type {
  PixelFXExportJson,
  PixelFXExportMeta,
  PixelFXExportFrame,
  AdaptedSpriteSheetMeta,
} from "./PixelFXSpriteAdapter";

export {
  validatePixelFXLayer,
  smokeTestManifest,
  assertPilotCoverage,
} from "./PixelFXValidation";

export { spawnFromJuiceProfile } from "./PixelFXSpawnHelper";
export type { SpawnFromProfileContext } from "./PixelFXSpawnHelper";

export { PIXELFX_INSTANCE_MANAGER_DEFERRED } from "./PixelFXInstanceManager";
export { PIXELFX_RUNTIME_DEFERRED } from "./PixelFXRuntime";
