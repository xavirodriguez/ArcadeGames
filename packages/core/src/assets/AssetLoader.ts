import { z } from "zod";

/**
 * Schema for specifying assets.
 * @public
 */
export const AssetDescriptorSchema = z.object({
  id: z.string(),
  path: z.unknown(),
  type: z.enum(["image", "audio", "font", "texture", "json"])
});

/**
 * Descriptor for a single asset to be loaded.
 * @public
 */
export type AssetDescriptor = z.infer<typeof AssetDescriptorSchema>;

/**
 * Platform adapter interface providing low-level resource loading methods for images, audio, fonts, and raw data.
 *
 * @remarks
 * Concrete implementations adapt platform-specific resource mechanisms (HTML Image / Web Audio for browser,
 * Expo/Skia/Async asset resolve for mobile). Used by {@link AssetLoader}.
 *
 * @example
 * ```ts
 * class CustomProvider implements IAssetProvider {
 *   async loadImage(path: string): Promise<unknown> { return fetch(path).then(r => r.blob()); }
 *   async loadAudio(path: string): Promise<unknown> { return fetch(path).then(r => r.arrayBuffer()); }
 *   async loadFont(path: string): Promise<unknown> { return true; }
 * }
 * ```
 *
 * @public
 */
export interface IAssetProvider {
  /**
   * Loads an image or texture resource from the specified path or URI.
   *
   * @param path - Relative or absolute path / URI pointing to the image asset.
   * @returns A promise resolving to the platform-specific image element or object.
   *
   * @example
   * ```ts
   * const img = await provider.loadImage("assets/sprites/player.png");
   * ```
   */
  loadImage(path: string): Promise<unknown>;

  /**
   * Loads an audio clip resource from the specified path or URI.
   *
   * @param path - Relative or absolute path / URI pointing to the audio asset.
   * @returns A promise resolving to the platform-specific audio object or buffer.
   *
   * @example
   * ```ts
   * const sound = await provider.loadAudio("assets/audio/laser.wav");
   * ```
   */
  loadAudio(path: string): Promise<unknown>;

  /**
   * Loads a font resource from the specified path or URI.
   *
   * @param path - Relative or absolute path / URI pointing to the font asset.
   * @returns A promise resolving when the font is loaded and registered.
   *
   * @example
   * ```ts
   * await provider.loadFont("assets/fonts/Arcade.ttf");
   * ```
   */
  loadFont(path: string): Promise<unknown>;

  /**
   * Optional generic asset or JSON resource loader.
   *
   * @param path - Path or URI to the raw JSON or custom asset data.
   * @returns A promise resolving to the parsed data object.
   *
   * @example
   * ```ts
   * const json = await provider.load?.("assets/config/game.json");
   * ```
   */
  load?(path: string): Promise<unknown>;
}

/**
 * Platform-agnostic coordinator for asset loading and caching.
 *
 * @remarks
 * This class delegates the actual loading of platform-specific resources
 * (e.g. browser `Image` or React Native assets) to an injected `IAssetProvider`.
 * It provides a unified interface for queuing and retrieving loaded assets.
 *
 * @warning
 * **Resource Management**: The `AssetLoader` caches resources indefinitely.
 * Manual clearing may be required for long-running sessions to prevent
 * excessive memory usage.
 *
 * @example
 * ```ts
 * const loader = new AssetLoader(provider);
 * loader.queueAssets([
 *   { id: "ship", path: "assets/ship.png", type: "image" }
 * ]);
 * await loader.loadAll();
 * const shipImage = loader.get<HTMLImageElement>("ship");
 * ```
 *
 * @public
 */
export class AssetLoader {
  private cache = new Map<string, unknown>();
  private queue: AssetDescriptor[] = [];

  /**
   * Creates an instance of AssetLoader with an optional platform provider.
   *
   * @param provider - Platform resource loading provider implementing {@link IAssetProvider}.
   */
  constructor(private provider?: IAssetProvider) {}

  /**
   * Assigns or updates the platform asset provider.
   *
   * @param provider - Platform resource loader implementing {@link IAssetProvider}.
   * @returns Void.
   *
   * @example
   * ```ts
   * loader.setProvider(new WebAssetProvider());
   * ```
   */
  public setProvider(provider: IAssetProvider): void {
    this.provider = provider;
  }

  /**
   * Checks whether a platform provider has been registered.
   *
   * @returns `true` if an {@link IAssetProvider} is set, `false` otherwise.
   *
   * @example
   * ```ts
   * if (!loader.hasProvider()) {
   *   loader.setProvider(new WebAssetProvider());
   * }
   * ```
   */
  public hasProvider(): boolean {
    return this.provider !== undefined;
  }

