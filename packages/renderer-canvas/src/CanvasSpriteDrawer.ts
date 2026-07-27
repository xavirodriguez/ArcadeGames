import { World, Entity, SpriteComponent, AssetLoader } from "@tiny-aster/core";

/**
 * Drawer for rendering SpriteComponent in HTML5 Canvas.
 */
export class CanvasSpriteDrawer {
  public draw(ctx: CanvasRenderingContext2D, world: World, entity: Entity): void {
    const sprite = world.getComponent(entity, "Sprite") as SpriteComponent | undefined;
    if (!sprite) return;

    const assetLoader = world.getResource<AssetLoader>("AssetLoader");
    if (!assetLoader) return;

    const key = sprite.textureId || sprite.assetKey;
    if (!key) return;

    const img = assetLoader.get<HTMLImageElement>(key);
    if (!img) return;

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
    if (sprite.srcRect) {
      const { x, y, w, h } = sprite.srcRect;
      const dx = -w * anchorX;
      const dy = -h * anchorY;
      ctx.drawImage(img, x, y, w, h, dx, dy, w, h);
    } else {
      const w = img.width || 0;
      const h = img.height || 0;
      const dx = -w * anchorX;
      const dy = -h * anchorY;
      ctx.drawImage(img, dx, dy, w, h);
    }

    ctx.restore();
  }
}
