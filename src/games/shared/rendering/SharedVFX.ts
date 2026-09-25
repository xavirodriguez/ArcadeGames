import { World, EffectDrawer, ShapeDrawer, ComponentRegistry, CoreComponentRegistry, RenderComponent, TTLComponent, Renderer, RendererUtils, RenderContext, EventRegistry, BlueprintRegistryMap, Entity, RandomService } from "@tiny-aster/core";
import type { SkCanvas, SkColor } from "@shopify/react-native-skia";
import { Skia } from "./SkiaContext";
import { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor } from "./CosmicPalette";
import { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow } from "./GlowSystem";
import { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate } from "./ParallaxSystem";
import { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState } from "./ExplosionSystem";
import { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme } from "./CelestialBodiesSystem";
import { MotionTrailParams, computeTrailParameters, getThrusterFlameColors, CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint } from "./MotionTrailSystem";
import { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme } from "./LevelThemeSystem";
import { IDrawAdapter, CanvasDrawAdapter, SkiaDrawAdapter } from "./DrawAdapter";

import {
  getVFXState,
  getActiveLevelTheme,
  getActiveVisualContext,
  ActiveVisualContext,
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
export { ActiveVisualContext, getActiveVisualContext };
export { IDrawAdapter, CanvasDrawAdapter, SkiaDrawAdapter };

export { getActiveLevelTheme, getScreenAndVFXState, readCanvasSize, createParallaxLayer };

// Export layered effects
export { ScrollingStarfieldEffect, SkiaScrollingStarfieldEffect } from "./layers/ScrollingStarfieldLayer";
export { DriftingNebulaBackgroundEffect, SkiaDriftingNebulaBackgroundEffect } from "./layers/DriftingNebulaLayer";
export { DiffuseMilkyWayBackgroundEffect, SkiaDiffuseMilkyWayBackgroundEffect } from "./layers/DiffuseMilkyWayLayer";
export { DistantAsteroidBeltBackgroundEffect, SkiaDistantAsteroidBeltBackgroundEffect } from "./layers/DistantAsteroidBeltLayer";
export { DistantSpaceStationBackgroundEffect, SkiaDistantSpaceStationBackgroundEffect } from "./layers/DistantSpaceStationLayer";
export { RingingPlanetBackgroundEffect, SkiaRingingPlanetBackgroundEffect } from "./layers/RingingPlanetLayer";

// Export Mission HUD shared utilities
export {
  resolveMissionHudModel,
  createCanvasMissionHUD,
  createSkiaMissionHUD,
  drawCanvasMissionHUD,
  drawSkiaMissionHUD,
  MissionHudViewModel,
  MissionHudOptions
} from "./SharedMissionHUD";

interface SkiaCanvasOps {
  save(): void;
  restore(): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, paint: unknown): void;
  drawRect(rect: unknown, paint: unknown): void;
  drawPath(path: unknown, paint: unknown): void;
}

// -------------------------------------------------------------
// Pure Calculation & State Update Helpers
// -------------------------------------------------------------

function getRenderComponent(world: World<CoreComponentRegistry>, entity: Entity): RenderComponent | undefined {
  return world.getComponent(entity, "Render");
}

function getDrawerContext(world: World<CoreComponentRegistry>, entity: Entity, defaultSize = 20, isSkia = false) {
  if (isSkia && !Skia) return null;
  const render = getRenderComponent(world, entity);
  if (!render) return null;

  const size = render.size || defaultSize;
  const state = getVFXState(world);
  return { render, size, timePhase: state.timePhase };
}

export function computeCRTScanlineAlpha(timePhase: number, lineY: number): number {
  return 0.15 + 0.05 * Math.sin(timePhase * 5 + lineY * 0.1);
}

export function computeWarpLineState(line: SpeedLine, timePhase: number, maxRadius: number): { x: number; y: number; alpha: number } {
  const currentRadius = (line.radius + timePhase * line.speed) % maxRadius;
  const x = Math.cos(line.angle) * currentRadius;
  const y = Math.sin(line.angle) * currentRadius;
  const alpha = Math.min(1.0, currentRadius / (maxRadius * 0.3));
  return { x, y, alpha };
}

