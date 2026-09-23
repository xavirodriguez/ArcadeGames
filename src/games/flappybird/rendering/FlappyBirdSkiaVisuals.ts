import { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { SkCanvas, SkPaint, SkPath, SkShader } from "@shopify/react-native-skia";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { computeFlappyThrusterFlame } from "../../shared/rendering/ProceduralShapeUtils";
import {
  StarfieldStar,
  generateStarfield
} from "../../shared/rendering/geometry";
import {
  calculateWarpFactor,
  calculateMegastructureData,
  calculateGroundHazardFlicker,
  BACKGROUND_NEBULAE,
  MegastructureData
} from "./FlappyBirdBackgroundData";
import {
  FLAPPY_PARTICLE_POOL,
  spawnVisualParticle,
  updateVisualParticles,
  resolveFlappyParticleData,
} from "./FlappyBirdParticles";
import {
  resolveFlappyBirdDrawContext,
  resolveFlappyPipeDrawContext,
  maybeSpawnBackgroundDebris,
  resolveGlideEnergyState,
  resolveSectorEventInfo,
  resolveBackgroundWarpState
} from "./FlappyBirdRenderUtils";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

export { FLAPPY_PARTICLE_POOL as FLAPPY_SKIA_PARTICLE_POOL, spawnVisualParticle };

// Zero-allocation shader cache for React Native Skia bridge
const skiaShaderCache = new Map<string, SkShader>();
let staticStars: StarfieldStar[] | null = null;

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

let diamondSparkPath: SkPath | null = null;
function getDiamondSparkPath(): SkPath | null {
  if (!diamondSparkPath && Skia) {
    const p = Skia.Path.Make();
    if (p) {
      p.moveTo(2.5, 0);
      p.lineTo(0, -0.6);
      p.lineTo(-2.5, 0);
      p.lineTo(0, 0.6);
      p.close();
      diamondSparkPath = p;
    }
  }
  return diamondSparkPath;
}

let shardPolyPath: SkPath | null = null;
function getShardPolyPath(): SkPath | null {
  if (!shardPolyPath && Skia) {
    const p = Skia.Path.Make();
    if (p) {
      p.moveTo(1.2, -0.8);
      p.lineTo(0.4, 1.1);
      p.lineTo(-1.1, 0.3);
      p.lineTo(-0.6, -1.0);
      p.close();
      shardPolyPath = p;
    }
  }
  return shardPolyPath;
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

    if (type === "spark") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(skColor || Skia.Color(color));
      const sparkPath = getDiamondSparkPath();
      if (sparkPath) {
        canvas.save();
        canvas.scale(size, size);
        canvas.drawPath(sparkPath, paint);
        canvas.restore();
      }
    } else if (type === "shard") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#5A6173"));
      const shardPath = getShardPolyPath();
      if (shardPath) {
        canvas.save();
        canvas.scale(size, size);
        canvas.drawPath(shardPath, paint);

        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color("#FF3300"));
        paint.setStrokeWidth(0.6);
        canvas.drawPath(shardPath, paint);
        canvas.restore();
      }
    } else if (type === "star") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(skColor || Skia.Color(color));
      canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);
    }

    canvas.restore();
  }
}

let cachedArrowheadPath: SkPath | null = null;
function getArrowheadPath(size: number): SkPath | null {
  if (!cachedArrowheadPath && Skia) {
    const p = Skia.Path.Make();
    if (p) {
      p.moveTo(size * 1.2, 0);
      p.lineTo(-size * 0.7, -size * 0.85);
      p.lineTo(-size * 0.4, -size * 0.35);
      p.lineTo(-size * 0.55, 0);
      p.lineTo(-size * 0.4, size * 0.35);
      p.lineTo(-size * 0.7, size * 0.85);
      p.close();
      cachedArrowheadPath = p;
    }
  }
  return cachedArrowheadPath;
}

