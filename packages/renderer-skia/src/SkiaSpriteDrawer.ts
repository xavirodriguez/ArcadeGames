import { World, Entity, SpriteComponent, AssetLoader } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia, SkImage, BlendMode } from "@shopify/react-native-skia";

/**
 * Drawer for rendering SpriteComponent using React Native Skia.
 */
export class SkiaSpriteDrawer {
  constructor(private readonly paint: SkPaint) {}

  public draw(canvas: SkCanvas, world: World, entity: Entity): void {
    const sprite = world.getComponent(entity, "Sprite") as SpriteComponent | undefined;
    if (!sprite) return;

    const assetLoader = world.getResource<AssetLoader>("AssetLoader");
    if (!assetLoader) return;

    const key = sprite.textureId || sprite.assetKey;
    if (!key) return;

    const img = assetLoader.get<SkImage>(key);
    if (!img) return;

    canvas.save();

    // Anchor
    const anchorX = sprite.anchor?.x ?? 0.5;
    const anchorY = sprite.anchor?.y ?? 0.5;

    // Flip
    const flipX = sprite.flipX ? -1 : 1;
    const flipY = sprite.flipY ? -1 : 1;
    if (sprite.flipX || sprite.flipY) {
      canvas.scale(flipX, flipY);
    }

    // Tint (Skia has color filters for tinting)
    if (sprite.tint) {
      const tintColor = Skia.Color(sprite.tint);
      const colorFilter = Skia.ColorFilter.MakeBlend(tintColor, BlendMode.SrcIn);
      this.paint.setColorFilter(colorFilter);
    } else {
      this.paint.setColorFilter(null);
    }

    const imgAsRecord = img as unknown as { width?: unknown; height?: unknown };
    if (sprite.srcRect) {
      const { x, y, w, h } = sprite.srcRect;
      const src = Skia.XYWHRect(x, y, w, h);
      const dest = Skia.XYWHRect(-w * anchorX, -h * anchorY, w, h);
      canvas.drawImageRect(img, src, dest, this.paint);
    } else {
      const w = typeof imgAsRecord.width === "function" ? (imgAsRecord.width as () => number)() : ((imgAsRecord.width as number) || 0);
      const h = typeof imgAsRecord.height === "function" ? (imgAsRecord.height as () => number)() : ((imgAsRecord.height as number) || 0);
      const dest = Skia.XYWHRect(-w * anchorX, -h * anchorY, w, h);
      const src = Skia.XYWHRect(0, 0, w, h);
      canvas.drawImageRect(img, src, dest, this.paint);
    }

    // Reset color filter
    this.paint.setColorFilter(null);

    canvas.restore();
  }
}