export function computeShieldBubbleParams(timePhase: number): { pulseFactor: number; pulseAlpha: number } {
  const pulseFactor = 1.0 + 0.05 * Math.sin(timePhase * 4);
  const pulseAlpha = 0.4 + 0.2 * Math.sin(timePhase * 4);
  return { pulseFactor, pulseAlpha };
}

export function computeShockwaveParams(size: number, progress: number): { currentRadius: number; strokeWidth: number } {
  const maxRadius = size * 2.5;
  const currentRadius = maxRadius * progress;
  const strokeWidth = Math.max(1, 6 * (1 - progress));
  return { currentRadius, strokeWidth };
}

export function computeThrusterPlume(timePhase: number, size: number): { plumeLength: number; flickerScale: number } {
  const flickerScale = 0.85 + 0.3 * Math.sin(timePhase * 30);
  const plumeLength = size * 2.2 * flickerScale;
  return { plumeLength, flickerScale };
}

export function computeHologramLayers(timePhase: number, size: number): Array<{ color: string; alpha: number; x: number; radius: number }> {
  const offset = Math.sin(timePhase * 12) * 3;
  return [
    { color: COSMIC_ARCADE_PALETTE.neonCyan, alpha: 0.7, x: -offset, radius: size },
    { color: COSMIC_ARCADE_PALETTE.neonMagenta, alpha: 0.7, x: offset, radius: size },
    { color: COSMIC_ARCADE_PALETTE.white, alpha: 0.9, x: 0, radius: size * 0.9 }
  ];
}

export function computeEffectProgress(world: World<CoreComponentRegistry>, entity: Entity): { progress: number; alpha: number } {
  const ttl = world.getComponent(entity, "TTL");
  if (!ttl || ttl.remaining <= 0) return { progress: 1.0, alpha: 0.0 };

  const total = ttl.timeLeft || 1.0;
  const progress = 1.0 - ttl.remaining / total;
  const alpha = Math.max(0, Math.min(1, ttl.remaining / total));
  return { progress, alpha };
}

function prepareEffectRender(
  world: World<CoreComponentRegistry>,
  entity: Entity
): { render: RenderComponent; progress: number; alpha: number } | null {
  const render = getRenderComponent(world, entity);
  if (!render) return null;

  const { progress, alpha } = computeEffectProgress(world, entity);
  if (alpha <= 0.01) return null;

  return { render, progress, alpha };
}

function updateSpeedLine(line: SpeedLine, maxRadius: number, rng: RandomService): void {
  line.radius += line.speed;
  if (line.radius > maxRadius) {
    line.radius = 0;
    line.angle = rng.nextRange(0, Math.PI * 2);
  }
}

function computeSpeedLineCoordinates(centerX: number, centerY: number, angle: number, radius: number, length: number) {
  const x1 = centerX + Math.cos(angle) * radius;
  const y1 = centerY + Math.sin(angle) * radius;
  const x2 = centerX + Math.cos(angle) * (radius + length);
  const y2 = centerY + Math.sin(angle) * (radius + length);
  return { x1, y1, x2, y2 };
}

function initializeCRTScanlines(width: number, height: number): number[] {
  const lines: number[] = [];
  const step = 4;
  for (let y = 0; y < height; y += step) {
    lines.push(y);
  }
  return lines;
}

function initializeLines(world: World<CoreComponentRegistry>, state: VFXWorldState, maxRadius: number): void {
  const rng = world.renderRandom;
  state.lines = [];
  for (let i = 0; i < WARP_LINE_COUNT; i++) {
    const angle = rng.nextRange(0, Math.PI * 2);
    const radius = rng.nextRange(0, maxRadius);
    const speed = rng.nextRange(2, 6);
    const length = rng.nextRange(10, 30);

    const baseColor = rng.nextRange(0, 1) > 0.5 ? COSMIC_ARCADE_PALETTE.neonCyan : COSMIC_ARCADE_PALETTE.iceBlue;
    const skColor = Skia ? Skia.Color(baseColor) : undefined;

    state.lines.push({ angle, radius, speed, length, color: baseColor, skColor });
  }
  state.warpLinesInitialized = true;
}

