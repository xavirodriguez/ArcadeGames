import { World, EffectDrawer, ShapeDrawer, ComponentRegistry, CoreComponentRegistry, RenderComponent, TTLComponent, Renderer, RendererUtils, RenderContext, EventRegistry, BlueprintRegistryMap, Entity, RandomService } from "@tiny-aster/core";
import type { SkColor } from "@shopify/react-native-skia";
import { Skia } from "./SkiaContext";
import { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor } from "./CosmicPalette";
import { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow } from "./GlowSystem";
import { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate } from "./ParallaxSystem";
import { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState } from "./ExplosionSystem";
import { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme } from "./CelestialBodiesSystem";
import { MotionTrailParams, computeTrailParameters, getThrusterFlameColors, CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint } from "./MotionTrailSystem";
import { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme } from "./LevelThemeSystem";

import {
  getVFXState,
  getActiveLevelTheme,
  getScreenAndVFXState,
  readCanvasSize,
  getOrCreateCached,
  createParallaxLayer,
  SpeedLine,
  MatrixColumn,
  AccretionParticle,
  DistantAsteroid,
  VFXWorldState,
  WARP_LINE_COUNT,
  MATRIX_COLUMN_COUNT,
  ACCRETION_PARTICLE_COUNT,
  TRAIL_LENGTH
} from "./SharedVFXInternal";

export { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor };
export { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow };
export { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate };
export { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState };
export { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme };
export { MotionTrailParams, computeTrailParameters, getThrusterFlameColors, CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint };
export { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme };

export { getActiveLevelTheme, getScreenAndVFXState, readCanvasSize, createParallaxLayer };

// Export layered effects
export { ScrollingStarfieldEffect, SkiaScrollingStarfieldEffect } from "./layers/ScrollingStarfieldLayer";
export { DriftingNebulaBackgroundEffect, SkiaDriftingNebulaBackgroundEffect } from "./layers/DriftingNebulaLayer";
export { DiffuseMilkyWayBackgroundEffect, SkiaDiffuseMilkyWayBackgroundEffect } from "./layers/DiffuseMilkyWayLayer";
export { DistantAsteroidBeltBackgroundEffect, SkiaDistantAsteroidBeltBackgroundEffect } from "./layers/DistantAsteroidBeltLayer";
export { DistantSpaceStationBackgroundEffect, SkiaDistantSpaceStationBackgroundEffect } from "./layers/DistantSpaceStationLayer";
export { RingingPlanetBackgroundEffect, SkiaRingingPlanetBackgroundEffect } from "./layers/RingingPlanetLayer";

// -------------------------------------------------------------
// Pure Calculation & State Update Helpers
// -------------------------------------------------------------
export function updateSpeedLine(line: SpeedLine, maxRadius: number, rng: RandomService): void {
  line.radius += line.speed;
  if (line.radius > maxRadius) {
    line.radius = rng.nextRange(10, 50);
    line.angle = rng.nextRange(0, Math.PI * 2);
    line.length = rng.nextRange(15, 60);
    line.speed = rng.nextRange(4, 12);
  }
}

export function computeSpeedLineCoordinates(centerX: number, centerY: number, angle: number, radius: number, length: number) {
  return {
    x1: centerX + Math.cos(angle) * radius,
    y1: centerY + Math.sin(angle) * radius,
    x2: centerX + Math.cos(angle) * (radius + length),
    y2: centerY + Math.sin(angle) * (radius + length)
  };
}

export function updateMatrixColumn(col: MatrixColumn, height: number, rng: RandomService): void {
  col.y += col.speed;
  if (col.y > height) {
    col.y = -150;
    col.speed = rng.nextRange(2, 6);
  }
}

export function updateAccretionParticle(p: AccretionParticle, baseSize: number, rng: RandomService): void {
  p.angle -= p.speed;
  p.radius -= 0.2;
  if (p.radius < 5) {
    p.radius = rng.nextRange(baseSize * 0.8, baseSize * 1.5);
    p.angle = rng.nextRange(0, Math.PI * 2);
  }
}