export const drawSkiaFlappyBird: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas as unknown as SkCanvas;
    const drawCtx = resolveFlappyBirdDrawContext(world, entity, FLAPPY_PARTICLE_POOL);
    if (!drawCtx) return;

    const {
      render,
      size,
      vy,
      isAlive,
      globalOpacity,
      angleDeg,
      scaleX,
      scaleY,
      speed,
    } = drawCtx;

    const paint = getPaint();

    skCanvas.save();

    skCanvas.rotate(angleDeg, 0, 0);
    skCanvas.scale(scaleX, scaleY);

    if (isAlive) {
      const warpFactor = calculateWarpFactor(world);
      const trailConfig = world.getResource<{ enabled?: boolean; color?: string; width?: number; lengthMultiplier?: number }>("CosmeticTrailConfig");
      const trailColor = trailConfig?.color || "rgba(0, 243, 255, 0.35)";
      const trailWidth = (trailConfig?.width || 2.0) * warpFactor;
      const lengthMult = (trailConfig?.lengthMultiplier || 1.0) * warpFactor;

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(trailColor));
      paint.setStrokeWidth(trailWidth);
      skCanvas.drawLine(-size * 0.55, 0, -size * (1.8 * lengthMult) - Math.min(speed * 0.1 * lengthMult, 25), 0, paint);
    }

    if (isAlive) {
      const { flameLength, flameWidth } = computeFlappyThrusterFlame(size, vy, world.tick);

      const flameShader = getCachedSkiaShader(`flame_${size}`, () =>
        Skia.Shader.MakeLinearGradient(
          Skia.Point(-size * 0.55, 0),
          Skia.Point(-size * 2.2, 0),
          [Skia.Color("#FFFFFF"), Skia.Color("#FFC000"), Skia.Color("#FF3300")],
          [0, 0.35, 1.0],
          Skia.TileMode.Clamp
        )
      );
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      if (flameShader) paint.setShader(flameShader);
      paint.setAlphaf(globalOpacity);

      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.55, -flameWidth * 0.5);
      flamePath.lineTo(-size * 0.55 - flameLength, 0);
      flamePath.lineTo(-size * 0.55, flameWidth * 0.5);
      flamePath.close();
      skCanvas.drawPath(flamePath, paint);
    }

    const hullShader = getCachedSkiaShader(`hull_${size}_${isAlive}`, () => {
      let hullColors = [Skia.Color("#5A6173"), Skia.Color("#8B93A5"), Skia.Color("#D3D9E2")];
      if (!isAlive) {
        hullColors = [Skia.Color("#3A3F4B"), Skia.Color("#5A6173"), Skia.Color("#696969")];
      }
      return Skia.Shader.MakeLinearGradient(
        Skia.Point(-size * 0.7, 0),
        Skia.Point(size * 1.2, 0),
        hullColors,
        [0, 0.5, 1.0],
        Skia.TileMode.Clamp
      );
    });

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    if (hullShader) paint.setShader(hullShader);
    paint.setAlphaf(globalOpacity);

    const arrowheadPath = getArrowheadPath(size);
    if (arrowheadPath) {
      skCanvas.drawPath(arrowheadPath, paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("#1A1D24"));
      paint.setStrokeWidth(1.2);
      paint.setAlphaf(globalOpacity);
      skCanvas.drawPath(arrowheadPath, paint);
    }

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#00F3FF"));
    paint.setAlphaf(globalOpacity);
    skCanvas.drawOval(Skia.XYWHRect(-size * 0.2, -size * 0.23, size * 0.7, size * 0.36), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.7)"));
    paint.setStrokeWidth(0.8);
    skCanvas.drawOval(Skia.XYWHRect(-size * 0.2, -size * 0.23, size * 0.7, size * 0.36), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFFFFF"));
    skCanvas.drawCircle(size * 0.25, -size * 0.09, size * 0.06, paint);

    if (render.dangerPulseIntensity && render.dangerPulseIntensity > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(world.tick * 0.4);
      const alpha = render.dangerPulseIntensity * pulse;
      const dangerPath = getArrowheadPath(size + 2);
      if (dangerPath) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color("#FF0000"));
        paint.setStrokeWidth(2.2);
        paint.setAlphaf(alpha);
        skCanvas.drawPath(dangerPath, paint);
      }
    }

    skCanvas.restore();
  }
};