function initializeMatrixColumns(width: number, height: number, rng: RandomService): MatrixColumn[] {
  const cols: MatrixColumn[] = [];
  const colWidth = 14;
  const count = Math.floor(width / colWidth);
  for (let i = 0; i < count; i++) {
    cols.push({
      x: i * colWidth + colWidth / 2,
      y: rng.nextRange(-height, 0),
      speed: rng.nextRange(3, 8),
      length: rng.nextRange(5, 15),
      chars: Array.from({ length: 15 }, () => String.fromCharCode(0x30a0 + Math.floor(rng.nextRange(0, 96))))
    });
  }
  return cols;
}

function forEachMatrixChar(
  columns: MatrixColumn[],
  height: number,
  callback: (col: MatrixColumn, charY: number, alpha: number, isLead: boolean, charIndex: number) => void
): void {
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    col.y += col.speed;
    if (col.y > height + col.length * 14) {
      col.y = -col.length * 14;
    }

    for (let j = 0; j < col.length; j++) {
      const charY = col.y - j * 14;
      if (charY < 0 || charY > height) continue;

      const alpha = (1.0 - j / col.length) * 0.8;
      callback(col, charY, alpha, j === 0, j);
    }
  }
}

function updateAccretionParticle(p: AccretionParticle, baseSize: number, rng: RandomService): void {
  p.angle += p.speed;
  p.radius -= 0.2;
  if (p.radius < 5) {
    p.radius = baseSize * rng.nextRange(0.8, 1.2);
    p.angle = rng.nextRange(0, Math.PI * 2);
  }
}

function initializeVortex(world: World<CoreComponentRegistry>, state: VFXWorldState): void {
  const rng = world.renderRandom;
  state.accretionParticles = [];
  for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
    state.accretionParticles.push({
      angle: rng.nextRange(0, Math.PI * 2),
      radius: rng.nextRange(10, 40),
      speed: rng.nextRange(0.02, 0.08),
      size: rng.nextRange(1.5, 3.5)
    });
  }
  state.vortexInitialized = true;
}

export function registerSharedVFXAssets(renderer: Renderer<CoreComponentRegistry, RenderContext>): void {
  RendererUtils.registerAssets(renderer, {
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

export const registerSharedVFX = registerSharedVFXAssets;

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
  pool: { acquire: (world: World<TComponents, TEvents, TBlueprints>, params: { x: number; y: number; dx?: number; dy?: number; vx?: number; vy?: number; size: number; color: string; ttl: number }) => number },
  size = 3,
  ttl = 0.8
): number {
  return pool.acquire(world, { x, y, dx, dy, size, color, ttl });
}

// -------------------------------------------------------------
// 1. RetroCRTScanlinesEffect (Canvas & Skia)
// -------------------------------------------------------------
export const RetroCRTScanlinesEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    const scanlineYs = getOrCreateCached<number[]>(state, "scanlines", width, height, () => initializeCRTScanlines(width, height));
    const timePhase = state.timePhase;

    ctx.save();
    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.voidBlack;
    ctx.lineWidth = 1;

    for (let i = 0; i < scanlineYs.length; i++) {
      const y = scanlineYs[i];
      ctx.globalAlpha = computeCRTScanlineAlpha(timePhase, y);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaRetroCRTScanlinesEffect: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    const scanlineYs = getOrCreateCached<number[]>(state, "scanlines", width, height, () => initializeCRTScanlines(width, height));
    const timePhase = state.timePhase;

    const skCanvas = canvas as unknown as SkiaCanvasOps;
    skCanvas.save();
    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1);
    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.voidBlack));

    for (let i = 0; i < scanlineYs.length; i++) {
      const y = scanlineYs[i];
      paint.setAlphaf(computeCRTScanlineAlpha(timePhase, y));
      skCanvas.drawLine(0, y, width, y, paint);
    }

    skCanvas.restore();
  }
};