export function updateDistantAsteroid(ast: DistantAsteroid, width: number, offsetX: number): { posX: number; y: number; rotation: number } {
  ast.x += ast.vx;
  ast.y += ast.vy;
  ast.rotation += ast.angularVelocity;
  const posX = wrapParallaxCoordinate(ast.x - offsetX * 0.1, width, ast.radius * 2);
  return { posX, y: ast.y, rotation: ast.rotation };
}

export function getRenderComponent<TComponents extends ComponentRegistry = ComponentRegistry>(
  world: World<TComponents>,
  entity: Entity
): RenderComponent | undefined {
  return world.getComponent(entity, "Render" as Extract<keyof TComponents, string>) as RenderComponent | undefined;
}

export function computeShockwaveParams(baseSize: number, progress: number) {
  const easedProgress = Math.sin((progress * Math.PI) / 2);
  const maxRadius = baseSize * 4;
  const currentRadius = maxRadius * easedProgress;
  const strokeWidth = Math.max(0.5, 4.0 * (1.0 - progress));
  return { currentRadius, strokeWidth };
}

function computeHologramLayers(timePhase: number, size: number) {
  const glitchOffset = 2 + 1.5 * Math.sin(timePhase * 10);
  return [
    { x: -glitchOffset, radius: size, color: COSMIC_ARCADE_PALETTE.neonCyan, alpha: 0.4 },
    { x: glitchOffset, radius: size, color: COSMIC_ARCADE_PALETTE.neonMagenta, alpha: 0.4 },
    { x: 0, radius: size * 0.9, color: COSMIC_ARCADE_PALETTE.white, alpha: 0.9 }
  ];
}

interface TrailSegment {
  alpha: number;
  offset: number;
  wiggle: number;
  radius: number;
}

function computeCometTrailSegments(timePhase: number, size: number): TrailSegment[] {
  const segments: TrailSegment[] = [];
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    const alpha = 0.5 * (1.0 - i / TRAIL_LENGTH);
    const offset = (i + 1) * 3;
    const wiggle = 2 * Math.sin(timePhase * 4 + i);
    const radius = size * (1.0 - i / TRAIL_LENGTH);
    segments.push({ alpha, offset, wiggle, radius });
  }
  return segments;
}

function computeEffectProgress<TComponents extends ComponentRegistry = ComponentRegistry>(
  world: World<TComponents>,
  entity: Entity
): { progress: number; alpha: number } {
  const ttl = world.getComponent(entity, "TTL" as Extract<keyof TComponents, string>) as TTLComponent | undefined;
  let progress = 0.5;

  if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
    const totalLife = ttl.timeLeft || 1.0;
    progress = 1.0 - (ttl.remaining / totalLife);
  } else {
    progress = (getVFXState(world).timePhase % 2) / 2;
  }

  const alpha = 1.0 - progress;
  return { progress, alpha };
}

function computeShieldBubbleParams(timePhase: number) {
  const pulseFactor = 1.0 + 0.06 * Math.sin(timePhase);
  const pulseAlpha = 0.4 + 0.15 * Math.sin(timePhase + Math.PI);
  return { pulseFactor, pulseAlpha };
}

function computeThrusterPlume(timePhase: number, size: number) {
  const flicker = 1.0 + 0.12 * Math.sin(timePhase * 5) + 0.08 * Math.sin(timePhase * 11);
  const plumeLength = size * 2.2 * flicker;
  return { plumeLength };
}

function pickColor(rng: RandomService, colors: string[]): { color: string; skColor: SkColor | null } {
  const color = colors[rng.nextInt(0, colors.length)];
  return { color, skColor: Skia ? Skia.Color(color) : null };
}

function initializeLines(world: World<ComponentRegistry>, state: VFXWorldState, maxRadius: number) {
  const rng = world.renderRandom;
  const colors = [
    COSMIC_ARCADE_PALETTE.white,
    COSMIC_ARCADE_PALETTE.iceBlue,
    COSMIC_ARCADE_PALETTE.neonCyan
  ];

  state.lines = [];
  for (let i = 0; i < WARP_LINE_COUNT; i++) {
    const { color, skColor } = pickColor(rng, colors);
    state.lines.push({
      angle: rng.nextRange(0, Math.PI * 2),
      radius: rng.nextRange(10, maxRadius),
      length: rng.nextRange(15, 60),
      speed: rng.nextRange(4, 12),
      color,
      skColor
    });
  }
  state.warpLinesInitialized = true;
}