  /**
   * Validates and adds asset descriptors to the internal pending loading queue.
   *
   * @param assets - Array of asset descriptors matching {@link AssetDescriptorSchema}.
   * @returns Void.
   *
   * @example
   * ```ts
   * loader.queueAssets([{ id: "sfx_shot", path: "sfx/shot.wav", type: "audio" }]);
   * ```
   */
  public queueAssets(assets: AssetDescriptor[]): void {
    for (const asset of assets) {
      AssetDescriptorSchema.parse(asset);
    }
    this.queue.push(...assets);
  }

  /**
   * Asynchronously loads a specific array of asset descriptors using the registered provider.
   *
   * @param assets - Array of asset descriptors to load immediately.
   * @returns Promise resolving when all specified assets have loaded and cached.
   * @throws Error if no asset provider is registered prior to calling `load`.
   *
   * @example
   * ```ts
   * await loader.load([{ id: "bg", path: "bg.png", type: "image" }]);
   * ```
   */
  public async load(assets: AssetDescriptor[]): Promise<void> {
    for (const asset of assets) {
      AssetDescriptorSchema.parse(asset);
    }

    if (!this.provider) {
      throw new Error("AssetLoader: no provider registered. Call setProvider() before load()");
    }

    const promises = assets.map(async asset => {
      if (this.cache.has(asset.id)) return;

      let loadedAsset: unknown;
      switch (asset.type) {
        case "image":
        case "texture":
          loadedAsset = await this.provider!.loadImage(asset.path as string);
          break;
        case "audio":
          loadedAsset = await this.provider!.loadAudio(asset.path as string);
          break;
        case "font":
          loadedAsset = await this.provider!.loadFont(asset.path as string);
          break;
        case "json":
          if (this.provider!.load) {
            loadedAsset = await this.provider!.load(asset.path as string);
          }
          break;
      }
      this.cache.set(asset.id, loadedAsset);
    });

    await Promise.all(promises);
  }

  /**
   * Asynchronously processes and loads all queued asset descriptors.
   *
   * @returns Promise resolving when all queued assets have loaded.
   *
   * @example
   * ```ts
   * loader.queueAssets(descriptors);
   * await loader.loadAll();
   * ```
   */
  public async loadAll(): Promise<void> {
    if (this.queue.length === 0) return;
    await this.load(this.queue);
    this.queue = [];
  }

  /**
   * Parses TexturePacker (Hash/Array) or Aseprite frame atlas JSON and registers frame sub-regions.
   *
   * @param atlasJson - The parsed JSON descriptor from TexturePacker or Aseprite.
   * @returns Map of frame names to source rectangle sub-regions (`{ x, y, w, h }`).
   *
   * @example
   * ```ts
   * const frames = loader.parseAtlas(atlasData);
   * const frameRect = frames.get("idle_0.png");
   * ```
   */
  public parseAtlas(atlasJson: unknown): Map<string, { x: number; y: number; w: number; h: number }> {
    const framesMap = new Map<string, { x: number; y: number; w: number; h: number }>();
    if (!atlasJson || typeof atlasJson !== "object") return framesMap;

    const rawObj = atlasJson as Record<string, unknown>;
    const rawFrames = rawObj.frames;
    if (Array.isArray(rawFrames)) {
      // TexturePacker Array format or Aseprite array format
      for (const item of rawFrames) {
        if (item && typeof item === "object") {
          const frameObj = item as { filename?: string; frame?: { x: number; y: number; w: number; h: number } };
          if (frameObj.filename && frameObj.frame) {
            const { x, y, w, h } = frameObj.frame;
            framesMap.set(frameObj.filename, { x, y, w, h });
          }
        }
      }
    } else if (rawFrames && typeof rawFrames === "object") {
      // TexturePacker Hash format or Aseprite object format
      for (const [filename, item] of Object.entries(rawFrames as Record<string, unknown>)) {
        if (item && typeof item === "object") {
          const frameObj = item as { frame?: { x: number; y: number; w: number; h: number } };
          if (frameObj.frame) {
            const { x, y, w, h } = frameObj.frame;
            framesMap.set(filename, { x, y, w, h });
          }
        }
      }
    }

    return framesMap;
  }

  /**
   * Retrieves a loaded asset from cache by its identifier.
   *
   * @param id - Unique asset identifier.
   * @returns The cached asset object cast to `T`.
   *
   * @example
   * ```ts
   * const sprite = loader.get<HTMLImageElement>("player_ship");
   * ```
   */
  public get<T>(id: string): T {
    return this.cache.get(id) as T;
  }
}