// -------------------------------------------------------------
// 2. HyperdriveWarpSpeedLinesEffect (Canvas & Skia)
// -------------------------------------------------------------
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

export function drawHyperdriveWarpSpeedLines(adapter: IDrawAdapter, world: World<CoreComponentRegistry>): void {
  const { centerX, centerY, maxRadius, lines } = resolveWarpLinesContext(world);
  adapter.save();
  for (let i = 0; i < WARP_LINE_COUNT; i++) {
    const line = lines[i];
    updateSpeedLine(line, maxRadius, world.renderRandom);
    const { x1, y1, x2, y2 } = computeSpeedLineCoordinates(centerX, centerY, line.angle, line.radius, line.length);
    adapter.drawLine(x1, y1, x2, y2, line.color, 1.5);
  }
  adapter.restore();
}

export const HyperdriveWarpSpeedLinesEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    drawHyperdriveWarpSpeedLines(new CanvasDrawAdapter(ctx), world);
  }
};

export const SkiaHyperdriveWarpSpeedLinesEffect: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world) {
    if (!Skia) return;
    drawHyperdriveWarpSpeedLines(new SkiaDrawAdapter(canvas), world);
  }
};

// -------------------------------------------------------------
// 3. EnergyShieldBubbleEffect (Canvas & Skia)
// -------------------------------------------------------------
export function drawEnergyShieldBubble(adapter: IDrawAdapter, world: World<CoreComponentRegistry>, entity: Entity, isSkia: boolean = false): void {
  const dCtx = getDrawerContext(world, entity, 35, isSkia);
  if (!dCtx) return;

  const { size, timePhase } = dCtx;
  const radius = size * 1.3;
  const { pulseFactor, pulseAlpha } = computeShieldBubbleParams(timePhase);

  adapter.save();
  adapter.drawGlow(COSMIC_ARCADE_PALETTE.neonCyan, (glowAdapter) => {
    glowAdapter.strokeCircle(0, 0, radius * pulseFactor, COSMIC_ARCADE_PALETTE.neonCyan, 3);
  });

  const rng = world.renderRandom;
  for (let i = 0; i < 3; i++) {
    const arcStart = rng.nextRange(0, Math.PI * 2);
    const arcLen = rng.nextRange(0.2, 0.7);
    adapter.drawArc(0, 0, radius * pulseFactor, arcStart, arcLen, COSMIC_ARCADE_PALETTE.iceBlue, 2, pulseAlpha * 0.8);
  }

  adapter.restore();
}

export const EnergyShieldBubbleEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    drawEnergyShieldBubble(new CanvasDrawAdapter(ctx), world, entity, false);
  }
};

export const SkiaEnergyShieldBubbleEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    if (!Skia) return;
    drawEnergyShieldBubble(new SkiaDrawAdapter(canvas), world, entity, true);
  }
};

// -------------------------------------------------------------
// 4. DebrisShockwaveEffect (Canvas & Skia)
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

export function drawDebrisShockwave(adapter: IDrawAdapter, world: World<CoreComponentRegistry>, entity: Entity): void {
  const effect = prepareEffectRender(world, entity);
  if (!effect) return;

  const { render, progress, alpha } = effect;
  const { currentRadius, strokeWidth } = computeShockwaveParams(render.size || 20, progress);

  adapter.save();
  adapter.strokeCircle(0, 0, currentRadius, COSMIC_ARCADE_PALETTE.solarOrange, strokeWidth, alpha);
  adapter.strokeCircle(0, 0, currentRadius * 1.2, COSMIC_ARCADE_PALETTE.plasmaYellow, strokeWidth * 0.5, alpha * 0.7);

  drawShockwaveSparks(world.renderRandom, currentRadius, (sparkX, sparkY, sparkSize) => {
    adapter.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize, COSMIC_ARCADE_PALETTE.plasmaYellow, alpha);
  });
  adapter.restore();
}