function initializeMatrix(world: World, state: any) {
  const rng = world.renderRandom;
  state.matrixColumns = [];
  for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
    state.matrixColumns.push({
      x: (i * 800) / MATRIX_COLUMN_COUNT,
      y: rng.nextRange(-400, 0),
      speed: rng.nextRange(2, 6),
      length: rng.nextRange(10, 30),
      intensity: rng.nextRange(0.4, 0.9)
    });
  }
  state.matrixInitialized = true;
}

function initializeVortex(world: World, state: any) {
  const rng = world.renderRandom;
  state.accretionParticles = [];
  for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
    state.accretionParticles.push({
      angle: rng.nextRange(0, Math.PI * 2),
      radius: rng.nextRange(15, 60),
      speed: rng.nextRange(0.05, 0.15),
      size: rng.nextRange(1, 3)
    });
  }
  state.vortexInitialized = true;
}

// -------------------------------------------------------------
// 1. RetroCRTScanlinesEffect (Canvas & Skia)
// -------------------------------------------------------------
export const RetroCRTScanlinesEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);

    state.timePhase += 0.04;

    ctx.save();

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.voidBlack;
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }

    const gradient = getOrCreateCached(state, "cachedCRTGradient", width, height, () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      const grad = ctx.createRadialGradient(
        centerX, centerY, maxRadius * 0.4,
        centerX, centerY, maxRadius
      );
      grad.addColorStop(0, hexToRgba(COSMIC_ARCADE_PALETTE.voidBlack, 0));
      grad.addColorStop(1, hexToRgba(COSMIC_ARCADE_PALETTE.voidBlack, 0.6));
      return grad;
    });

    ctx.fillStyle = gradient;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, width, height);

    const randomFlicker = world.renderRandom.next();
    if (randomFlicker > 0.95) {
      ctx.fillStyle = COSMIC_ARCADE_PALETTE.white;
      ctx.globalAlpha = 0.005 + (randomFlicker - 0.95) * 0.15;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
};

export const SkiaRetroCRTScanlinesEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);

    state.timePhase += 0.04;

    canvas.save();

    const paint = Skia.Paint();

    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.voidBlack));
    paint.setAlphaf(0.15);
    for (let y = 0; y < height; y += 4) {
      canvas.drawRect(Skia.XYWHRect(0, y, width, 2), paint);
    }

    const shader = getOrCreateCached(state, "cachedSkiaShader", width, height, () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      return Skia.Shader.MakeRadialGradient(
        Skia.Point(centerX, centerY),
        maxRadius,
        [
          getSkiaColor(COSMIC_ARCADE_PALETTE.voidBlack, 0),
          getSkiaColor(COSMIC_ARCADE_PALETTE.voidBlack, 0.6)
        ],
        [0.4, 1.0],
        Skia.TileMode.Clamp
      );
    });

    paint.setShader(shader);
    paint.setAlphaf(1.0);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    const randomFlicker = world.renderRandom.next();
    if (randomFlicker > 0.95) {
      const flickerPaint = Skia.Paint();
      flickerPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.white));
      flickerPaint.setAlphaf(0.005 + (randomFlicker - 0.95) * 0.15);
      canvas.drawRect(Skia.XYWHRect(0, 0, width, height), flickerPaint);
    }

    canvas.restore();
  }
};

/**
 * Registers all shared VFX shape drawers to a Renderer instance for both Canvas and Skia backends.
 */