export const drawSkiaFlappyPipe: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas as unknown as SkCanvas;
    const pipeCtx = resolveFlappyPipeDrawContext(world, entity);
    if (!pipeCtx) return;

    const {
      pos,
      pipe,
      width,
      halfWidth,
      variant,
      geometry,
      capHeight,
      capWidth,
      capHalfWidth,
      beaconPulse,
    } = pipeCtx;

    const { isTopPipe, pipeY, pipeHeight, capYOffset, beaconY } = geometry;

    const paint = getPaint();

    const pillarShader = getCachedSkiaShader(`pillar_${halfWidth}_${variant}`, () => {
      let colors = [
        Skia.Color("#1A1A22"),
        Skia.Color("#2A2A35"),
        Skia.Color("#3F3F50"),
        Skia.Color("#2A2A35"),
        Skia.Color("#121218")
      ];
      if (variant === "damaged") {
        colors = [
          Skia.Color("#191B22"),
          Skia.Color("#2C313C"),
          Skia.Color("#424856"),
          Skia.Color("#2C313C"),
          Skia.Color("#13151A")
        ];
      } else if (variant === "rusted") {
        colors = [
          Skia.Color("#2A1810"),
          Skia.Color("#4A2B1D"),
          Skia.Color("#6B3E2A"),
          Skia.Color("#4A2B1D"),
          Skia.Color("#1F110B")
        ];
      }
      return Skia.Shader.MakeLinearGradient(
        Skia.Point(-halfWidth, 0),
        Skia.Point(halfWidth, 0),
        colors,
        [0, 0.25, 0.5, 0.75, 1.0],
        Skia.TileMode.Clamp
      );
    });
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (pillarShader) paint.setShader(pillarShader);
    skCanvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#121218"));
    paint.setStrokeWidth(1.5);
    skCanvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    if (variant === "damaged") {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("#0D0E12"));
      paint.setStrokeWidth(1.2);
      const crackPath = Skia.Path.Make();
      crackPath.moveTo(-halfWidth + width * 0.2, pipeY + pipeHeight * 0.2);
      crackPath.lineTo(-halfWidth + width * 0.4, pipeY + pipeHeight * 0.28);
      crackPath.lineTo(-halfWidth + width * 0.3, pipeY + pipeHeight * 0.38);
      skCanvas.drawPath(crackPath, paint);
    } else if (variant === "rusted") {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(180, 80, 30, 0.3)"));
      skCanvas.drawRect(Skia.XYWHRect(-halfWidth + 4, pipeY + pipeHeight * 0.1, width * 0.4, pipeHeight * 0.3), paint);
    }

    const collarShader = getCachedSkiaShader(`collar_${capHalfWidth}_${variant}`, () => {
      let colors = [
        Skia.Color("#22222D"),
        Skia.Color("#3A3A4A"),
        Skia.Color("#525266"),
        Skia.Color("#3A3A4A"),
        Skia.Color("#181822")
      ];
      if (variant === "damaged") {
        colors = [
          Skia.Color("#252833"),
          Skia.Color("#3E4454"),
          Skia.Color("#5A6278"),
          Skia.Color("#3E4454"),
          Skia.Color("#1B1D26")
        ];
      } else if (variant === "rusted") {
        colors = [
          Skia.Color("#382015"),
          Skia.Color("#543222"),
          Skia.Color("#734530"),
          Skia.Color("#543222"),
          Skia.Color("#28170F")
        ];
      }
      return Skia.Shader.MakeLinearGradient(
        Skia.Point(-capHalfWidth, 0),
        Skia.Point(capHalfWidth, 0),
        colors,
        [0, 0.3, 0.55, 0.8, 1.0],
        Skia.TileMode.Clamp
      );
    });
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (collarShader) paint.setShader(collarShader);
    skCanvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(pipe.isNarrowGap ? "#FFD700" : "#121218"));
    paint.setStrokeWidth(pipe.isNarrowGap ? 2.0 : 1.5);
    skCanvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    const beaconHaloShader = getCachedSkiaShader(`beacon_halo_${beaconPulse.toFixed(2)}`, () =>
      Skia.Shader.MakeTwoPointConicalGradient(
        Skia.Point(0, beaconY),
        4,
        Skia.Point(0, beaconY),
        45,
        [Skia.Color("rgba(255,0,0,0.25)"), Skia.Color("rgba(255,0,0,0.08)"), Skia.Color("rgba(255,0,0,0)")],
        [0, 0.5, 1.0],
        Skia.TileMode.Clamp
      )
    );

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (beaconHaloShader) paint.setShader(beaconHaloShader);
    skCanvas.drawCircle(0, beaconY, 45, paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconPulse);
    skCanvas.drawCircle(-capHalfWidth + 8, beaconY, 3.5, paint);
    skCanvas.drawCircle(capHalfWidth - 8, beaconY, 3.5, paint);

    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setAlphaf(beaconPulse);
    skCanvas.drawCircle(-capHalfWidth + 8, beaconY, 1.2, paint);
    skCanvas.drawCircle(capHalfWidth - 8, beaconY, 1.2, paint);

    if (pipe.movementType === "laser_gate" && isTopPipe) {
      const laserActive = pipe.laserActive ?? true;
      const laserPulse = 0.5 + 0.5 * Math.sin(world.tick * 0.3);
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      if (laserActive) {
        paint.setColor(Skia.Color("#00F3FF"));
        paint.setAlphaf(0.7 + 0.3 * laserPulse);
        paint.setStrokeWidth(3.0);
        skCanvas.drawLine(0, capYOffset + capHeight, 0, capYOffset + capHeight + pipe.gapSize, paint);

        if (world.tick % 4 === 0) {
          const sparkY = capYOffset + capHeight + world.renderRandom.next() * pipe.gapSize;
          const sparkAngle = world.renderRandom.next() * Math.PI * 2;
          const sparkSpeed = world.renderRandom.nextRange(20, 60);
          spawnVisualParticle("spark", pos.x, sparkY, Math.cos(sparkAngle) * sparkSpeed, Math.sin(sparkAngle) * sparkSpeed, 0.25, 2.5, "#00F3FF");
        }
      } else {
        paint.setColor(Skia.Color("#FF0000"));
        paint.setAlphaf(0.25);
        paint.setStrokeWidth(1.0);
        skCanvas.drawLine(0, capYOffset + capHeight, 0, capYOffset + capHeight + pipe.gapSize, paint);
      }
    }
  }
};