export const DebrisShockwaveEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    drawDebrisShockwave(new CanvasDrawAdapter(ctx), world, entity);
  }
};

export const SkiaDebrisShockwaveEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    if (!Skia) return;
    drawDebrisShockwave(new SkiaDrawAdapter(canvas), world, entity);
  }
};

// -------------------------------------------------------------
// 5. MatrixDigitalRainEffect (Canvas & Skia)
// -------------------------------------------------------------
export const MatrixDigitalRainEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    const columns = getOrCreateCached<MatrixColumn[]>(state, "matrixCols", width, height, () => initializeMatrixColumns(width, height, world.renderRandom));

    ctx.save();
    ctx.font = "12px monospace";
    ctx.textAlign = "center";

    forEachMatrixChar(columns, height, (col, charY, alpha, isLead, j) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isLead ? COSMIC_ARCADE_PALETTE.white : COSMIC_ARCADE_PALETTE.matrixGreen;
      ctx.fillText(col.chars[j % col.chars.length], col.x, charY);
    });

    ctx.restore();
  }
};

export const SkiaMatrixDigitalRainEffect: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    const columns = getOrCreateCached<MatrixColumn[]>(state, "matrixCols", width, height, () => initializeMatrixColumns(width, height, world.renderRandom));

    const skCanvas = canvas as unknown as SkiaCanvasOps;
    skCanvas.save();
    const paintLead = Skia.Paint();
    paintLead.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.white));
    const paintTrail = Skia.Paint();
    paintTrail.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.matrixGreen));

    forEachMatrixChar(columns, height, (col, charY, alpha, isLead) => {
      const paint = isLead ? paintLead : paintTrail;
      paint.setAlphaf(alpha);
      skCanvas.drawRect(Skia.XYWHRect(col.x - 4, charY - 8, 8, 10), paint);
    });

    skCanvas.restore();
  }
};

// -------------------------------------------------------------
// 6. CRTGlitchShudderEffect (Canvas & Skia)
// -------------------------------------------------------------
export const CRTGlitchShudderEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    const timePhase = state.timePhase;
    const isGlitching = Math.sin(timePhase * 17) > 0.85;

    if (!isGlitching) return;

    ctx.save();
    ctx.fillStyle = COSMIC_ARCADE_PALETTE.neonCyan;
    ctx.globalAlpha = 0.15;
    const sliceY = (Math.sin(timePhase * 31) * 0.5 + 0.5) * height;
    ctx.fillRect(0, sliceY, width, 6);
    ctx.restore();
  }
};

export const SkiaCRTGlitchShudderEffect: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    const timePhase = state.timePhase;
    const isGlitching = Math.sin(timePhase * 17) > 0.85;

    if (!isGlitching) return;

    const skCanvas = canvas as unknown as SkiaCanvasOps;
    skCanvas.save();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.neonCyan));
    paint.setAlphaf(0.15);
    const sliceY = (Math.sin(timePhase * 31) * 0.5 + 0.5) * height;
    skCanvas.drawRect(Skia.XYWHRect(0, sliceY, width, 6), paint);
    skCanvas.restore();
  }
};

// -------------------------------------------------------------
// 7. ThrusterPlumeFlameEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ThrusterPlumeFlameEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const dCtx = getDrawerContext(world, entity, 10);
    if (!dCtx) return;

    const { size, timePhase } = dCtx;
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

export const SkiaThrusterPlumeFlameEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    const dCtx = getDrawerContext(world, entity, 10, true);
    if (!dCtx) return;

    const { size, timePhase } = dCtx;
    const { plumeLength } = computeThrusterPlume(timePhase, size);
    const flameColors = getThrusterFlameColors();
    const glowStyle = getGlowStyle(flameColors.inner, "normal");

    const skCanvas = canvas as unknown as SkiaCanvasOps;
    skCanvas.save();
    renderSkiaGlow(skCanvas, glowStyle, (paint, isHighlight) => {
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
      skCanvas.drawPath(pathOuter, paint);
    });

    const paintInner = Skia.Paint();
    paintInner.setColor(Skia.Color(flameColors.core));
    paintInner.setAlphaf(0.85);
    const pathInner = Skia.Path.Make();
    pathInner.moveTo(-size / 3, 0);
    pathInner.lineTo(size / 3, 0);
    pathInner.lineTo(0, plumeLength * 0.65);
    pathInner.close();
    skCanvas.drawPath(pathInner, paintInner);

    skCanvas.restore();
  }
};

