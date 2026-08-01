import { World, ShapeDrawer, CoreComponentRegistry, ShapeType, CircleShape, BoxShape, ColliderComponent, RenderComponent, ConvexPolygonShape, TransformComponent, ParallaxLayerComponent } from "@tiny-aster/core";

/**
 * Drawer for circle shapes in HTML5 Canvas.
 */
export class CanvasCircleDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;

    let radius = 5;
    let offsetX = 0;
    let offsetY = 0;

    if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
      radius = (collider.shape as CircleShape).radius;
      offsetX = collider.offsetX ?? 0;
      offsetY = collider.offsetY ?? 0;
    } else {
      const renderType = "Render" as Extract<keyof TRegistry, string>;
      const render = world.getComponent(entity, renderType) as RenderComponent | undefined;
      if (render && render.size !== undefined) {
        radius = render.size / 2;
      }
    }

    ctx.beginPath();
    ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * High-fidelity, zero-allocation tile shape drawer for parallax background layers.
 * Supports "sky_gradient", "mountains", "skyline", "clouds", and "ground" procedural rendering.
 *
 * @public
 */
export class CanvasParallaxTileDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  private skyGradient: CanvasGradient | null = null;
  private lastGradientHeight = 0;

  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const transform = world.getComponent(entity, transformType) as unknown as TransformComponent | undefined;
    const parallaxLayerType = "ParallaxLayer" as Extract<keyof TRegistry, string>;
    const layer = world.getComponent(entity, parallaxLayerType) as unknown as ParallaxLayerComponent | undefined;
    if (!transform || !layer) return;

    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };
    const tileWidth = layer.tileWidth || screen.width;
    const tileHeight = layer.tileHeight || screen.height;

    // Save context and force screen-space coordinate alignment (resetting transform matrix)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate position of the layer on screen. Since ParallaxSystem already calculates
    // the screen-space position into transform.x/y, we use those values directly.
    const screenX = transform.x;
    const screenY = transform.y;

    // Modulo offsets for tiled drawing
    let startX = screenX % tileWidth;
    while (startX > 0) startX -= tileWidth;
    while (startX < -tileWidth) startX += tileWidth;

    let startY = screenY % tileHeight;
    while (startY > 0) startY -= tileHeight;
    while (startY < -tileHeight) startY += tileHeight;

    const drawType = layer.layerType;

    if (drawType === "sky_gradient") {
      // Draw background vertical sky gradient (no tile loop needed as it covers the full viewport)
      if (!this.skyGradient || this.lastGradientHeight !== screen.height) {
        this.skyGradient = ctx.createLinearGradient(0, 0, 0, screen.height);
        this.skyGradient.addColorStop(0, "#1a2a6c"); // Deep midnight blue
        this.skyGradient.addColorStop(0.5, "#b21f1f"); // Retro dark sunset red
        this.skyGradient.addColorStop(1, "#fdbb2d"); // Warm amber glow
        this.lastGradientHeight = screen.height;
      }
      ctx.fillStyle = this.skyGradient;
      ctx.fillRect(0, 0, screen.width, screen.height);
    } else {
      // Perform tiled drawing covering the screen dimensions
      for (let tx = startX; tx < screen.width; tx += tileWidth) {
        for (let ty = startY; ty < screen.height; ty += tileHeight) {
          ctx.save();

          if (drawType === "mountains") {
            // Draw stylized retro triangles for far mountains
            ctx.fillStyle = "#2c3e50"; // Dark slate
            ctx.beginPath();
            ctx.moveTo(tx, ty + tileHeight);
            ctx.lineTo(tx + tileWidth * 0.3, ty + tileHeight * 0.3);
            ctx.lineTo(tx + tileWidth * 0.6, ty + tileHeight);
            ctx.lineTo(tx + tileWidth * 0.8, ty + tileHeight * 0.5);
            ctx.lineTo(tx + tileWidth, ty + tileHeight);
            ctx.closePath();
            ctx.fill();

            // Mountain highlight ridges
            ctx.strokeStyle = "#34495e";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tx + tileWidth * 0.3, ty + tileHeight * 0.3);
            ctx.lineTo(tx + tileWidth * 0.45, ty + tileHeight);
            ctx.moveTo(tx + tileWidth * 0.8, ty + tileHeight * 0.5);
            ctx.lineTo(tx + tileWidth * 0.9, ty + tileHeight);
            ctx.stroke();
          }
          else if (drawType === "skyline") {
            // Draw retro city building silhouettes
            ctx.fillStyle = "#1e272c"; // Deep charcoal

            // Building 1
            ctx.fillRect(tx, ty + tileHeight - 110, 45, 110);
            // Building 1 details (windows)
            ctx.fillStyle = "rgba(253, 187, 45, 0.4)";
            ctx.fillRect(tx + 10, ty + tileHeight - 90, 8, 12);
            ctx.fillRect(tx + 25, ty + tileHeight - 90, 8, 12);
            ctx.fillRect(tx + 10, ty + tileHeight - 60, 8, 12);
            ctx.fillRect(tx + 25, ty + tileHeight - 60, 8, 12);

            // Building 2
            ctx.fillStyle = "#253138";
            ctx.fillRect(tx + 45, ty + tileHeight - 150, 60, 150);
            ctx.fillStyle = "rgba(253, 187, 45, 0.5)";
            ctx.fillRect(tx + 55, ty + tileHeight - 130, 10, 15);
            ctx.fillRect(tx + 80, ty + tileHeight - 130, 10, 15);
            ctx.fillRect(tx + 55, ty + tileHeight - 90, 10, 15);
            ctx.fillRect(tx + 80, ty + tileHeight - 90, 10, 15);

            // Building 3 (tall antenna)
            ctx.fillStyle = "#1e272c";
            ctx.fillRect(tx + 105, ty + tileHeight - 130, 40, 130);
            ctx.strokeStyle = "#1e272c";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tx + 125, ty + tileHeight - 130);
            ctx.lineTo(tx + 125, ty + tileHeight - 170);
            ctx.stroke();
            // Blinking antenna red light
            const tick = world.tick ?? 0;
            if (Math.floor(tick / 15) % 2 === 0) {
              ctx.fillStyle = "#ff3300";
              ctx.beginPath();
              ctx.arc(tx + 125, ty + tileHeight - 170, 3, 0, Math.PI * 2);
              ctx.fill();
            }

            // Building 4
            ctx.fillStyle = "#1c2326";
            ctx.fillRect(tx + 145, ty + tileHeight - 95, 55, 95);

            // Building 5 (diagonal roof)
            ctx.fillStyle = "#28343b";
            ctx.beginPath();
            ctx.moveTo(tx + 200, ty + tileHeight);
            ctx.lineTo(tx + 200, ty + tileHeight - 80);
            ctx.lineTo(tx + 250, ty + tileHeight - 110);
            ctx.lineTo(tx + 250, ty + tileHeight);
            ctx.closePath();
            ctx.fill();

            // Building 6
            ctx.fillStyle = "#1f292e";
            ctx.fillRect(tx + 250, ty + tileHeight - 140, 50, 140);
            ctx.fillStyle = "rgba(253, 187, 45, 0.35)";
            ctx.fillRect(tx + 260, ty + tileHeight - 120, 8, 12);
            ctx.fillRect(tx + 280, ty + tileHeight - 120, 8, 12);
            ctx.fillRect(tx + 260, ty + tileHeight - 80, 8, 12);
            ctx.fillRect(tx + 280, ty + tileHeight - 80, 8, 12);

            // Building 7
            ctx.fillStyle = "#182024";
            ctx.fillRect(tx + 300, ty + tileHeight - 110, 100, 110);
          }
          else if (drawType === "clouds") {
            // Draw fluffy semi-transparent sky clouds
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.beginPath();
            ctx.arc(tx + tileWidth * 0.25, ty + tileHeight * 0.6, tileHeight * 0.28, 0, Math.PI * 2);
            ctx.arc(tx + tileWidth * 0.45, ty + tileHeight * 0.45, tileHeight * 0.38, 0, Math.PI * 2);
            ctx.arc(tx + tileWidth * 0.65, ty + tileHeight * 0.6, tileHeight * 0.28, 0, Math.PI * 2);
            ctx.arc(tx + tileWidth * 0.45, ty + tileHeight * 0.6, tileHeight * 0.3, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
          }
          else if (drawType === "ground") {
            // Draw gorgeous grassy scrolling terrain
            // 1. Solid light brown dirt background
            ctx.fillStyle = "#deb887";
            ctx.fillRect(tx, ty, tileWidth, tileHeight);

            // 2. Main green grass top
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(tx, ty, tileWidth, 8);

            // 3. Darker green grass shaded lower line
            ctx.fillStyle = "#27ae60";
            ctx.fillRect(tx, ty + 8, tileWidth, 4);

            // 4. Stylized dirt crevices/rocks texture
            ctx.strokeStyle = "#c6a072";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tx + tileWidth * 0.2, ty + 18);
            ctx.lineTo(tx + tileWidth * 0.25, ty + 24);
            ctx.moveTo(tx + tileWidth * 0.6, ty + 26);
            ctx.lineTo(tx + tileWidth * 0.55, ty + 32);
            ctx.moveTo(tx + tileWidth * 0.8, ty + 16);
            ctx.lineTo(tx + tileWidth * 0.82, ty + 20);
            ctx.stroke();
          }

          ctx.restore();
        }
      }
    }

    ctx.restore();
  }
}