export const drawSkiaFlappyGround: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skCanvas = canvas as unknown as SkCanvas;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const { size = 400 } = render;
    const width = size;
    const height = 40;

    const paint = getPaint();

    const baseShader = getCachedSkiaShader(`base_${height}`, () =>
      Skia.Shader.MakeLinearGradient(
        Skia.Point(0, -height / 2),
        Skia.Point(0, height / 2),
        [Skia.Color("#22222C"), Skia.Color("#0D0D12")],
        [0, 1.0],
        Skia.TileMode.Clamp
      )
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    if (baseShader) paint.setShader(baseShader);
    skCanvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, height), paint);

    const hazardFlicker = calculateGroundHazardFlicker(world.tick);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFCC00"));
    paint.setAlphaf(hazardFlicker);
    skCanvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, 8), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#111116"));
    paint.setAlphaf(hazardFlicker);
    paint.setStrokeWidth(4);
    const stripeOffset = (world.tick * 3) % 24;

    for (let sx = -width / 2 - 24; sx < width / 2 + 24; sx += 20) {
      skCanvas.drawLine(sx + stripeOffset, -height / 2, sx + stripeOffset - 10, -height / 2 + 8, paint);
    }

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#5A6173"));
    paint.setStrokeWidth(1.0);
    skCanvas.drawLine(-width / 2, -height / 2, width / 2, -height / 2, paint);
  }
};