// -------------------------------------------------------------
// 8. LaserRailBeamEffect (Canvas & Skia)
// -------------------------------------------------------------
export const LaserRailBeamEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const dCtx = getDrawerContext(world, entity, 300);
    if (!dCtx) return;

    const { size: length, timePhase } = dCtx;
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

export const SkiaLaserRailBeamEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    const dCtx = getDrawerContext(world, entity, 300, true);
    if (!dCtx) return;

    const { size: length, timePhase } = dCtx;
    const glowStyle = getGlowStyle(COSMIC_ARCADE_PALETTE.neonCyan, "strong");

    const skCanvas = canvas as unknown as SkiaCanvasOps;
    skCanvas.save();
    renderSkiaGlow(skCanvas, glowStyle, (paint, isHighlight) => {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(isHighlight ? 3 : 8 + 2 * Math.sin(timePhase * 6));
      skCanvas.drawLine(0, 0, 0, -length, paint);
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
    skCanvas.drawPath(path, sparkPaint);

    skCanvas.restore();
  }
};

// -------------------------------------------------------------
// 9. ScreenBorderGlowEffect (Canvas & Skia)
// -------------------------------------------------------------
export function drawScreenBorderGlow(adapter: IDrawAdapter, world: World<CoreComponentRegistry>): void {
  const { width, height, state } = getScreenAndVFXState(world);
  const timePhase = state.timePhase;
  const alpha = 0.12 + 0.08 * Math.sin(timePhase * 3);

  adapter.save();
  adapter.strokeRect(7, 7, width - 14, height - 14, COSMIC_ARCADE_PALETTE.dangerRed, 14, alpha);
  adapter.restore();
}

export const ScreenBorderGlowEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    drawScreenBorderGlow(new CanvasDrawAdapter(ctx), world);
  }
};

export const SkiaScreenBorderGlowEffect: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world) {
    if (!Skia) return;
    drawScreenBorderGlow(new SkiaDrawAdapter(canvas), world);
  }
};

// -------------------------------------------------------------
// 10. SingularityVortexEffect (Canvas & Skia)
// -------------------------------------------------------------
function resolveVortexContext(world: World<CoreComponentRegistry>, entity: Entity) {
  const render = getRenderComponent(world, entity);
  if (!render) return null;

  const baseSize = render.size || 30;
  const state = getVFXState(world);

  if (!state.vortexInitialized) {
    initializeVortex(world, state);
  }
  return { baseSize, state };
}

export function drawSingularityVortex(adapter: IDrawAdapter, world: World<CoreComponentRegistry>, entity: Entity): void {
  const vCtx = resolveVortexContext(world, entity);
  if (!vCtx) return;
  const { baseSize, state } = vCtx;

  adapter.save();
  for (let r = baseSize; r > 5; r -= 6) {
    adapter.strokeCircle(0, 0, r, COSMIC_ARCADE_PALETTE.nebulaPurple, 2, 0.3);
  }
  adapter.fillCircle(0, 0, baseSize * 0.4, COSMIC_ARCADE_PALETTE.voidBlack);

  for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
    const p = state.accretionParticles[i];
    updateAccretionParticle(p, baseSize, world.renderRandom);

    const x = Math.cos(p.angle) * p.radius;
    const y = Math.sin(p.angle) * p.radius;
    adapter.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size, COSMIC_ARCADE_PALETTE.neonMagenta);
  }
  adapter.restore();
}

export const SingularityVortexEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    drawSingularityVortex(new CanvasDrawAdapter(ctx), world, entity);
  }
};

