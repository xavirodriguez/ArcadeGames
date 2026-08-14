import { World, Entity, SpriteComponent, AssetLoader, ShapeDrawer, CoreComponentRegistry } from "@tiny-aster/core";

const htmlImageCache = new Map<string, HTMLImageElement>();

function getOrCreateCachedHtmlImage(uri: string): HTMLImageElement | null {
  if (typeof Image === "undefined") {
    return null;
  }
  let cached = htmlImageCache.get(uri);
  if (!cached) {
    cached = new Image();
    cached.src = uri;
    htmlImageCache.set(uri, cached);
  }
  return cached;
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
      img = rawImg as unknown as HTMLImageElementMock;
    } else if (rawImg && typeof rawImg === "object") {
      const miniAsset = rawImg as MiniExpoAsset;
      const uri = miniAsset.localUri || miniAsset.uri;
      if (uri) {
        img = getOrCreateCachedHtmlImage(uri) as unknown as HTMLImageElementMock;
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
      const dx = -w * anchorX;
      const dy = -h * anchorY;
      ctx.drawImage(htmlImg, x, y, w, h, dx, dy, w, h);
    } else {
      const w = img.width || 0;
      const h = img.height || 0;
      const dx = -w * anchorX;
      const dy = -h * anchorY;
      ctx.drawImage(htmlImg, dx, dy, w, h);
    }

    ctx.restore();
  }
}