/**
 * Drawer for box shapes in HTML5 Canvas.
 */
export class CanvasBoxDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;

    let width = 10;
    let height = 10;
    let offsetX = 0;
    let offsetY = 0;

    if (collider && collider.enabled && collider.shape.type === ShapeType.Box) {
      const shape = collider.shape as BoxShape;
      width = shape.width;
      height = shape.height;
      offsetX = collider.offsetX ?? 0;
      offsetY = collider.offsetY ?? 0;
    } else {
      const renderType = "Render" as Extract<keyof TRegistry, string>;
      const render = world.getComponent(entity, renderType) as RenderComponent | undefined;
      if (render && render.size !== undefined) {
        width = render.size;
        height = render.size;
      }
    }

    ctx.fillRect(
      offsetX - width / 2,
      offsetY - height / 2,
      width,
      height
    );
  }
}

/**
 * Drawer for polygon shapes in HTML5 Canvas.
 */
export class CanvasPolygonDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const renderType = "Render" as Extract<keyof TRegistry, string>;
    const render = world.getComponent(entity, renderType) as RenderComponent | undefined;

    let vertices: Array<{ x: number; y: number }> | undefined;
    if (render) {
      const renderWithVertices = render as unknown as { vertices?: Array<{ x: number; y: number }> };
      if (renderWithVertices.vertices) {
        vertices = renderWithVertices.vertices;
      }
    }

    let offsetX = 0;
    let offsetY = 0;

    if (!vertices) {
      const colliderType = "Collider" as Extract<keyof TRegistry, string>;
      const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
      if (collider && collider.enabled && collider.shape.type === ShapeType.Polygon) {
        vertices = (collider.shape as ConvexPolygonShape).vertices;
        offsetX = collider.offsetX ?? 0;
        offsetY = collider.offsetY ?? 0;
      }
    }

    if (!vertices || vertices.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x + offsetX, vertices[0].y + offsetY);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x + offsetX, vertices[i].y + offsetY);
    }
    ctx.closePath();
    ctx.fill();
  }
}
