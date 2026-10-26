import { ShapeDrawer, EffectDrawer, RenderContext, World, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import type { SkCanvas, SkPaint, SkShader } from "@shopify/react-native-skia";
import { FlappyBirdComponentRegistry } from "../../types/FlappyBirdTypes";
import {
  FLAPPY_PARTICLE_POOL,
  updateVisualParticles,
  resolveFlappyParticleData,
} from "../../rendering/FlappyBirdParticles";
import {
  resolveFlappyBirdDrawContext,
  resolveFlappyPipeDrawContext,
  resolveGlideEnergyState,
  resolveFlappyBackgroundSetup,
} from "../../rendering/FlappyBirdRenderUtils";
import { Skia, getPaint } from "../../../shared/rendering/SkiaContext";
import { colors } from "../../../../theme/colors";
import { hexToRgba } from "../../../shared/rendering/CosmicPalette";

const skiaShaderCache = new Map<string, SkShader>();

function getCachedSkiaShader(key: string, factory: () => SkShader | null): SkShader | null {
  let shader = skiaShaderCache.get(key);
  if (!shader) {
    if (skiaShaderCache.size > 40) {
      skiaShaderCache.clear();
    }
    const created = factory();
    if (created) {
      shader = created;
      skiaShaderCache.set(key, shader);
    }
  }
  return shader || null;
}

function drawSkiaGlideEnergyBar(
  skCanvas: SkCanvas,
  paint: SkPaint,
  world: World<FlappyBirdComponentRegistry>,
  width: number,
  height: number
): void {
  const glideState = resolveGlideEnergyState(world, width, height);
  if (!glideState) return;

  const { isOverheated, ratio, barW, barH, bx, by, fillColor } = glideState;
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(hexToRgba(colors.surface, 0.75)));
  skCanvas.drawRect(Skia.XYWHRect(bx, by, barW, barH), paint);

  paint.setColor(Skia.Color(fillColor));
  skCanvas.drawRect(Skia.XYWHRect(bx, by, barW * ratio, barH), paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(isOverheated ? colors.red : colors.slate));
  paint.setStrokeWidth(1.0);
  skCanvas.drawRect(Skia.XYWHRect(bx, by, barW, barH), paint);
}

function drawSkiaVisualParticles(canvas: SkCanvas, paint: SkPaint): void {
  const particles = FLAPPY_PARTICLE_POOL.getActiveParticles();
  for (let i = 0; i < particles.length; i++) {
    const data = resolveFlappyParticleData(particles[i]);
    if (!data) continue;

    const { type, x, y, size, color, skColor, angle, ratio } = data;

    canvas.save();
    canvas.translate(x, y);
    if (angle !== undefined && angle !== 0) {
      canvas.rotate((angle * 180) / Math.PI, 0, 0);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setAlphaf(ratio);

    if (type === "star") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(skColor || Skia.Color(color));
      canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);
    }

    canvas.restore();
  }
}

function drawSkiaPaperAirplane(skCanvas: SkCanvas, paint: SkPaint, size: number, theme?: Theme) {
  const primaryColor = theme?.colorMap?.primary || "#FFFFFF";
  const accentColor = theme?.colorMap?.accent || "#475569";

  // Left wing top fold
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(primaryColor));

  const p1 = Skia.Path.Make();
  p1.moveTo(size * 1.3, 0);
  p1.lineTo(-size * 0.9, -size * 0.8);
  p1.lineTo(-size * 0.4, 0);
  p1.close();
  skCanvas.drawPath(p1, paint);

  // Right wing under shadow
  paint.setColor(Skia.Color("#E2E8F0"));
  const p2 = Skia.Path.Make();
  p2.moveTo(size * 1.3, 0);
  p2.lineTo(-size * 0.4, 0);
  p2.lineTo(-size * 0.9, size * 0.8);
  p2.close();
  skCanvas.drawPath(p2, paint);

  // Center crease shadow line
  paint.setColor(Skia.Color("#94A3B8"));
  const p3 = Skia.Path.Make();
  p3.moveTo(size * 1.3, 0);
  p3.lineTo(-size * 0.4, 0);
  p3.lineTo(-size * 0.6, -size * 0.15);
  p3.close();
  skCanvas.drawPath(p3, paint);

  // Outline
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(accentColor));
  paint.setStrokeWidth(1.0);
  const pOutline = Skia.Path.Make();
  pOutline.moveTo(size * 1.3, 0);
  pOutline.lineTo(-size * 0.9, -size * 0.8);
  pOutline.lineTo(-size * 0.4, 0);
  pOutline.lineTo(-size * 0.9, size * 0.8);
  pOutline.close();
  skCanvas.drawPath(pOutline, paint);

  skCanvas.drawLine(size * 1.3, 0, -size * 0.4, 0, paint);
}

