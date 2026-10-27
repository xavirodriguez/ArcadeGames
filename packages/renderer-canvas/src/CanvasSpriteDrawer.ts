import { calculateSpriteDestinationRect, World, Entity, SpriteComponent, AssetLoader, ShapeDrawer, CoreComponentRegistry } from "@tiny-aster/core";

export type ImageLoadStatus = "loading" | "ready" | "error";

export interface CachedImageEntry {
  img: HTMLImageElement;
  status: ImageLoadStatus;
  promise: Promise<HTMLImageElement>;
}

const htmlImageCache = new Map<string, CachedImageEntry>();

export function getCachedHtmlImageEntry(uri: string): CachedImageEntry | null {
  if (typeof Image === "undefined") {
    return null;
  }
  let entry = htmlImageCache.get(uri);
  if (!entry) {
    const img = new Image();
    let resolvePromise!: (img: HTMLImageElement) => void;
    let rejectPromise!: (err: unknown) => void;

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const newEntry: CachedImageEntry = {
      img,
      status: "loading",
      promise,
    };
    entry = newEntry;
    htmlImageCache.set(uri, entry);

    const markReady = () => {
      if (newEntry.status !== "ready") {
        newEntry.status = "ready";
        resolvePromise(img);
      }
    };

    const markError = (err?: unknown) => {
      if (newEntry.status !== "error") {
        newEntry.status = "error";
        rejectPromise(err ?? new Error(`Failed to load image: ${uri}`));
      }
    };

    img.onload = () => {
      markReady();
    };

    img.onerror = (e) => {
      markError(e);
    };

    img.src = uri;

    if (typeof img.decode === "function") {
      img.decode()
        .then(() => {
          markReady();
        })
        .catch((err) => {
          if (img.complete && img.naturalWidth > 0) {
            markReady();
          } else if (img.complete) {
            markError(err);
          }
        });
    }

    if (img.complete) {
      if (img.naturalWidth > 0) {
        markReady();
      } else {
        markError();
      }
    }
  }
  return entry;
}

/**
 * Preloads a list of image URIs and returns a promise that resolves when all images
 * have finished loading (status 'ready') or encountered an error (status 'error').
 */
export async function preloadSprites(uris: string[]): Promise<void> {
  const promises = uris.map((uri) => {
    const entry = getCachedHtmlImageEntry(uri);
    if (!entry) return Promise.resolve();
    return entry.promise.catch(() => {
      // Intentionally catch error so preloadSprites completes even if an asset fails to load
    });
  });
  await Promise.all(promises);
}

/**
 * Clears the HTML image cache.
 */
export function clearHtmlImageCache(): void {
  htmlImageCache.clear();
}

interface MiniExpoAsset {
  uri?: string;
  localUri?: string;
}

interface HTMLImageElementMock {
  width?: number;
  height?: number;
  complete?: boolean;
}

/**
 * Drawer for rendering SpriteComponent in HTML5 Canvas.
 */
export class CanvasSpriteDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: Entity): void {
    const sprite = world.getComponent(entity, "Sprite" as Extract<keyof TRegistry, string>) as SpriteComponent | undefined;
    if (!sprite) return;

    const assetLoader = world.getResource<AssetLoader>("AssetLoader");
    if (!assetLoader) return;

    const key = sprite.textureId || sprite.assetKey;
    if (!key) return;

    const rawImg = assetLoader.get<unknown>(key);
    if (!rawImg) return;

    let img: HTMLImageElementMock | null = null;
    if (typeof HTMLImageElement !== "undefined" && rawImg instanceof HTMLImageElement) {
      if (!rawImg.complete || rawImg.naturalWidth === 0) {
        return;
      }
      img = rawImg as unknown as HTMLImageElementMock;
    } else if (rawImg && typeof rawImg === "object") {
      const miniAsset = rawImg as MiniExpoAsset;
      const uri = miniAsset.localUri || miniAsset.uri;
      if (uri) {
        const entry = getCachedHtmlImageEntry(uri);
        if (!entry || entry.status !== "ready") {
          return;
        }
        img = entry.img as unknown as HTMLImageElementMock;
      } else {
        // Fallback for mock/plain-object HTMLImageElement in node/test environments
        img = rawImg as HTMLImageElementMock;
      }
    }

    if (!img) return;

    // Wait until browser finishes loading the image to prevent drawing incomplete assets or throwing errors
    if (typeof img.complete !== "undefined" && !img.complete) {
      return;
    }

    ctx.save();

    // Anchor
    const anchorX = sprite.anchor?.x ?? 0.5;
    const anchorY = sprite.anchor?.y ?? 0.5;
    const spriteScale = sprite.scale ?? 1;

    // Apply flip
    const flipX = sprite.flipX ? -1 : 1;
    const flipY = sprite.flipY ? -1 : 1;
    if (sprite.flipX || sprite.flipY) {
      ctx.scale(flipX, flipY);
    }

    // Source rect vs full image drawing
    const htmlImg = img as unknown as HTMLImageElement;
    if (sprite.srcRect) {
      const { x, y, w, h } = sprite.srcRect;
      const destination = calculateSpriteDestinationRect(
        w * spriteScale,
        h * spriteScale,
        { x: anchorX, y: anchorY }
      );
      if (!destination) {
        ctx.restore();
        return;
      }
      ctx.drawImage(
        htmlImg,
        x,
        y,
        w,
        h,
        destination.x,
        destination.y,
        destination.width,
        destination.height
      );
    } else {
      const w = img.width || 0;
      const h = img.height || 0;
      const destination = calculateSpriteDestinationRect(
        w * spriteScale,
        h * spriteScale,
        { x: anchorX, y: anchorY }
      );
      if (!destination) {
        ctx.restore();
        return;
      }
      ctx.drawImage(
        htmlImg,
        destination.x,
        destination.y,
        destination.width,
        destination.height
      );
    }

    ctx.restore();
  }
}