function drawSkiaMegastructure(canvas: SkCanvas, paint: SkPaint, data: MegastructureData): void {
  if (!Skia) return;
  const { megaIndex, megaX, megaY, beaconAlpha, structureOpacity } = data;
  canvas.save();

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("rgba(15, 18, 28, 0.65)"));
  paint.setAlphaf(structureOpacity * 0.65);

  if (megaIndex === 0) {
    canvas.drawCircle(megaX, megaY, 36, paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 85, megaY - 4, 170, 8), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 4, megaY - 85, 8, 170), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 80, megaY - 25, 6, 50), paint);
    canvas.drawRect(Skia.XYWHRect(megaX + 74, megaY - 25, 6, 50), paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX, megaY - 85, 2.5, paint);
  } else if (megaIndex === 1) {
    const path = Skia.Path.Make();
    path.moveTo(megaX - 60, megaY - 30);
    path.lineTo(megaX + 70, megaY - 10);
    path.lineTo(megaX + 40, megaY + 35);
    path.lineTo(megaX - 50, megaY + 20);
    path.close();
    canvas.drawPath(path, paint);

    canvas.drawRect(Skia.XYWHRect(megaX - 90, megaY - 45, 12, 90), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 90, megaY - 3, 100, 6), paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX + 70, megaY - 10, 2.5, paint);
  } else if (megaIndex === 2) {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(14);
    const ringPath = Skia.Path.Make();
    ringPath.addArc(
      Skia.XYWHRect(megaX - 55, megaY - 55, 110, 110),
      -126,
      216
    );
    canvas.drawPath(ringPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(megaX - 10, megaY - 60, 20, 10), paint);
    canvas.drawRect(Skia.XYWHRect(megaX + 48, megaY - 10, 10, 20), paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX - 10, megaY - 60, 2.5, paint);
  } else if (megaIndex === 3) {
    canvas.drawRect(Skia.XYWHRect(megaX - 6, megaY - 90, 12, 180), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 25, megaY - 40, 50, 6), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 35, megaY + 10, 70, 8), paint);

    const dishPath = Skia.Path.Make();
    dishPath.addArc(
      Skia.XYWHRect(megaX - 22, megaY - 92, 44, 44),
      36,
      108
    );
    canvas.drawPath(dishPath, paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX, megaY - 90, 2.5, paint);
  } else if (megaIndex === 4) {
    canvas.drawRect(Skia.XYWHRect(megaX - 80, megaY - 10, 160, 8), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 70, megaY - 50, 30, 40), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 20, megaY - 50, 30, 40), paint);
    canvas.drawRect(Skia.XYWHRect(megaX + 30, megaY - 50, 30, 40), paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX + 75, megaY - 10, 2.5, paint);
  } else if (megaIndex === 5) {
    canvas.drawRect(Skia.XYWHRect(megaX - 50, megaY - 40, 100, 80), paint);
    canvas.drawRect(Skia.XYWHRect(megaX - 80, megaY - 15, 30, 30), paint);
    canvas.drawRect(Skia.XYWHRect(megaX + 50, megaY - 25, 40, 50), paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX - 80, megaY - 15, 2.5, paint);
  } else if (megaIndex === 6) {
    canvas.drawRect(Skia.XYWHRect(megaX - 45, megaY - 80, 10, 160), paint);
    canvas.drawRect(Skia.XYWHRect(megaX + 35, megaY - 80, 10, 160), paint);
    canvas.drawCircle(megaX, megaY, 20, paint);

    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX - 40, megaY - 80, 2.5, paint);
    canvas.drawCircle(megaX + 40, megaY - 80, 2.5, paint);
  } else {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(10);
    const ringPath1 = Skia.Path.Make();
    ringPath1.addArc(Skia.XYWHRect(megaX - 65, megaY - 65, 130, 130), 0, 216);
    canvas.drawPath(ringPath1, paint);

    paint.setStrokeWidth(6);
    const ringPath2 = Skia.Path.Make();
    ringPath2.addArc(Skia.XYWHRect(megaX - 40, megaY - 40, 80, 80), 90, 234);
    canvas.drawPath(ringPath2, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconAlpha * structureOpacity);
    canvas.drawCircle(megaX + 65, megaY, 2.5, paint);
  }

  canvas.restore();
}