export const drawSkiaOfficePaperBird: ShapeDrawer<unknown, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas as SkCanvas;
    const drawCtx = resolveFlappyBirdDrawContext(world, entity, FLAPPY_PARTICLE_POOL);
    if (!drawCtx) return;

    const {
      size,
      isAlive,
      angleDeg,
      scaleX,
      scaleY,
    } = drawCtx;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const paint = getPaint();

    skCanvas.save();
    skCanvas.rotate(angleDeg, 0, 0);
    skCanvas.scale(scaleX, scaleY);

    if (isAlive) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("rgba(255, 255, 255, 0.4)"));
      paint.setStrokeWidth(1.2);
      skCanvas.drawLine(-size * 0.5, -size * 0.2, -size * 1.6, -size * 0.2, paint);
      skCanvas.drawLine(-size * 0.5, size * 0.2, -size * 1.6, size * 0.2, paint);
    }

    drawSkiaPaperAirplane(skCanvas, paint, size, theme);
    skCanvas.restore();
  }
};

export const drawSkiaOfficePaperPipe: ShapeDrawer<unknown, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas as SkCanvas;
    const pipeCtx = resolveFlappyPipeDrawContext(world, entity);
    if (!pipeCtx) return;

    const { width, halfWidth, capHeight, capWidth, capHalfWidth, pipeY, pipeHeight, capYOffset } = pipeCtx;
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const pipeToken = theme?.colorMap?.pipe || "#475569";
    const paint = getPaint();

    const pillarShader = getCachedSkiaShader(`office_skia_pillar_${halfWidth}_${pipeToken}`, () =>
      Skia.Shader.MakeLinearGradient(
        Skia.Point(-halfWidth, 0),
        Skia.Point(halfWidth, 0),
        [Skia.Color("#334155"), Skia.Color(pipeToken), Skia.Color("#1E293B")],
        [0, 0.5, 1.0],
        Skia.TileMode.Clamp
      )
    );

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (pillarShader) paint.setShader(pillarShader);
    skCanvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#64748B"));
    paint.setStrokeWidth(1.2);
    skCanvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    const collarShader = getCachedSkiaShader(`office_skia_collar_${capHalfWidth}`, () =>
      Skia.Shader.MakeLinearGradient(
        Skia.Point(-capHalfWidth, 0),
        Skia.Point(capHalfWidth, 0),
        [Skia.Color("#64748B"), Skia.Color("#CBD5E1"), Skia.Color("#475569")],
        [0, 0.5, 1.0],
        Skia.TileMode.Clamp
      )
    );

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (collarShader) paint.setShader(collarShader);
    skCanvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#94A3B8"));
    paint.setStrokeWidth(1.5);
    skCanvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#F8FAFC"));
    skCanvas.drawRect(Skia.XYWHRect(-capHalfWidth + 12, capYOffset + capHeight * 0.4, capWidth - 24, 3), paint);
  }
};

export const drawSkiaOfficePaperGround: ShapeDrawer<unknown, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas as SkCanvas;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const { size = 400 } = render;
    const width = size;
    const height = 40;
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const groundToken = theme?.colorMap?.ground || "#B45309";
    const secondaryToken = theme?.colorMap?.secondary || "#D97706";
    const paint = getPaint();

    const deskShader = getCachedSkiaShader(`desk_skia_${height}_${groundToken}`, () =>
      Skia.Shader.MakeLinearGradient(
        Skia.Point(0, -height / 2),
        Skia.Point(0, height / 2),
        [Skia.Color(secondaryToken), Skia.Color(groundToken), Skia.Color("#78350F")],
        [0, 0.3, 1.0],
        Skia.TileMode.Clamp
      )
    );

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (deskShader) paint.setShader(deskShader);
    skCanvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, height), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#F59E0B"));
    skCanvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, 3), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#451A03"));
    paint.setStrokeWidth(1.0);
    skCanvas.drawLine(-width / 2, -height / 2, width / 2, -height / 2, paint);
  }
};

export const scrollingSkiaOfficePaperBackgroundEffect: EffectDrawer<unknown, FlappyBirdComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const bgSetup = resolveFlappyBackgroundSetup(world);
    if (!bgSetup) return;

    const { width, height } = bgSetup;
    const skCanvas = canvas as SkCanvas;
    const paint = getPaint();

    updateVisualParticles();

    const bgShader = getCachedSkiaShader(`office_skia_bg_${width}_${height}`, () =>
      Skia.Shader.MakeLinearGradient(
        Skia.Point(0, 0),
        Skia.Point(0, height),
        [Skia.Color("#0F172A"), Skia.Color("#1E293B"), Skia.Color("#090D16")],
        [0, 0.6, 1.0],
        Skia.TileMode.Clamp
      )
    );

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (bgShader) paint.setShader(bgShader);
    skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    skCanvas.save();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(148, 163, 184, 0.08)"));
    paint.setStrokeWidth(1.0);

    const gridOffset = (world.tick * 0.5) % 20;

    for (let gx = -20 + gridOffset; gx < width + 20; gx += 20) {
      skCanvas.drawLine(gx, 0, gx, height, paint);
    }
    for (let gy = 0; gy < height; gy += 20) {
      skCanvas.drawLine(0, gy, width, gy, paint);
    }
    skCanvas.restore();

    drawSkiaVisualParticles(skCanvas, paint);

    drawSkiaGlideEnergyBar(skCanvas, paint, world, width, height);
  }
};
