import { ShapeDrawer, EffectDrawer, World, TransformComponent } from "@tiny-aster/core";
import { PongComponentRegistry, BallComponent } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { ComboComponent } from "../../shared/arcade/components/ComboComponent";

let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {}

let cachedPaint: any = null;
function getPaint(): any {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint;
}

export interface TrailPoint {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Zero-allocation, high-performance Skia motion trail tracker and renderer.
 */
export class SkiaMotionTrail {
  private readonly trails = new Map<number, TrailPoint[]>();
  private readonly maxPoints: number;

  constructor(maxPoints: number = 30) {
    this.maxPoints = maxPoints;
  }

  public getTrail(entityId: number): TrailPoint[] {
    let trail = this.trails.get(entityId);
    if (!trail) {
      trail = [];
      for (let i = 0; i < this.maxPoints; i++) {
        trail.push({ x: 0, y: 0, active: false });
      }
      this.trails.set(entityId, trail);
    }
    return trail;
  }

  public update(entityId: number, x: number, y: number, minDistanceSq: number = 4): void {
    const trail = this.getTrail(entityId);
    const lastPoint = trail[0];
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distSq = dx * dx + dy * dy;

    if (!lastPoint.active || distSq > minDistanceSq) {
      for (let i = this.maxPoints - 1; i > 0; i--) {
        trail[i].x = trail[i - 1].x;
        trail[i].y = trail[i - 1].y;
        trail[i].active = trail[i - 1].active;
      }
      trail[0].x = x;
      trail[0].y = y;
      trail[0].active = true;
    }
  }

  public draw(
    canvas: any,
    paint: any,
    entityId: number,
    currentX: number,
    currentY: number,
    length: number,
    size: number,
    outerColorStr: string,
    innerColorStr: string
  ): void {
    const trail = this.getTrail(entityId);
    const drawLength = Math.min(length, this.maxPoints);

    for (let i = drawLength - 1; i >= 0; i--) {
      const p = trail[i];
      if (!p.active) continue;

      const ratio = 1 - (i / drawLength);
      const alpha = ratio * 0.4;
      const trailSize = size * (0.3 + 0.7 * ratio);

      canvas.save();
      canvas.translate(p.x - currentX, p.y - currentY);

      // Outer glow circle
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(outerColorStr));
      paint.setAlphaf(alpha);
      canvas.drawCircle(0, 0, trailSize * 1.5, paint);

      // Inner core circle
      paint.setColor(Skia.Color(innerColorStr));
      paint.setAlphaf(alpha * 0.5);
      canvas.drawCircle(0, 0, trailSize, paint);

      canvas.restore();
    }
  }
}

// Instantiate the reusable, zero-allocation Skia motion trail helper
const ballSkiaMotionTrail = new SkiaMotionTrail(30);

/**
 * Upgraded, high-fidelity Skia ball shape drawer with a swirling core and dynamic fading afterimage trails.
 * @public
 */