export const SkiaSingularityVortexEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    if (!Skia) return;
    drawSingularityVortex(new SkiaDrawAdapter(canvas), world, entity);
  }
};

// -------------------------------------------------------------
// 11. CometMotionTrailEffect (ShapeDrawer)
// -------------------------------------------------------------
export function drawCometMotionTrail(adapter: IDrawAdapter, world: World<CoreComponentRegistry>, entity: Entity, isSkia: boolean = false): void {
  const dCtx = getDrawerContext(world, entity, 15, isSkia);
  if (!dCtx) return;

  const { size, timePhase } = dCtx;
  const trailParams = computeTrailParameters(1.0, 1.0, size);
  const segments = computeCometTrailSegments(timePhase, trailParams.scaledLength || size);

  adapter.save();
  adapter.drawGlow(trailParams.glowColor, (glowAdapter) => {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      glowAdapter.strokeCircle(seg.wiggle, seg.offset, seg.radius, trailParams.glowColor, 1, seg.alpha);
    }
  });
  adapter.restore();
}

export function computeCometTrailSegments(timePhase: number, length: number): Array<{ wiggle: number; offset: number; radius: number; alpha: number }> {
  const segments: Array<{ wiggle: number; offset: number; radius: number; alpha: number }> = [];
  const count = 12;

  for (let i = 0; i < count; i++) {
    const ratio = i / count;
    const offset = ratio * length;
    const wiggle = Math.sin(timePhase * 8 + ratio * 6) * (2 + ratio * 4);
    const radius = Math.max(1, (1.0 - ratio) * 4);
    const alpha = (1.0 - ratio) * 0.8;

    segments.push({ wiggle, offset, radius, alpha });
  }
  return segments;
}

export const CometMotionTrailEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    drawCometMotionTrail(new CanvasDrawAdapter(ctx), world, entity, false);
  }
};

export const SkiaCometMotionTrailEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    if (!Skia) return;
    drawCometMotionTrail(new SkiaDrawAdapter(canvas), world, entity, true);
  }
};

// -------------------------------------------------------------
// 12. RGBHologramGlitchEffect (ShapeDrawer)
// -------------------------------------------------------------
export function drawRGBHologramGlitch(adapter: IDrawAdapter, world: World<CoreComponentRegistry>, entity: Entity, isSkia: boolean = false): void {
  const dCtx = getDrawerContext(world, entity, 20, isSkia);
  if (!dCtx) return;

  const { size, timePhase } = dCtx;
  const layers = computeHologramLayers(timePhase, size);

  adapter.save();
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    adapter.strokeCircle(layer.x, 0, layer.radius, layer.color, 2, layer.alpha);
  }
  adapter.restore();
}

export const RGBHologramGlitchEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    drawRGBHologramGlitch(new CanvasDrawAdapter(ctx), world, entity, false);
  }
};

export const SkiaRGBHologramGlitchEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    if (!Skia) return;
    drawRGBHologramGlitch(new SkiaDrawAdapter(canvas), world, entity, true);
  }
};

// -------------------------------------------------------------
// 13. FloatingTextScoreEffect (ShapeDrawer)
// -------------------------------------------------------------
export function drawFloatingTextScore(adapter: IDrawAdapter, world: World<CoreComponentRegistry>, entity: Entity): void {
  const effect = prepareEffectRender(world, entity);
  if (!effect) return;

  const { progress, alpha } = effect;
  const label = (entity as { text?: string }).text || "+100";
  const offsetY = -progress * 50;

  adapter.save();
  adapter.drawText(label, 0, offsetY, COSMIC_ARCADE_PALETTE.plasmaYellow, alpha, 14);
  adapter.restore();
}

export const FloatingTextScoreEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    drawFloatingTextScore(new CanvasDrawAdapter(ctx), world, entity);
  }
};

export const SkiaFloatingTextScoreEffect: ShapeDrawer<RenderContext, CoreComponentRegistry> = {
  draw(canvas: RenderContext, world, entity) {
    if (!Skia) return;
    drawFloatingTextScore(new SkiaDrawAdapter(canvas), world, entity);
  }
};