export const scrollingSkiaBackgroundEffect: EffectDrawer<RenderContext, FlappyBirdComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const skCanvas = canvas as unknown as SkCanvas;
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };

    const paint = getPaint();

    updateVisualParticles();

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#050510"));
    skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    for (let n = 0; n < BACKGROUND_NEBULAE.length; n++) {
      const neb = BACKGROUND_NEBULAE[n];
      const nx = width * neb.xRatio + Math.sin(world.tick * 0.01 + n) * 15;
      const ny = height * neb.yRatio + Math.cos(world.tick * 0.008 + n * 2) * 10;
      const nebShader = getCachedSkiaShader(`neb_${n}_${width}_${height}`, () =>
        Skia.Shader.MakeTwoPointConicalGradient(
          Skia.Point(nx, ny),
          10,
          Skia.Point(nx, ny),
          neb.radius,
          [Skia.Color(neb.colorHex), Skia.Color(neb.colorHex), Skia.Color("#050510")],
          [0, 0.6, 1.0],
          Skia.TileMode.Clamp
        )
      );
      if (nebShader) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setShader(nebShader);
        paint.setAlphaf(0.35);
        skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
      }
    }

    maybeSpawnBackgroundDebris(world, width, height, spawnVisualParticle);

    const warpState = resolveBackgroundWarpState(world, width, height);
    const { warpFactor, showWarpLines, intensity, cx, cy, lineCount, maxR } = warpState;

    if (!staticStars) {
      staticStars = generateStarfield(width, height);
    }

    const tick = world.tick;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);

    for (let i = 0; i < staticStars.length; i++) {
      const star = staticStars[i];
      let speed = star.layer === 2 ? 0.08 : star.layer === 0 ? 0.2 : 0.8 * warpFactor;
      let sx = (star.x - tick * speed) % width;
      if (sx < 0) sx += width;

      paint.setAlphaf(star.alpha);
      if (star.layer === 2) {
        paint.setColor(Skia.Color("#5A6173"));
        skCanvas.drawRect(Skia.XYWHRect(sx, star.y, star.size, star.size), paint);
      } else if (star.layer === 0) {
        paint.setColor(Skia.Color("#FFFFFF"));
        skCanvas.drawRect(Skia.XYWHRect(sx, star.y, star.size, star.size), paint);
      } else {
        paint.setColor(Skia.Color("#E0E5FF"));
        const pLen = warpFactor > 1.2 ? Math.min(star.size * 3 * warpFactor, 10) : star.size;
        skCanvas.drawRect(Skia.XYWHRect(sx, star.y, pLen, star.size), paint);
      }
    }

    if (showWarpLines) {
      skCanvas.save();
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("#00F3FF"));
      paint.setAlphaf(0.15 * intensity);
      paint.setStrokeWidth(1.2);

      for (let l = 0; l < lineCount; l++) {
        const angle = (l / lineCount) * Math.PI * 2 + (tick * 0.02);
        const innerR = 40 + (l * 17 + tick * 8) % (maxR * 0.5);
        const outerR = innerR + 40 * warpFactor;
        skCanvas.drawLine(
          cx + Math.cos(angle) * innerR,
          cy + Math.sin(angle) * innerR,
          cx + Math.cos(angle) * outerR,
          cy + Math.sin(angle) * outerR,
          paint
        );
      }
      skCanvas.restore();
    }

    const megaData = calculateMegastructureData(tick, width, height);
    if (megaData.visible) {
      drawSkiaMegastructure(skCanvas, paint, megaData);
    }

    drawSkiaVisualParticles(skCanvas, paint);

    const glideState = resolveGlideEnergyState(world, width, height);
    if (glideState) {
      const { isOverheated, ratio, barW, barH, bx, by, fillColor } = glideState;
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(10, 15, 25, 0.75)"));
      skCanvas.drawRect(Skia.XYWHRect(bx, by, barW, barH), paint);

      paint.setColor(Skia.Color(fillColor));
      skCanvas.drawRect(Skia.XYWHRect(bx, by, barW * ratio, barH), paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(isOverheated ? "#FF0000" : "#5A6173"));
      paint.setStrokeWidth(1.0);
      skCanvas.drawRect(Skia.XYWHRect(bx, by, barW, barH), paint);
    }

    const sectorInfo = resolveSectorEventInfo(gameState.currentSectorEvent ?? "none");
    if (sectorInfo) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(0, 243, 255, 0.15)"));
      skCanvas.drawRect(Skia.XYWHRect(0, 10, width, 22), paint);
    }

    paint.reset();
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.06)"));
    for (let ly = 0; ly < height; ly += 3) {
      skCanvas.drawRect(Skia.XYWHRect(0, ly, width, 1), paint);
    }

    const vignShader = getCachedSkiaShader(`vign_${width}_${height}`, () =>
      Skia.Shader.MakeTwoPointConicalGradient(
        Skia.Point(width / 2, height / 2),
        width * 0.4,
        Skia.Point(width / 2, height / 2),
        width * 0.8,
        [Skia.Color("rgba(0,0,0,0)"), Skia.Color("rgba(0,0,0,0.45)")],
        [0, 1.0],
        Skia.TileMode.Clamp
      )
    );
    if (vignShader) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setShader(vignShader);
      skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
    }
  },
};
