import type { Asset } from "expo-asset";

/**
 * Cache of already-resolved Metro image assets, keyed by module id.
 *
 * @remarks
 * `BaseGame.restart()` re-runs `onPreloadAssets()`, so any loader that
 * resolves and downloads a Metro asset again pays the download cost a second
 * time. On web that second `Asset.downloadAsync()` re-probes the image through
 * a fresh `Image` element and can stall indefinitely, which aborts
 * `BaseGame.init()` through its 10s init timeout and leaves the restarted
 * World without entities (no player, no wave director).
 *
 * Resolving each module id once keeps restarts cheap and deterministic, and
 * mirrors the cache already used by `SpriteDrawer.resolveExpoAsset`.
 */
const resolvedAssets = new Map<number, Promise<Asset>>();

/**
 * Resolves and downloads a Metro image asset exactly once per module id.
 *
 * @param moduleId - Metro asset module id (the value returned by `require`).
 * @param createAsset - Factory that materializes the `Asset` for the module id.
 * @returns Promise resolving to the downloaded asset.
 * @public
 */
export function resolveSpriteAssetOnce(
  moduleId: number,
  createAsset: () => Asset
): Promise<Asset> {
  const cached = resolvedAssets.get(moduleId);
  if (cached) return cached;

  const pending = (async () => {
    const asset = createAsset();
    await asset.downloadAsync();
    return asset;
  })().catch((error: unknown) => {
    // A failed download must not poison the cache: the next attempt retries.
    resolvedAssets.delete(moduleId);
    throw error;
  });

  resolvedAssets.set(moduleId, pending);
  return pending;
}

/**
 * Clears the resolved-asset cache. Intended for tests.
 * @public
 */
export function resetResolvedSpriteAssets(): void {
  resolvedAssets.clear();
}