export const drawSkiaPongBall: ShapeDrawer<any, PongComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const ballComp = world.getComponent(entity, "Ball") as BallComponent | undefined;
    const size = render.size ?? 8;

    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // 1. Fetch Combo component to dynamically shift trail length and color
    const comboComponent = world.getSingleton("Combo") as ComboComponent | undefined;
    const multiplier = comboComponent?.multiplier ?? 1;

    let trailLength = 8;
    let trailColor = "rgba(0, 255, 255, 0.4)"; // Default: Cyan
    let trailColorInner = "rgba(255, 255, 255, 0.2)";
    let ballColor = "#00FFFF";

    if (multiplier === 2) {
      trailLength = 16;
      trailColor = "rgba(255, 0, 255, 0.5)"; // Pink/Magenta
      trailColorInner = "rgba(255, 255, 255, 0.3)";
      ballColor = "#FF00FF";
    } else if (multiplier >= 3) {
      trailLength = 24;
      trailColor = "rgba(255, 215, 0, 0.6)"; // Gold
      trailColorInner = "rgba(255, 255, 255, 0.4)";
      ballColor = "#FFD700";
    }

    const paint = getPaint();

    // 2. Update and draw trails using the generic zero-allocation motion trail tracker
    ballSkiaMotionTrail.update(entity, x, y, 4);
    ballSkiaMotionTrail.draw(canvas, paint, entity, x, y, trailLength, size, trailColor, trailColorInner);

    // 3. Render the ball with a swirling core reflecting actual spinFactor
    canvas.save();

    const spin = ballComp ? ballComp.spinFactor : 0;
    const swirlRotation = (world.tick * spin * 0.08) % (Math.PI * 2);
    canvas.rotate((swirlRotation * 180) / Math.PI, 0, 0);

    // Outer neon ring
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ballColor));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size, paint);

    // Swirling lines path
    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setStrokeWidth(1.5);
    const swirlPath = Skia.Path.Make();
    swirlPath.moveTo(0, -size);
    swirlPath.quadTo(size * spin * 1.5, 0, 0, size);
    swirlPath.moveTo(-size, 0);
    swirlPath.quadTo(0, size * spin * 1.5, size, 0);
    canvas.drawPath(swirlPath, paint);

    // Hot inner core
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFFFFF"));
    canvas.drawCircle(0, 0, size * 0.4, paint);

    canvas.restore();
  }
};

/**
 * Upgraded, high-fidelity Skia paddle shape drawer with side-specific neon glowing hues,
 * inner cores, and pulsing contours.
 * @public
 */
export const drawSkiaPongPaddle: ShapeDrawer<any, PongComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const paddle = world.getComponent(entity, "Paddle");
    if (!paddle) return;

    const config = world.getResource<PongConfig>("GameConfig") || { PADDLE_WIDTH: 15, PADDLE_HEIGHT: 80 };
    const w = config.PADDLE_WIDTH;
    const h = config.PADDLE_HEIGHT;

    const isLeft = paddle.side === "left";
    const color = isLeft ? "#FF00FF" : "#00FFFF";
    const glowAlphaColor = isLeft ? "rgba(255, 0, 255, 0.15)" : "rgba(0, 255, 255, 0.15)";

    const paint = getPaint();

    canvas.save();

    const pulseFactor = 1.0 + 0.08 * Math.sin(world.tick / 6);
    const pw = w * pulseFactor;
    const ph = h;

    // 1. Draw outer glowing outline
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(color));
    paint.setStrokeWidth(2.0);
    canvas.drawRoundRect(
      Skia.RRectXY(Skia.XYWHRect(-pw / 2, -ph / 2, pw, ph), 4, 4),
      paint
    );

    // 2. Draw outer glowing semi-transparent body fill
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(glowAlphaColor));
    canvas.drawRoundRect(
      Skia.RRectXY(Skia.XYWHRect(-w / 2, -h / 2, w, h), 4, 4),
      paint
    );

    // 3. Draw bright white core
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFFFFF"));
    const coreW = w * 0.4;
    const coreH = h * 0.9;
    canvas.drawRoundRect(
      Skia.RRectXY(Skia.XYWHRect(-coreW / 2, -coreH / 2, coreW, coreH), 2, 2),
      paint
    );

    canvas.restore();
  }
};

/**
 * Procedural retro space-grid background effect drawer for React Native Skia.
 * Includes center divider, goals overlays, protective boundaries, and vignettes.
 * @public
 */