export function registerSharedVFX<TComponents extends CoreComponentRegistry, TCanvas extends RenderContext>(renderer: Renderer<TComponents, TCanvas>): void {
  RendererUtils.registerAssets(renderer as unknown as Renderer<ComponentRegistry, RenderContext>, {
    canvas: (r) => {
      r.registerShape("shield_bubble", EnergyShieldBubbleEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("shockwave", DebrisShockwaveEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("thruster_flame", ThrusterPlumeFlameEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("laser_beam", LaserRailBeamEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("singularity", SingularityVortexEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("comet_trail", CometMotionTrailEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("hologram_glitch", RGBHologramGlitchEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("floating_text", FloatingTextScoreEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
    },
    skia: (r) => {
      r.registerShape("shield_bubble", SkiaEnergyShieldBubbleEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("shockwave", SkiaDebrisShockwaveEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("thruster_flame", SkiaThrusterPlumeFlameEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("laser_beam", SkiaLaserRailBeamEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("singularity", SkiaSingularityVortexEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("comet_trail", SkiaCometMotionTrailEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("hologram_glitch", SkiaRGBHologramGlitchEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
      r.registerShape("floating_text", SkiaFloatingTextScoreEffect as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
    }
  });
}

/**
 * Shared particle creation helper for pooling and zero-allocation particle instantiation.
 * @public
 */
export function createSharedParticle<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  pool: { acquire: (world: World<TComponents, TEvents, TBlueprints>, params: any) => number },
  size = 3,
  ttl = 0.8
): number {
  return pool.acquire(world, { x, y, dx, dy, size, color, ttl });
}

function resolveWarpLinesContext(world: World<CoreComponentRegistry>) {
  const { width, height, state } = getScreenAndVFXState(world);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

  if (!state.warpLinesInitialized) {
    initializeLines(world, state, maxRadius);
  }
  return { centerX, centerY, maxRadius, lines: state.lines };
}

// -------------------------------------------------------------
// 3. HyperdriveWarpSpeedLinesEffect (Canvas & Skia)
// -------------------------------------------------------------
export const HyperdriveWarpSpeedLinesEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { centerX, centerY, maxRadius, lines } = resolveWarpLinesContext(world);

    ctx.save();
    ctx.lineWidth = 1.5;

    for (let i = 0; i < WARP_LINE_COUNT; i++) {
      const line = lines[i];
      updateSpeedLine(line, maxRadius, world.renderRandom);
      const { x1, y1, x2, y2 } = computeSpeedLineCoordinates(centerX, centerY, line.angle, line.radius, line.length);

      ctx.strokeStyle = line.color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaHyperdriveWarpSpeedLinesEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { centerX, centerY, maxRadius, lines } = resolveWarpLinesContext(world);

    canvas.save();
    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);

    for (let i = 0; i < WARP_LINE_COUNT; i++) {
      const line = lines[i];
      updateSpeedLine(line, maxRadius, world.renderRandom);
      const { x1, y1, x2, y2 } = computeSpeedLineCoordinates(centerX, centerY, line.angle, line.radius, line.length);

      paint.setColor(line.skColor || Skia.Color(COSMIC_ARCADE_PALETTE.white));
      canvas.drawLine(x1, y1, x2, y2, paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 4. EnergyShieldBubbleEffect (Canvas & Skia)
// -------------------------------------------------------------
export const EnergyShieldBubbleEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 35;
    const radius = size * 1.3;
    const timePhase = getVFXState(world).timePhase;
    const { pulseFactor, pulseAlpha } = computeShieldBubbleParams(timePhase);
    const glowStyle = getGlowStyle(COSMIC_ARCADE_PALETTE.neonCyan, "normal");

    ctx.save();
    renderCanvasGlow(ctx, glowStyle, (glowCtx, isHighlight) => {
      glowCtx.lineWidth = isHighlight ? 1.5 : 3;
      glowCtx.beginPath();
      glowCtx.arc(0, 0, radius * pulseFactor, 0, Math.PI * 2);
      glowCtx.stroke();
    });

    const rng = world.renderRandom;
    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.iceBlue;
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
      const arcStart = rng.nextRange(0, Math.PI * 2);
      const arcLen = rng.nextRange(0.2, 0.7);
      ctx.globalAlpha = pulseAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, radius * pulseFactor, arcStart, arcStart + arcLen);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaEnergyShieldBubbleEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 35;
    const radius = size * 1.3;
    const timePhase = getVFXState(world).timePhase;
    const { pulseFactor } = computeShieldBubbleParams(timePhase);
    const glowStyle = getGlowStyle(COSMIC_ARCADE_PALETTE.neonCyan, "normal");

    canvas.save();
    renderSkiaGlow(canvas, glowStyle, (paint, isHighlight) => {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(isHighlight ? 1.5 : 3);
      canvas.drawCircle(0, 0, radius * pulseFactor, paint);
    });

    const rng = world.renderRandom;
    const sparkPaint = Skia.Paint();
    sparkPaint.setStyle(Skia.PaintStyle.Stroke);
    sparkPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.iceBlue));
    sparkPaint.setStrokeWidth(2);

    for (let i = 0; i < 3; i++) {
      const arcStart = rng.nextRange(0, Math.PI * 2);
      const arcLen = rng.nextRange(0.2, 0.7);

      const path = Skia.Path.Make();
      path.addArc(
        Skia.XYWHRect(-radius * pulseFactor, -radius * pulseFactor, radius * pulseFactor * 2, radius * pulseFactor * 2),
        (arcStart * 180) / Math.PI,
        (arcLen * 180) / Math.PI
      );
      canvas.drawPath(path, sparkPaint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 5. DebrisShockwaveEffect (Canvas & Skia)
// -------------------------------------------------------------
function drawShockwaveSparks(
  rng: RandomService,
  currentRadius: number,
  drawSpark: (sparkX: number, sparkY: number, sparkSize: number) => void
): void {
  for (let i = 0; i < 8; i++) {
    const angle = rng.nextRange(0, Math.PI * 2);
    const distFactor = rng.nextRange(0.6, 1.4);
    const sparkDist = currentRadius * distFactor;
    const sparkX = Math.cos(angle) * sparkDist;
    const sparkY = Math.sin(angle) * sparkDist;
    const sparkSize = rng.nextRange(1.5, 3.5);

    drawSpark(sparkX, sparkY, sparkSize);
  }
}

export const DebrisShockwaveEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = getRenderComponent(world, entity);
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    const { currentRadius, strokeWidth } = computeShockwaveParams(render.size || 20, progress);

    ctx.save();

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.solarOrange;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.plasmaYellow;
    ctx.globalAlpha = alpha * 0.7;
    ctx.lineWidth = strokeWidth * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.plasmaYellow;
    ctx.globalAlpha = alpha;

    drawShockwaveSparks(world.renderRandom, currentRadius, (sparkX, sparkY, sparkSize) => {
      ctx.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize);
    });

    ctx.restore();
  }
};

export const SkiaDebrisShockwaveEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = getRenderComponent(world, entity);
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    const { currentRadius, strokeWidth } = computeShockwaveParams(render.size || 20, progress);

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.solarOrange));
    paint.setAlphaf(alpha);
    paint.setStrokeWidth(strokeWidth);
    canvas.drawCircle(0, 0, currentRadius, paint);

    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.plasmaYellow));
    paint.setAlphaf(alpha * 0.7);
    paint.setStrokeWidth(strokeWidth * 0.5);
    canvas.drawCircle(0, 0, currentRadius * 1.2, paint);

    const sparkPaint = Skia.Paint();
    sparkPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.plasmaYellow));
    sparkPaint.setAlphaf(alpha);

    drawShockwaveSparks(world.renderRandom, currentRadius, (sparkX, sparkY, sparkSize) => {
      canvas.drawRect(
        Skia.XYWHRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize),
        sparkPaint
      );
    });

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 7. MatrixDigitalRainEffect (Canvas & Skia)
// -------------------------------------------------------------
export const MatrixDigitalRainEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { height, state } = getScreenAndVFXState(world);

    if (!state.matrixInitialized) {
      initializeMatrix(world, state);
    }

    ctx.save();

    for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
      const col = state.matrixColumns[i];
      updateMatrixColumn(col, height, world.renderRandom);

      ctx.fillStyle = COSMIC_ARCADE_PALETTE.matrixGreen;
      ctx.globalAlpha = col.intensity * 0.15;
      for (let j = 0; j < col.length; j++) {
        ctx.fillRect(col.x, col.y - j * 8, 4, 6);
      }

      ctx.fillStyle = COSMIC_ARCADE_PALETTE.white;
      ctx.globalAlpha = col.intensity;
      ctx.fillRect(col.x, col.y, 4, 6);
    }

    ctx.restore();
  }
};

export const SkiaMatrixDigitalRainEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { height, state } = getScreenAndVFXState(world);

    if (!state.matrixInitialized) {
      initializeMatrix(world, state);
    }

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
      const col = state.matrixColumns[i];
      updateMatrixColumn(col, height, world.renderRandom);

      paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.matrixGreen));
      paint.setAlphaf(col.intensity * 0.15);
      for (let j = 0; j < col.length; j++) {
        canvas.drawRect(Skia.XYWHRect(col.x, col.y - j * 8, 4, 6), paint);
      }

      paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.white));
      paint.setAlphaf(col.intensity);
      canvas.drawRect(Skia.XYWHRect(col.x, col.y, 4, 6), paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 8. CRTGlitchShudderEffect (Canvas & Skia)
// -------------------------------------------------------------
function drawCRTGlitchLines(
  rng: RandomService,
  height: number,
  drawLine: (offset: number, y: number, h: number, alpha: number) => void
): void {
  const glitchLines = rng.nextInt(2, 5);
  for (let i = 0; i < glitchLines; i++) {
    const y = rng.nextRange(10, height - 10);
    const h = rng.nextRange(1, 4);
    const offset = rng.nextRange(-15, 15);
    const alpha = rng.nextRange(0.2, 0.5);

    drawLine(offset, y, h, alpha);
  }
}

export const CRTGlitchShudderEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height } = getScreenAndVFXState(world);

    const rng = world.renderRandom;
    if (rng.next() < 0.96) return;

    ctx.save();
    ctx.fillStyle = COSMIC_ARCADE_PALETTE.white;

    drawCRTGlitchLines(rng, height, (offset, y, h, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillRect(offset, y, width, h);
    });

    ctx.restore();
  }
};

export const SkiaCRTGlitchShudderEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height } = getScreenAndVFXState(world);

    const rng = world.renderRandom;
    if (rng.next() < 0.96) return;

    canvas.save();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.white));

    drawCRTGlitchLines(rng, height, (offset, y, h, alpha) => {
      paint.setAlphaf(alpha);
      canvas.drawRect(Skia.XYWHRect(offset, y, width, h), paint);
    });

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 9. ThrusterPlumeFlameEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ThrusterPlumeFlameEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 10;
    const timePhase = getVFXState(world).timePhase;
    const { plumeLength } = computeThrusterPlume(timePhase, size);
    const flameColors = getThrusterFlameColors();
    const glowStyle = getGlowStyle(flameColors.inner, "normal");

    ctx.save();
    renderCanvasGlow(ctx, glowStyle, (glowCtx, isHighlight) => {
      glowCtx.beginPath();
      glowCtx.moveTo(-size / 2, 0);
      glowCtx.lineTo(size / 2, 0);
      glowCtx.lineTo(0, plumeLength);
      glowCtx.closePath();
      if (isHighlight) {
        glowCtx.fillStyle = flameColors.core;
      }
      glowCtx.fill();
    });

    ctx.fillStyle = flameColors.core;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-size / 3, 0);
    ctx.lineTo(size / 3, 0);
    ctx.lineTo(0, plumeLength * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

export const SkiaThrusterPlumeFlameEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 10;
    const timePhase = getVFXState(world).timePhase;
    const { plumeLength } = computeThrusterPlume(timePhase, size);
    const flameColors = getThrusterFlameColors();
    const glowStyle = getGlowStyle(flameColors.inner, "normal");

    canvas.save();
    renderSkiaGlow(canvas, glowStyle, (paint, isHighlight) => {
      paint.setStyle(Skia.PaintStyle.Fill);
      if (isHighlight) {
        paint.setColor(Skia.Color(flameColors.core));
      } else {
        paint.setColor(Skia.Color(flameColors.inner));
      }
      const pathOuter = Skia.Path.Make();
      pathOuter.moveTo(-size / 2, 0);
      pathOuter.lineTo(size / 2, 0);
      pathOuter.lineTo(0, plumeLength);
      pathOuter.close();
      canvas.drawPath(pathOuter, paint);
    });

    const paintInner = Skia.Paint();
    paintInner.setColor(Skia.Color(flameColors.core));
    paintInner.setAlphaf(0.85);
    const pathInner = Skia.Path.Make();
    pathInner.moveTo(-size / 3, 0);
    pathInner.lineTo(size / 3, 0);
    pathInner.lineTo(0, plumeLength * 0.65);
    pathInner.close();
    canvas.drawPath(pathInner, paintInner);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 10. LaserRailBeamEffect (Canvas & Skia)
// -------------------------------------------------------------
export const LaserRailBeamEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const length = render.size || 300;
    const timePhase = getVFXState(world).timePhase;
    const glowStyle = getGlowStyle(COSMIC_ARCADE_PALETTE.neonCyan, "strong");

    ctx.save();
    renderCanvasGlow(ctx, glowStyle, (glowCtx, isHighlight) => {
      glowCtx.lineWidth = isHighlight ? 3 : 8 + 2 * Math.sin(timePhase * 6);
      glowCtx.beginPath();
      glowCtx.moveTo(0, 0);
      glowCtx.lineTo(0, -length);
      glowCtx.stroke();
    });

    const rng = world.renderRandom;
    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.iceBlue;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);

    let curY = 0;
    while (curY > -length) {
      curY -= rng.nextRange(15, 30);
      const curX = rng.nextRange(-10, 10);
      ctx.lineTo(curX, curY);
    }
    ctx.stroke();

    ctx.restore();
  }
};

export const SkiaLaserRailBeamEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const length = render.size || 300;
    const timePhase = getVFXState(world).timePhase;
    const glowStyle = getGlowStyle(COSMIC_ARCADE_PALETTE.neonCyan, "strong");

    canvas.save();
    renderSkiaGlow(canvas, glowStyle, (paint, isHighlight) => {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(isHighlight ? 3 : 8 + 2 * Math.sin(timePhase * 6));
      canvas.drawLine(0, 0, 0, -length, paint);
    });

    const rng = world.renderRandom;
    const sparkPaint = Skia.Paint();
    sparkPaint.setStyle(Skia.PaintStyle.Stroke);
    sparkPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.iceBlue));
    sparkPaint.setAlphaf(0.8);
    sparkPaint.setStrokeWidth(1);

    const path = Skia.Path.Make();
    path.moveTo(0, 0);

    let curY = 0;
    while (curY > -length) {
      curY -= rng.nextRange(15, 30);
      const curX = rng.nextRange(-10, 10);
      path.lineTo(curX, curY);
    }
    canvas.drawPath(path, sparkPaint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 11. ScreenBorderGlowEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ScreenBorderGlowEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    const timePhase = state.timePhase;

    ctx.save();

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.dangerRed;
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(timePhase * 3);
    ctx.lineWidth = 14;

    ctx.strokeRect(7, 7, width - 14, height - 14);

    ctx.restore();
  }
};

export const SkiaScreenBorderGlowEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    const timePhase = state.timePhase;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.dangerRed));
    paint.setAlphaf(0.12 + 0.08 * Math.sin(timePhase * 3));
    paint.setStrokeWidth(14);

    canvas.drawRect(Skia.XYWHRect(7, 7, width - 14, height - 14), paint);

    canvas.restore();
  }
};

function resolveVortexContext(world: World<CoreComponentRegistry>, entity: Entity) {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render) return null;

  const baseSize = render.size || 30;
  const state = getVFXState(world);

  if (!state.vortexInitialized) {
    initializeVortex(world, state);
  }
  return { baseSize, state };
}

// -------------------------------------------------------------
// 12. SingularityVortexEffect (Canvas & Skia)
// -------------------------------------------------------------
export const SingularityVortexEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const vCtx = resolveVortexContext(world, entity);
    if (!vCtx) return;
    const { baseSize, state } = vCtx;

    ctx.save();

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.nebulaPurple;
    ctx.globalAlpha = 0.3;
    for (let r = baseSize; r > 5; r -= 6) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.voidBlack;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, baseSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.neonMagenta;
    for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
      const p = state.accretionParticles[i];
      updateAccretionParticle(p, baseSize, world.renderRandom);

      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }

    ctx.restore();
  }
};

