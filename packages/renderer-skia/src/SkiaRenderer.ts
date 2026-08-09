import { World, Renderer, CoreComponentRegistry, ShapeType, ShapeDrawer, EffectDrawer, Entity, Camera2DComponent, RenderComponent, TransformComponent, VisualOffsetComponent, ColliderComponent } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia } from "@shopify/react-native-skia";
import { SkiaCircleDrawer, SkiaBoxDrawer } from "./SkiaShapeDrawers";

/**
 * Skia renderer implementation for TinyAster using @shopify/react-native-skia.
 */
export class SkiaRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, SkCanvas> {
  private paint: SkPaint;
  private sortedEntities: Entity[] = [];
  public readonly type = "skia";
  private readonly backgroundEffects: Map<string, EffectDrawer<SkCanvas, TRegistry>> = new Map();

  constructor(
    private readonly shapeDrawers: Map<string, ShapeDrawer<SkCanvas, TRegistry>> = new Map()
  ) {
    this.paint = Skia.Paint();

    // Populate default shape drawers
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
  }

  public registerShape(name: string, drawer: ShapeDrawer<SkCanvas, TRegistry>): void {
    this.shapeDrawers.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<SkCanvas, TRegistry>): void {
    this.backgroundEffects.set(name, drawer);
  }

  public render(world: World<TRegistry>, canvas: SkCanvas, _interpolation?: number): void {
    // Draw background effects first (e.g. scrolling starfield, retro CRT)
    for (const drawer of this.backgroundEffects.values()) {
      drawer.draw(canvas, world);
    }
    const cameraType = "Camera2D" as Extract<keyof TRegistry, string>;
    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const renderType = "Render" as Extract<keyof TRegistry, string>;
    const visualOffsetType = "VisualOffset" as Extract<keyof TRegistry, string>;
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;

    // Handle Camera
    const cameras = world.query(cameraType);
    let mainCameraEntity: Entity | undefined;

    for (let i = 0; i < cameras.length; i++) {
      const cam = world.getComponent(cameras[i], cameraType) as Camera2DComponent | undefined;
      if (cam?.isMain) {
        mainCameraEntity = cameras[i];
        break;
      }
    }

    canvas.save();

    if (mainCameraEntity !== undefined) {
      const cam = world.getComponent(mainCameraEntity, cameraType) as Camera2DComponent | undefined;
      if (cam) {
        // Center camera and apply zoom
        canvas.translate(-cam.x, -cam.y);
        canvas.scale(cam.zoom, cam.zoom);

        const visualOffset = world.getComponent(mainCameraEntity, visualOffsetType) as VisualOffsetComponent | undefined;
        if (visualOffset) {
          canvas.translate(-visualOffset.offsetX, -visualOffset.offsetY);
        }
      }
    }

    const entities = world.query(transformType, renderType);

    if (this.sortedEntities.length !== entities.length) {
      this.sortedEntities = [...entities];
    } else {
      for (let i = 0; i < entities.length; i++) {
        this.sortedEntities[i] = entities[i];
      }
    }

    // Sort by order to handle layering directly in-place
    this.sortedEntities.sort((a, b) => {
      const renderA = world.getComponent(a, renderType) as RenderComponent | undefined;
      const renderB = world.getComponent(b, renderType) as RenderComponent | undefined;
      return (renderA?.order || 0) - (renderB?.order || 0);
    });

    for (let i = 0; i < this.sortedEntities.length; i++) {
      const entity = this.sortedEntities[i];
      const transform = world.getComponent(entity, transformType) as TransformComponent | undefined;
      const render = world.getComponent(entity, renderType) as RenderComponent | undefined;

      if (!render || !transform || !render.visible || render.opacity === 0) continue;

      canvas.save();

      const visualOffset = world.getComponent(entity, visualOffsetType) as unknown as { offsetX: number; offsetY: number; scaleX?: number; scaleY?: number } | undefined;
      const offsetX = visualOffset?.offsetX ?? 0;
      const offsetY = visualOffset?.offsetY ?? 0;
      const visualScaleX = visualOffset?.scaleX ?? 1;
      const visualScaleY = visualOffset?.scaleY ?? 1;

      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
      const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;

      canvas.translate(x + offsetX, y + offsetY);
      canvas.rotate((rotation * 180) / Math.PI, 0, 0);
      canvas.scale(scaleX * visualScaleX, scaleY * visualScaleY);

      this.paint.setColor(Skia.Color(render.color || "white"));
      this.paint.setAlphaf(render.opacity ?? 1);

      // 1. Try custom registered shape drawer (e.g., shield_bubble, player_ship, invader)
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

    canvas.restore();
  }
}
