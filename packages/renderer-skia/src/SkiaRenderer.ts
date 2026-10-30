import { World, Renderer, CoreComponentRegistry, ShapeType, ShapeDrawer, EffectDrawer, ColliderComponent, buildRenderPlan, RenderQueueEntry } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia, PaintStyle, ClipOp } from "@shopify/react-native-skia";
import { SkiaCircleDrawer, SkiaBoxDrawer, SkiaPolygonDrawer } from "./SkiaShapeDrawers";
import { SkiaSpriteDrawer } from "./SkiaSpriteDrawer";

/**
 * Skia renderer implementation for TinyAster using @shopify/react-native-skia.
 */
export class SkiaRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, SkCanvas> {
  private paint: SkPaint;
  /** Reusable buffer passed to buildRenderPlan (zero-alloc path). */
  private entriesBuffer: RenderQueueEntry[] = [];
  public readonly type = "skia";
  private readonly backgroundEffects: Map<string, EffectDrawer<SkCanvas, TRegistry>> = new Map();
  private readonly foregroundEffects: Map<string, EffectDrawer<SkCanvas, TRegistry>> = new Map();

  constructor(
    private readonly shapeDrawers: Map<string, ShapeDrawer<SkCanvas, TRegistry>> = new Map()
  ) {
    this.paint = Skia.Paint();

    // Populate default shape drawers
    if (!this.shapeDrawers.has("sprite")) {
      this.shapeDrawers.set("sprite", new SkiaSpriteDrawer<TRegistry>(this.paint));
    }
    if (!this.shapeDrawers.has("Circle")) {
      this.shapeDrawers.set("Circle", new SkiaCircleDrawer(this.paint));
    }
    if (!this.shapeDrawers.has("circle")) {
      this.shapeDrawers.set("circle", new SkiaCircleDrawer(this.paint));
    }
    if (!this.shapeDrawers.has("Box")) {
      this.shapeDrawers.set("Box", new SkiaBoxDrawer(this.paint));
    }
    if (!this.shapeDrawers.has("box")) {
      this.shapeDrawers.set("box", new SkiaBoxDrawer(this.paint));
    }
    // Polygon support (parity with CanvasRenderer)
    if (!this.shapeDrawers.has("Polygon")) {
      this.shapeDrawers.set("Polygon", new SkiaPolygonDrawer(this.paint));
    }
    if (!this.shapeDrawers.has("polygon")) {
      this.shapeDrawers.set("polygon", new SkiaPolygonDrawer(this.paint));
    }
  }

  public registerShape(name: string, drawer: ShapeDrawer<SkCanvas, TRegistry>): void {
    this.shapeDrawers.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<SkCanvas, TRegistry>): void {
    this.backgroundEffects.set(name, drawer);
  }

  public registerForegroundEffect(name: string, drawer: EffectDrawer<SkCanvas, TRegistry>): void {
    this.foregroundEffects.set(name, drawer);
  }

  public render(world: World<TRegistry>, canvas: SkCanvas, _interpolation?: number): void {
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig");
    const plan = buildRenderPlan(world, this.entriesBuffer);
    // Keep buffer reference in case buildRenderPlan replaced the array
    this.entriesBuffer = plan.entries;

    const { viewportWidth, viewportHeight, entries, mainCamera } = plan;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (screenConfig && screenConfig.width > 0 && screenConfig.height > 0) {
      scale = Math.min(
        screenConfig.width / viewportWidth,
        screenConfig.height / viewportHeight
      );
      offsetX = (screenConfig.width - viewportWidth * scale) / 2;
      offsetY = (screenConfig.height - viewportHeight * scale) / 2;
    }

    canvas.save();

    // Always clear to black to prevent smearing / ghosting, matching CanvasRenderer behaviour.
    this.paint.reset();
    this.paint.setStyle(PaintStyle.Fill);
    this.paint.setColor(Skia.Color("#000000"));
    if (screenConfig && screenConfig.width > 0 && screenConfig.height > 0) {
      canvas.drawRect(Skia.XYWHRect(0, 0, screenConfig.width, screenConfig.height), this.paint);
    } else {
      canvas.drawRect(Skia.XYWHRect(0, 0, viewportWidth, viewportHeight), this.paint);
    }

    canvas.translate(offsetX, offsetY);
    canvas.scale(scale, scale);
    canvas.clipRect(Skia.XYWHRect(0, 0, viewportWidth, viewportHeight), ClipOp.Intersect, true);

    // Draw background effects first (e.g. scrolling starfield, retro CRT)
    for (const drawer of this.backgroundEffects.values()) {
      drawer.draw(canvas, world);
    }

    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const visualOffsetType = "VisualOffset" as Extract<keyof TRegistry, string>;

    canvas.save();

    let camX = 0;
    let camY = 0;
    let camZoom = 1;
    let camVoX = 0;
    let camVoY = 0;
    let hasMainCamera = false;

    if (mainCamera) {
      hasMainCamera = true;
      camX = mainCamera.x;
      camY = mainCamera.y;
      camZoom = mainCamera.zoom;
      camVoX = mainCamera.visualOffsetX;
      camVoY = mainCamera.visualOffsetY;
      canvas.translate(-camX, -camY);
      canvas.scale(camZoom, camZoom);
      if (camVoX !== 0 || camVoY !== 0) {
        canvas.translate(-camVoX, -camVoY);
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entity = entry.entity;
      const transform = entry.transform;
      const render = entry.render;

      canvas.save();

      if (hasMainCamera && render.ignoreCamera) {
        if (camVoX !== 0 || camVoY !== 0) {
          canvas.translate(camVoX, camVoY);
        }
        if (camZoom !== 0 && camZoom !== 1) {
          canvas.scale(1 / camZoom, 1 / camZoom);
        }
        canvas.translate(camX, camY);
      }

      const visualOffset = world.getComponent(entity, visualOffsetType) as unknown as { offsetX: number; offsetY: number; scaleX?: number; scaleY?: number } | undefined;
      const voX = visualOffset?.offsetX ?? 0;
      const voY = visualOffset?.offsetY ?? 0;
      const visualScaleX = visualOffset?.scaleX ?? 1;
      const visualScaleY = visualOffset?.scaleY ?? 1;

      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
      const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;

      canvas.translate(x + voX, y + voY);
      canvas.rotate((rotation * 180) / Math.PI, 0, 0);
      canvas.scale(scaleX * visualScaleX, scaleY * visualScaleY);

      this.paint.setColor(Skia.Color(render.color || "white"));
      this.paint.setAlphaf(render.opacity ?? 1);

      // 1. Try custom registered shape drawer
      const customDrawer = render.shape ? this.shapeDrawers.get(render.shape) : undefined;
      if (customDrawer) {
        customDrawer.draw(canvas, world, entity);
      } else {
        // 2. Try default physical collider shape drawer
        const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
        if (collider && collider.enabled) {
          const shapeTypeStr = ShapeType[collider.shape.type];
          const drawer = this.shapeDrawers.get(shapeTypeStr);
          if (drawer) {
            drawer.draw(canvas, world, entity);
          }
        } else {
          // 3. Draw fallback circle
          canvas.drawCircle(0, 0, 5, this.paint);
        }
      }

      canvas.restore();
    }

    // Foreground effects share the active camera transform and draw above entities.
    for (const drawer of this.foregroundEffects.values()) {
      drawer.draw(canvas, world);
    }

    canvas.restore();
    canvas.restore();
  }
}