export const SkiaSingularityVortexEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const vCtx = resolveVortexContext(world, entity);
    if (!vCtx) return;
    const { baseSize, state } = vCtx;

    canvas.save();
    const paint = Skia.Paint();

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.nebulaPurple));
    paint.setAlphaf(0.3);
    for (let r = baseSize; r > 5; r -= 6) {
      paint.setStrokeWidth(2);
      canvas.drawCircle(0, 0, r, paint);
    }

    const centerPaint = Skia.Paint();
    centerPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.voidBlack));
    canvas.drawCircle(0, 0, baseSize * 0.4, centerPaint);

    const pPaint = Skia.Paint();
    pPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.neonMagenta));

    for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
      const p = state.accretionParticles[i];
      updateAccretionParticle(p, baseSize, world.renderRandom);

      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      canvas.drawRect(Skia.XYWHRect(x - p.size / 2, y - p.size / 2, p.size, p.size), pPaint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 13. CometMotionTrailEffect (ShapeDrawer)
// -------------------------------------------------------------
export const CometMotionTrailEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 15;
    const timePhase = getVFXState(world).timePhase;
    const trailParams = computeTrailParameters(1.0, 1.0, size);
    const segments = computeCometTrailSegments(timePhase, trailParams.scaledLength || size);
    const glowStyle = getGlowStyle(trailParams.glowColor, "normal");

    ctx.save();
    renderCanvasGlow(ctx, glowStyle, (glowCtx) => {
      glowCtx.lineWidth = 1;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        glowCtx.globalAlpha = seg.alpha;
        glowCtx.beginPath();
        glowCtx.arc(seg.wiggle, seg.offset, seg.radius, 0, Math.PI * 2);
        glowCtx.stroke();
      }
    });

    ctx.restore();
  }
};

export const SkiaCometMotionTrailEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 15;
    const timePhase = getVFXState(world).timePhase;
    const trailParams = computeTrailParameters(1.0, 1.0, size);
    const segments = computeCometTrailSegments(timePhase, trailParams.scaledLength || size);
    const glowStyle = getGlowStyle(trailParams.glowColor, "normal");

    canvas.save();
    renderSkiaGlow(canvas, glowStyle, (paint) => {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(1);
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        paint.setAlphaf(seg.alpha);
        canvas.drawCircle(seg.wiggle, seg.offset, seg.radius, paint);
      }
    });

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 14. RGBHologramGlitchEffect (ShapeDrawer)
// -------------------------------------------------------------
export const RGBHologramGlitchEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 20;
    const timePhase = getVFXState(world).timePhase;
    const layers = computeHologramLayers(timePhase, size);

    ctx.save();
    ctx.lineWidth = 2;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      ctx.strokeStyle = layer.color;
      ctx.globalAlpha = layer.alpha;
      ctx.beginPath();
      ctx.arc(layer.x, 0, layer.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaRGBHologramGlitchEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 20;
    const timePhase = getVFXState(world).timePhase;
    const layers = computeHologramLayers(timePhase, size);

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      paint.setColor(Skia.Color(layer.color));
      paint.setAlphaf(layer.alpha);
      canvas.drawCircle(layer.x, 0, layer.radius, paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 15. FloatingTextScoreEffect (ShapeDrawer)
// -------------------------------------------------------------
export const FloatingTextScoreEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    const label = (entity as { text?: string }).text || "+100";
    const offsetY = -progress * 50;

    ctx.save();

    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.globalAlpha = alpha;

    if (typeof ctx.strokeText === "function") {
      ctx.strokeStyle = COSMIC_ARCADE_PALETTE.voidBlack;
      ctx.lineWidth = 3;
      ctx.strokeText(label, 0, offsetY);
    }

    if (typeof ctx.fillText === "function") {
      ctx.fillStyle = COSMIC_ARCADE_PALETTE.plasmaYellow;
      ctx.fillText(label, 0, offsetY);
    }

    ctx.restore();
  }
};

export const SkiaFloatingTextScoreEffect: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    canvas.save();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.plasmaYellow));
    paint.setAlphaf(alpha);

    canvas.drawRect(Skia.XYWHRect(-10, -progress * 50, 20, 6), paint);

    canvas.restore();
  }
};
