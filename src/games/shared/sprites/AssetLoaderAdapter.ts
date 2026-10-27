import type {
  AssetDescriptor,
  AssetLoader,
  SpriteImageSource,
  SpriteSheetDefinition
} from "@tiny-aster/core";
import { SpriteRegistry } from "./SpriteRegistry";

/**
 * Resolved platform asset handle returned by the game's preload function.
 * Keep this shape structural so the shared sprite adapter does not depend on
 * Expo's runtime module.
 */
export interface ResolvedSpriteAssetSource {
  uri?: string | null;
  localUri?: string | null;
}

/**
 * Loads a canonical sheet into the existing ECS AssetLoader, then registers
 * the same resolved source with SpriteRegistry for consumers using the shared
 * sprite pipeline.
 *
 * runtimeAssetId intentionally supports legacy ECS keys that differ from the
 * canonical sheet id (Hit&Run's Sumi-e samurai is one example). Registration
 * happens only after AssetLoader succeeds, preventing a failed preload from
 * publishing a usable-looking but unloaded sheet.
 */
export async function loadSpriteSheetWithAssetLoader(
  assetLoader: Pick<AssetLoader, "load">,
  sheet: SpriteSheetDefinition,
  runtimeAssetId: string,
  source: ResolvedSpriteAssetSource
): Promise<void> {
  const sheetId = sheet.id.trim();
  const assetId = runtimeAssetId.trim();
  const uri = source.localUri?.trim() || source.uri?.trim();
  const originalUri = source.uri?.trim() || uri;
  const localUri = source.localUri?.trim();

  if (!sheetId) {
    throw new Error("Sprite asset adapter: sheet id must not be empty.");
  }
  if (!assetId) {
    throw new Error(`Sprite asset adapter: runtime asset id for "${sheetId}" must not be empty.`);
  }
  if (!uri || !originalUri) {
    throw new Error(`Sprite asset adapter: sheet "${sheetId}" has no resolved image URI.`);
  }

  const descriptor: AssetDescriptor = {
    id: assetId,
    path: uri,
    type: "image"
  };
  await assetLoader.load([descriptor]);

  const imageSource: SpriteImageSource = {
    uri: originalUri,
    ...(localUri ? { localUri } : {})
  };
  SpriteRegistry.register({
    ...sheet,
    imageSource
  });
}
