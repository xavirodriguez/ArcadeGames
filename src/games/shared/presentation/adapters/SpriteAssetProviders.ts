import type { SkImage } from "@shopify/react-native-skia";
import {
  getCanvasSpriteImage,
  getCanvasSpriteLoadState,
  getSkiaImage,
  getSkiaSpriteLoadState,
  preloadSpriteSheetCanvas,
  preloadSpriteSheetSkia,
  type SpriteLoadState
} from "../../sprites/SpriteDrawer";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import type { PresentationCanvasImageResolver } from "../backends/CanvasPresentationPainter";
import type { PresentationSkiaImageResolver } from "../backends/SkiaPresentationPainter";

/**
 * Image access and preload lifecycle for theme assets registered with SpriteRegistry.
 * Loading is explicit and never initiated by a painter's per-frame drawImage call.
 */
export interface PresentationSpriteAssetProvider<TImage> {
  getImage(assetId: string): TImage | undefined;
  getLoadState(assetId: string): SpriteLoadState;
  preload(assetIds: ReadonlyArray<string>): Promise<void>;
}

export class CanvasPresentationSpriteAssets
  implements PresentationCanvasImageResolver, PresentationSpriteAssetProvider<CanvasImageSource> {
  public getImage(assetId: string): CanvasImageSource | undefined {
    return getCanvasSpriteImage(assetId);
  }

  public getLoadState(assetId: string): SpriteLoadState {
    return getCanvasSpriteLoadState(assetId);
  }

  public preload(assetIds: ReadonlyArray<string>): Promise<void> {
    return preloadRegisteredSprites(
      assetIds,
      preloadSpriteSheetCanvas,
      getCanvasSpriteLoadState,
      "Canvas"
    );
  }
}

export class SkiaPresentationSpriteAssets
  implements PresentationSkiaImageResolver, PresentationSpriteAssetProvider<SkImage> {
  public getImage(assetId: string): SkImage | undefined {
    return getSkiaImage(assetId);
  }

  public getLoadState(assetId: string): SpriteLoadState {
    return getSkiaSpriteLoadState(assetId);
  }

  public preload(assetIds: ReadonlyArray<string>): Promise<void> {
    return preloadRegisteredSprites(
      assetIds,
      preloadSpriteSheetSkia,
      getSkiaSpriteLoadState,
      "Skia"
    );
  }
}

async function preloadRegisteredSprites(
  assetIds: ReadonlyArray<string>,
  preload: (assetId: string) => Promise<void>,
  getLoadState: (assetId: string) => SpriteLoadState,
  backend: "Canvas" | "Skia"
): Promise<void> {
  const uniqueAssetIds = [...new Set(assetIds)];
  const unregistered = uniqueAssetIds.filter((assetId) => !SpriteRegistry.has(assetId));
  if (unregistered.length > 0) {
    throw new Error(
      "[PresentationSpriteAssetProvider] Unregistered sprite asset(s): " + unregistered.join(", ")
    );
  }

  await Promise.all(uniqueAssetIds.map((assetId) => preload(assetId)));

  const failed = uniqueAssetIds.filter((assetId) => getLoadState(assetId) === "failed");
  if (failed.length > 0) {
    throw new Error(
      "[PresentationSpriteAssetProvider] " + backend + " failed to load sprite asset(s): " + failed.join(", ")
    );
  }
}