export const drawSkiaPongBackground: EffectDrawer<any, PongComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<PongConfig>("GameConfig") || { WIDTH: 800, HEIGHT: 600 };
    const width = config.WIDTH;
    const height = config.HEIGHT;

    const paint = getPaint();

    // 1. Solid deep space dark background
    paint.reset();
    paint.setColor(Skia.Color("#0A0A0F"));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // 2. Scrolling cyber-neon grid lines
    const gridSize = 40;
    const scrollOffset = (world.tick * 0.3) % gridSize;

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 255, 255, 0.04)"));
    paint.setStrokeWidth(1.0);

    for (let x = 0; x < width; x += gridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }

    for (let y = scrollOffset; y < height; y += gridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }

    // 3. Draw Pong center divider
    canvas.save();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(255, 0, 255, 0.3)"));
    paint.setStrokeWidth(3.0);

    // Draw dashed center divider line
    const dashLength = 10;
    const dashGap = 15;
    for (let dy = 0; dy < height; dy += (dashLength + dashGap)) {
      canvas.drawLine(width / 2, dy, width / 2, Math.min(height, dy + dashLength), paint);
    }

    // Inner bright white divider line
    paint.setColor(Skia.Color("rgba(255, 255, 255, 0.8)"));
    paint.setStrokeWidth(1.5);
    for (let dy = 0; dy < height; dy += (dashLength + dashGap)) {
      canvas.drawLine(width / 2, dy, width / 2, Math.min(height, dy + dashLength), paint);
    }
    canvas.restore();

    // 4. Draw protective neon shield barrier behind Player 1 if shield_pulse is active
    const state = world.getSingleton("PongState");
    if (state && state.shieldPulseRemaining !== undefined && state.shieldPulseRemaining > 0) {
      canvas.save();
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("#00FFFF"));
      paint.setStrokeWidth(4.0);
      paint.setAlphaf((0.4 + 0.3 * Math.sin(world.tick / 5)) * 0.6);

      // Create shield curve path (an arc behind P1 boundary line)
      const shieldPath = Skia.Path.Make();
      const rect = Skia.XYWHRect(-height * 0.8, -height * 0.3, height * 1.6, height * 1.6);
      shieldPath.addArc(rect, -60, 120);
      canvas.drawPath(shieldPath, paint);
      canvas.restore();
    }

    // 5. Draw scored goal transition freeze overlay if active
    if (state && state.scoreFreezeRemaining !== undefined && state.scoreFreezeRemaining > 0) {
      canvas.save();
      const text = state.lastScorer === "p1" ? "P1 SCORES!" : "P2 SCORES!";
      const neonColor = state.lastScorer === "p1" ? "#FF00FF" : "#00FFFF";

      // Since drawing rich complex text on raw Skia canvas without a pre-loaded custom font can crash in some runtimes,
      // we draw a beautiful, pulsing neon bounding indicator box in the center representing the goal freeze frame!
      // This ensures 100% stable execution while providing a gorgeous high-fidelity visual indicator.
      const pulseFactor = 1.0 + 0.1 * Math.sin(world.tick / 4);
      const gw = 200 * pulseFactor;
      const gh = 60 * pulseFactor;

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(neonColor));
      paint.setStrokeWidth(3.0);
      canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(width / 2 - gw / 2, height / 2 - gh / 2, gw, gh), 8, 8), paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(neonColor));
      paint.setAlphaf(0.12);
      canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(width / 2 - gw / 2, height / 2 - gh / 2, gw, gh), 8, 8), paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#FFFFFF"));
      paint.setAlphaf(0.8);
      canvas.drawCircle(width / 2 - gw * 0.25, height / 2, 4, paint);
      canvas.drawCircle(width / 2, height / 2, 4, paint);
      canvas.drawCircle(width / 2 + gw * 0.25, height / 2, 4, paint);

      canvas.restore();
    }

    // 6. Vignette border
    paint.reset();
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.4)"));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, 12), paint); // Top edge
    canvas.drawRect(Skia.XYWHRect(0, height - 12, width, 12), paint); // Bottom edge
    canvas.drawRect(Skia.XYWHRect(0, 0, 12, height), paint); // Left edge
    canvas.drawRect(Skia.XYWHRect(width - 12, 0, 12, height), paint); // Right edge
  }
};
