import { World, EffectDrawer, ShapeDrawer, ComponentRegistry, RenderComponent, TTLComponent, Renderer, RendererUtils } from "@tiny-aster/core";
import { Skia } from "./SkiaContext";
import { computeAsteroidSilhouette } from "./ProceduralShapeUtils";
import { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor } from "./CosmicPalette";
import { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow } from "./GlowSystem";
import { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate } from "./ParallaxSystem";
import { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState } from "./ExplosionSystem";
import { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme } from "./CelestialBodiesSystem";
import { MotionTrailParams, computeTrailParameters, getThrusterFlameColors } from "./MotionTrailSystem";
import { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme } from "./LevelThemeSystem";

export { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor };
export { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow };
export { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate };
export { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState };
export { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme };
export { MotionTrailParams, computeTrailParameters, getThrusterFlameColors };
export { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme };

/**
 * Returns screen dimensions and state for VFX drawers.
 * @public
 */
export function getScreenAndVFXState(world: World<any>): {
  width: number;
  height: number;
  state: VFXWorldState;
} {
  const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
  const state = getVFXState(world);
  return {
    width: screen.width,
    height: screen.height,
    state
  };
}

/**
 * Reads width and height from a Canvas Rendering Context safely.
 * @public
 */
export function readCanvasSize(ctx: CanvasRenderingContext2D): { width: number; height: number } {
  return {
    width: ctx.canvas ? ctx.canvas.width : 800,
    height: ctx.canvas ? ctx.canvas.height : 600
  };
}

// -------------------------------------------------------------
// Constants
// -------------------------------------------------------------
const STAR_COUNT = 80;
const WARP_LINE_COUNT = 45;
const NEBULA_CLOUD_COUNT = 4;
const MATRIX_COLUMN_COUNT = 30;
const ACCRETION_PARTICLE_COUNT = 15;
const TRAIL_LENGTH = 10;
const DISTANT_ASTEROID_COUNT = 12;
const MILKY_WAY_DUST_PARTICLE_COUNT = 25;

// -------------------------------------------------------------
// VFX World State Isolation & Structures
// -------------------------------------------------------------
interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  skColor?: any;
}

interface SpeedLine {
  angle: number;
  radius: number;
  length: number;
  speed: number;
  color: string;
  skColor?: any;
}

interface NebulaCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  skColor?: any;
}

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  intensity: number;
}

interface AccretionParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface MilkyWayDustParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  skColor?: any;
}

interface MilkyWayBandState {
  angle: number;
  particles: MilkyWayDustParticle[];
}

interface RingingPlanetState {
  x: number;
  y: number;
  radius: number;
  ringInnerRadius: number;
  ringOuterRadius: number;
  ringTilt: number;
  craters: { x: number; y: number; radius: number }[];
  moonX: number;
  moonY: number;
  moonRadius: number;
  moonCraters: { x: number; y: number; radius: number }[];
}

interface DistantAsteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  points: { x: number; y: number }[];
  color: string;
  skColor?: any;
  skPath?: any;
}

interface SpaceStationBeacon {
  x: number;
  y: number;
  color: string;
  skColor?: any;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface SpaceStationState {
  x: number;
  y: number;
  rotation: number;
  rotationSpeed: number;
  coreRadius: number;
  ringRadius: number;
  panelLength: number;
  panelWidth: number;
  beacons: SpaceStationBeacon[];
}

interface VFXWorldState {
  stars: Star[];
  lines: SpeedLine[];
  nebulae: NebulaCloud[];
  matrixColumns: MatrixColumn[];
  accretionParticles: AccretionParticle[];
  trailPoints: TrailPoint[];
  distantAsteroids: DistantAsteroid[];
  planet?: RingingPlanetState;
  milkyWay?: MilkyWayBandState;
  station?: SpaceStationState;
  starsInitialized: boolean;
  warpLinesInitialized: boolean;
  nebulaeInitialized: boolean;
  matrixInitialized: boolean;
  vortexInitialized: boolean;
  trailInitialized: boolean;
  planetInitialized: boolean;
  distantAsteroidsInitialized: boolean;
  milkyWayInitialized: boolean;
  stationInitialized: boolean;
  timePhase: number; // Incremented exactly once per render tick to be entity-independent
  cachedCRTGradient?: any; // Cached CanvasRadialGradient
  cachedSkiaShader?: any; // Cached Skia Shader
  cachedPlanetGradient?: any; // Cached CanvasRadialGradient for Ringing Planet
  cachedPlanetSkiaShader?: any; // Cached Skia Shader for Ringing Planet
  cachedRingGradient?: any; // Cached CanvasLinearGradient for Planet Rings
  cachedRingSkiaShader?: any; // Cached Skia Shader for Planet Rings
  cachedMilkyWayGradient?: any; // Cached CanvasLinearGradient for Diffuse Milky Way
  cachedMilkyWaySkiaShader?: any; // Cached Skia Shader for Diffuse Milky Way
  cachedStationGradient?: any; // Cached CanvasRadialGradient for Space Station Hub
  cachedStationSkiaShader?: any; // Cached Skia Shader for Space Station Hub
  lastWidth: number;
  lastHeight: number;
  lastCRTWidth?: number;
  lastCRTHeight?: number;
}

const worldStateMap = new WeakMap<World<any>, VFXWorldState>();

function getVFXState(world: World<any>): VFXWorldState {
  let state = worldStateMap.get(world);
  if (!state) {
    state = {
      stars: [],
      lines: [],
      nebulae: [],
      matrixColumns: [],
      accretionParticles: [],
      trailPoints: [],
      distantAsteroids: [],
      starsInitialized: false,
      warpLinesInitialized: false,
      nebulaeInitialized: false,
      matrixInitialized: false,
      vortexInitialized: false,
      trailInitialized: false,
      planetInitialized: false,
      distantAsteroidsInitialized: false,
      milkyWayInitialized: false,
      stationInitialized: false,
      timePhase: 0,
      lastWidth: 0,
      lastHeight: 0
    };
    worldStateMap.set(world, state);
  }
  return state;
}

// -------------------------------------------------------------
// Cache Helpers
// -------------------------------------------------------------
type CachedVFXKey =
  | "cachedCRTGradient"
  | "cachedSkiaShader"
  | "cachedPlanetGradient"
  | "cachedPlanetSkiaShader"
  | "cachedRingGradient"
  | "cachedRingSkiaShader"
  | "cachedMilkyWayGradient"
  | "cachedMilkyWaySkiaShader"
  | "cachedStationGradient"
  | "cachedStationSkiaShader";

function getOrCreateCached<T>(
  state: VFXWorldState,
  cacheKey: CachedVFXKey,
  width: number,
  height: number,
  create: () => T
): T {
  if (!state[cacheKey] || state.lastCRTWidth !== width || state.lastCRTHeight !== height) {
    state[cacheKey] = create();
    state.lastCRTWidth = width;
    state.lastCRTHeight = height;
  }
  return state[cacheKey] as T;
}

// -------------------------------------------------------------
// Pure Calculation Helpers
// -------------------------------------------------------------
function computeHologramLayers(timePhase: number, size: number) {
  const glitchOffset = 2 + 1.5 * Math.sin(timePhase * 10);
  return [
    { x: -glitchOffset, radius: size, color: "#00ffff", alpha: 0.4 },
    { x: glitchOffset, radius: size, color: "#ff00ff", alpha: 0.4 },
    { x: 0, radius: size * 0.9, color: "#ffffff", alpha: 0.9 }
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

function computeEffectProgress(world: World<any>, entity: any): { progress: number; alpha: number } {
  const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
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
  const flicker = 1.0 + 0.15 * Math.sin(timePhase * 5);
  const plumeLength = size * 2.2 * flicker;
  return { plumeLength };
}

// -------------------------------------------------------------
// Initializers
// -------------------------------------------------------------
function pickColor(rng: any, colors: string[]): { color: string; skColor: any } {
  const color = colors[rng.nextInt(0, colors.length)];
  return { color, skColor: Skia ? Skia.Color(color) : null };
}

function initializeStars(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const colors = [
    COSMIC_ARCADE_PALETTE.white,
    COSMIC_ARCADE_PALETTE.iceBlue,
    COSMIC_ARCADE_PALETTE.plasmaYellow,
    COSMIC_ARCADE_PALETTE.mutedBlue
  ];

  state.stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const { color, skColor } = pickColor(rng, colors);
    state.stars.push({
      x: rng.nextRange(0, 800),
      y: rng.nextRange(0, 600),
      speed: rng.nextRange(0.2, 1.2),
      size: rng.nextRange(1.0, 2.5),
      twinklePhase: rng.nextRange(0, Math.PI * 2),
      twinkleSpeed: rng.nextRange(0.02, 0.08),
      color,
      skColor
    });
  }
  state.starsInitialized = true;
}

function initializeLines(world: World<any>, state: VFXWorldState, maxRadius: number) {
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

function initializeNebulae(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const colors = [
    COSMIC_ARCADE_PALETTE.nebulaPurple,
    COSMIC_ARCADE_PALETTE.electricIndigo,
    COSMIC_ARCADE_PALETTE.cosmicNavy,
    COSMIC_ARCADE_PALETTE.deepSpace
  ];

  state.nebulae = [];
  for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
    const color = colors[i % colors.length];
    state.nebulae.push({
      x: rng.nextRange(50, 750),
      y: rng.nextRange(50, 550),
      vx: rng.nextRange(-0.05, 0.05),
      vy: rng.nextRange(-0.05, 0.05),
      radius: rng.nextRange(100, 220),
      color,
      skColor: Skia ? Skia.Color(color) : null
    });
  }
  state.nebulaeInitialized = true;
}

function initializeMatrix(world: World<any>, state: VFXWorldState) {
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

function initializeVortex(world: World<any>, state: VFXWorldState) {
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

function initializeMilkyWay(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const angle = rng.nextRange(-0.4, -0.2);
  const colors = [
    COSMIC_ARCADE_PALETTE.white,
    COSMIC_ARCADE_PALETTE.iceBlue,
    COSMIC_ARCADE_PALETTE.electricIndigo,
    COSMIC_ARCADE_PALETTE.neonMagenta,
    COSMIC_ARCADE_PALETTE.neonCyan
  ];

  const particles: MilkyWayDustParticle[] = [];
  for (let i = 0; i < MILKY_WAY_DUST_PARTICLE_COUNT; i++) {
    const { color, skColor } = pickColor(rng, colors);
    particles.push({
      x: rng.nextRange(-200, 1000),
      y: rng.nextRange(-80, 80),
      size: rng.nextRange(1.0, 2.8),
      alpha: rng.nextRange(0.3, 0.8),
      twinklePhase: rng.nextRange(0, Math.PI * 2),
      twinkleSpeed: rng.nextRange(0.01, 0.05),
      color,
      skColor
    });
  }

  state.milkyWay = {
    angle,
    particles
  };
  state.milkyWayInitialized = true;
}

function initializeRingingPlanet(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const planetX = rng.nextRange(550, 680);
  const planetY = rng.nextRange(120, 220);
  const radius = rng.nextRange(50, 75);

  const craters: { x: number; y: number; radius: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = rng.nextRange(0, Math.PI * 2);
    const dist = rng.nextRange(0.1, 0.7) * radius;
    craters.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      radius: rng.nextRange(0.12, 0.22) * radius
    });
  }

  const moonAngle = rng.nextRange(-Math.PI * 0.25, Math.PI * 0.25);
  const moonDist = radius * rng.nextRange(2.2, 2.8);
  const moonRadius = radius * rng.nextRange(0.22, 0.32);
  const moonX = planetX + Math.cos(moonAngle) * moonDist;
  const moonY = planetY + Math.sin(moonAngle) * moonDist;

  const moonCraters: { x: number; y: number; radius: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = rng.nextRange(0, Math.PI * 2);
    const dist = rng.nextRange(0.1, 0.6) * moonRadius;
    moonCraters.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      radius: rng.nextRange(0.15, 0.3) * moonRadius
    });
  }

  state.planet = {
    x: planetX,
    y: planetY,
    radius,
    ringInnerRadius: radius * 1.3,
    ringOuterRadius: radius * 2.1,
    ringTilt: -0.35,
    craters,
    moonX,
    moonY,
    moonRadius,
    moonCraters
  };
  state.planetInitialized = true;
}

function initializeDistantAsteroids(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const colors = [
    COSMIC_ARCADE_PALETTE.cosmicNavy,
    COSMIC_ARCADE_PALETTE.electricIndigo,
    COSMIC_ARCADE_PALETTE.mutedPurple,
    COSMIC_ARCADE_PALETTE.mutedBlue
  ];

  state.distantAsteroids = [];
  for (let i = 0; i < DISTANT_ASTEROID_COUNT; i++) {
    const { color, skColor } = pickColor(rng, colors);
    const radius = rng.nextRange(8, 22);
    const seed = rng.nextInt(0, 100000);
    const points = computeAsteroidSilhouette(seed, radius, 9);

    let skPath: any = null;
    if (Skia && points.length > 0) {
      skPath = Skia.Path.Make();
      skPath.moveTo(points[0].x, points[0].y);
      for (let p = 1; p < points.length; p++) {
        skPath.lineTo(points[p].x, points[p].y);
      }
      skPath.close();
    }

    state.distantAsteroids.push({
      x: rng.nextRange(0, 800),
      y: rng.nextRange(0, 600),
      vx: rng.nextRange(-0.25, -0.05),
      vy: rng.nextRange(-0.08, 0.08),
      radius,
      rotation: rng.nextRange(0, Math.PI * 2),
      angularVelocity: rng.nextRange(-0.01, 0.01),
      points,
      color,
      skColor,
      skPath
    });
  }
  state.distantAsteroidsInitialized = true;
}

function initializeSpaceStation(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const x = rng.nextRange(150, 280);
  const y = rng.nextRange(100, 200);
  const rotation = rng.nextRange(0, Math.PI * 2);
  const rotationSpeed = rng.nextRange(0.001, 0.003);
  const coreRadius = rng.nextRange(12, 18);
  const ringRadius = coreRadius * rng.nextRange(2.2, 2.8);
  const panelLength = ringRadius * rng.nextRange(1.8, 2.4);
  const panelWidth = rng.nextRange(6, 10);

  const beaconColors = [
    COSMIC_ARCADE_PALETTE.dangerRed,
    COSMIC_ARCADE_PALETTE.neonCyan,
    COSMIC_ARCADE_PALETTE.solarOrange,
    COSMIC_ARCADE_PALETTE.neonMagenta
  ];
  const beacons: SpaceStationBeacon[] = [];

  const beaconPositions = [
    { x: -panelLength, y: 0 },
    { x: panelLength, y: 0 },
    { x: 0, y: -ringRadius },
    { x: 0, y: ringRadius },
    { x: -ringRadius, y: 0 },
    { x: ringRadius, y: 0 }
  ];

  for (let i = 0; i < beaconPositions.length; i++) {
    const { color, skColor } = pickColor(rng, beaconColors);
    beacons.push({
      x: beaconPositions[i].x,
      y: beaconPositions[i].y,
      color,
      skColor,
      twinklePhase: rng.nextRange(0, Math.PI * 2),
      twinkleSpeed: rng.nextRange(0.04, 0.09)
    });
  }

  state.station = {
    x,
    y,
    rotation,
    rotationSpeed,
    coreRadius,
    ringRadius,
    panelLength,
    panelWidth,
    beacons
  };
  state.stationInitialized = true;
}

// =============================================================
// I. ORIGINAL 5 EFFECTS (CANVAS & SKIA)
// =============================================================

// -------------------------------------------------------------
// 1. RetroCRTScanlinesEffect (Canvas & Skia)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:372-378. Considerar extraer a función compartida. Ref: feb356c0
export const RetroCRTScanlinesEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:277-283. Considerar extraer a función compartida. Ref: 2cbbd41e
    const { width, height, state } = getScreenAndVFXState(world);

    state.timePhase += 0.04;

    ctx.save();

    // 1. Scanline overlay
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }

    // 2. Radial vignette gradient caching
    const gradient = getOrCreateCached(state, "cachedCRTGradient", width, height, () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      const grad = ctx.createRadialGradient(
        centerX, centerY, maxRadius * 0.4,
        centerX, centerY, maxRadius
      );
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.6)");
      return grad;
    });

    ctx.fillStyle = gradient;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, width, height);

    // 3. Phosphor flickering
    const randomFlicker = world.renderRandom.next();
    if (randomFlicker > 0.95) {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.005 + (randomFlicker - 0.95) * 0.15;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
};

export const SkiaRetroCRTScanlinesEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:223-229. Considerar extraer a función compartida. Ref: a687d1d0
    const { width, height, state } = getScreenAndVFXState(world);

    state.timePhase += 0.04;

    canvas.save();

    const paint = Skia.Paint();

    paint.setColor(Skia.Color("#000000"));
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
        [Skia.Color("rgba(0,0,0,0)"), Skia.Color("rgba(0,0,0,0.6)")],
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
      flickerPaint.setColor(Skia.Color("#ffffff"));
      flickerPaint.setAlphaf(0.005 + (randomFlicker - 0.95) * 0.15);
      canvas.drawRect(Skia.XYWHRect(0, 0, width, height), flickerPaint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 18. DiffuseMilkyWayBackgroundEffect (Canvas & Skia)
// -------------------------------------------------------------
export const DiffuseMilkyWayBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.milkyWayInitialized) {
      initializeMilkyWay(world, state);
    }
    const milkyWay = state.milkyWay;
    if (!milkyWay) return;

    ctx.save();

    const centerX = width / 2;
    const centerY = height / 2;
    const bandHeight = 220;

    ctx.translate(centerX, centerY);
    ctx.rotate(milkyWay.angle);

    // Reuse/cache radial/linear gradient across frame iterations via getOrCreateCached helper
    const gradient = getOrCreateCached(state, "cachedMilkyWayGradient", width, height, () => {
      const grad = ctx.createLinearGradient(0, -bandHeight / 2, 0, bandHeight / 2);
      grad.addColorStop(0, "rgba(80, 40, 120, 0)");
      grad.addColorStop(0.2, "rgba(90, 50, 140, 0.08)");
      grad.addColorStop(0.5, "rgba(140, 90, 190, 0.18)");
      grad.addColorStop(0.8, "rgba(90, 50, 140, 0.08)");
      grad.addColorStop(1, "rgba(80, 40, 120, 0)");
      return grad;
    });

    // Soft galactic dust band glow
    ctx.fillStyle = gradient;
    ctx.fillRect(-width, -bandHeight / 2, width * 2, bandHeight);

    // Inner bright core stream
    ctx.fillStyle = "rgba(220, 200, 255, 0.05)";
    ctx.fillRect(-width, -bandHeight * 0.15, width * 2, bandHeight * 0.3);

    // Embedded star dust particles along galactic plane
    for (let i = 0; i < milkyWay.particles.length; i++) {
      const p = milkyWay.particles[i];
      p.twinklePhase += p.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * twinkle;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.restore();
  }
};

export const SkiaDiffuseMilkyWayBackgroundEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.milkyWayInitialized) {
      initializeMilkyWay(world, state);
    }
    const milkyWay = state.milkyWay;
    if (!milkyWay) return;

    canvas.save();

    const centerX = width / 2;
    const centerY = height / 2;
    const bandHeight = 220;

    canvas.translate(centerX, centerY);
    canvas.rotate((milkyWay.angle * 180) / Math.PI, 0, 0);

    const shader = getOrCreateCached(state, "cachedMilkyWaySkiaShader", width, height, () => {
      return Skia.Shader.MakeLinearGradient(
        Skia.Point(0, -bandHeight / 2),
        Skia.Point(0, bandHeight / 2),
        [
          Skia.Color("rgba(80, 40, 120, 0)"),
          Skia.Color("rgba(90, 50, 140, 0.08)"),
          Skia.Color("rgba(140, 90, 190, 0.18)"),
          Skia.Color("rgba(90, 50, 140, 0.08)"),
          Skia.Color("rgba(80, 40, 120, 0)")
        ],
        [0.0, 0.2, 0.5, 0.8, 1.0],
        Skia.TileMode.Clamp
      );
    });

    const bandPaint = Skia.Paint();
    bandPaint.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(-width, -bandHeight / 2, width * 2, bandHeight), bandPaint);

    // Inner bright core stream
    const corePaint = Skia.Paint();
    corePaint.setColor(Skia.Color("rgba(220, 200, 255, 0.05)"));
    canvas.drawRect(Skia.XYWHRect(-width, -bandHeight * 0.15, width * 2, bandHeight * 0.3), corePaint);

    // Embedded star dust particles
    const particlePaint = Skia.Paint();
    for (let i = 0; i < milkyWay.particles.length; i++) {
      const p = milkyWay.particles[i];
      p.twinklePhase += p.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);

      particlePaint.setColor(p.skColor || Skia.Color("#ffffff"));
      particlePaint.setAlphaf(p.alpha * twinkle);
      canvas.drawRect(
        Skia.XYWHRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size),
        particlePaint
      );
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 17. DistantAsteroidBeltBackgroundEffect (Canvas & Skia)
// -------------------------------------------------------------
export const DistantAsteroidBeltBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.distantAsteroidsInitialized) {
      initializeDistantAsteroids(world, state);
    }

    ctx.save();

    for (let i = 0; i < state.distantAsteroids.length; i++) {
      const ast = state.distantAsteroids[i];
      ast.x += ast.vx;
      ast.y += ast.vy;
      ast.rotation += ast.angularVelocity;

      if (ast.x < -ast.radius * 2) ast.x = width + ast.radius * 2;
      if (ast.x > width + ast.radius * 2) ast.x = -ast.radius * 2;
      if (ast.y < -ast.radius * 2) ast.y = height + ast.radius * 2;
      if (ast.y > height + ast.radius * 2) ast.y = -ast.radius * 2;

      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.rotation);

      ctx.fillStyle = ast.color;
      ctx.strokeStyle = "#8d99ae";
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (ast.points.length > 0) {
        ctx.moveTo(ast.points[0].x, ast.points[0].y);
        for (let p = 1; p < ast.points.length; p++) {
          ctx.lineTo(ast.points[p].x, ast.points[p].y);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
};

export const SkiaDistantAsteroidBeltBackgroundEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.distantAsteroidsInitialized) {
      initializeDistantAsteroids(world, state);
    }

    canvas.save();

    const fillPaint = Skia.Paint();
    fillPaint.setAlphaf(0.35);

    const strokePaint = Skia.Paint();
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setColor(Skia.Color("#8d99ae"));
    strokePaint.setAlphaf(0.35);
    strokePaint.setStrokeWidth(1);

    for (let i = 0; i < state.distantAsteroids.length; i++) {
      const ast = state.distantAsteroids[i];
      ast.x += ast.vx;
      ast.y += ast.vy;
      ast.rotation += ast.angularVelocity;

      if (ast.x < -ast.radius * 2) ast.x = width + ast.radius * 2;
      if (ast.x > width + ast.radius * 2) ast.x = -ast.radius * 2;
      if (ast.y < -ast.radius * 2) ast.y = height + ast.radius * 2;
      if (ast.y > height + ast.radius * 2) ast.y = -ast.radius * 2;

      canvas.save();
      canvas.translate(ast.x, ast.y);
      canvas.rotate((ast.rotation * 180) / Math.PI, 0, 0);

      fillPaint.setColor(ast.skColor || Skia.Color("#4a4e69"));
      fillPaint.setAlphaf(0.35);

      if (ast.skPath) {
        canvas.drawPath(ast.skPath, fillPaint);
        canvas.drawPath(ast.skPath, strokePaint);
      }

      canvas.restore();
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 19. DistantSpaceStationBackgroundEffect (Canvas & Skia)
// -------------------------------------------------------------
export const DistantSpaceStationBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.stationInitialized) {
      initializeSpaceStation(world, state);
    }
    const st = state.station;
    if (!st) return;

    st.rotation += st.rotationSpeed;

    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rotation);

    // Solar panel arrays (horizontal truss extensions)
    ctx.fillStyle = "#1b263b";
    ctx.strokeStyle = "#415a77";
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;

    ctx.fillRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth);
    ctx.strokeRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth);

    // Solar grid division lines
    ctx.strokeStyle = "#778da9";
    ctx.globalAlpha = 0.35;
    for (let x = -st.panelLength + 6; x < st.panelLength; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, -st.panelWidth / 2);
      ctx.lineTo(x, st.panelWidth / 2);
      ctx.stroke();
    }

    // Outer Rotating Hab Ring
    ctx.strokeStyle = "#8d99ae";
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, st.ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Structural spoke struts
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(-st.ringRadius, 0);
    ctx.lineTo(st.ringRadius, 0);
    ctx.moveTo(0, -st.ringRadius);
    ctx.lineTo(0, st.ringRadius);
    ctx.stroke();

    // Central Core Hub Gradient Caching
    const hubGrad = getOrCreateCached(state, "cachedStationGradient", width, height, () => {
      const grad = ctx.createRadialGradient(
        -st.coreRadius * 0.2, -st.coreRadius * 0.2, 1,
        0, 0, st.coreRadius
      );
      grad.addColorStop(0, "#e0e1dd");
      grad.addColorStop(0.5, "#778da9");
      grad.addColorStop(1, "#0d1b2a");
      return grad;
    });

    ctx.fillStyle = hubGrad;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, st.coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner core viewport ring
    ctx.strokeStyle = "#00f0ff";
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, st.coreRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Blinking Warning Beacons
    for (let i = 0; i < st.beacons.length; i++) {
      const b = st.beacons[i];
      b.twinklePhase += b.twinkleSpeed;
      const pulse = 0.3 + 0.7 * Math.sin(b.twinklePhase);

      ctx.fillStyle = b.color;
      ctx.globalAlpha = pulse;

      // Glow aura
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Core point
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = Math.min(1.0, pulse * 1.2);
      ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    }

    ctx.restore();
  }
};

export const SkiaDistantSpaceStationBackgroundEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.stationInitialized) {
      initializeSpaceStation(world, state);
    }
    const st = state.station;
    if (!st) return;

    st.rotation += st.rotationSpeed;

    canvas.save();
    canvas.translate(st.x, st.y);
    canvas.rotate((st.rotation * 180) / Math.PI, 0, 0);

    // Solar panel arrays
    const panelPaint = Skia.Paint();
    panelPaint.setColor(Skia.Color("#1b263b"));
    panelPaint.setAlphaf(0.6);
    canvas.drawRect(
      Skia.XYWHRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth),
      panelPaint
    );

    const panelStrokePaint = Skia.Paint();
    panelStrokePaint.setStyle(Skia.PaintStyle.Stroke);
    panelStrokePaint.setStrokeWidth(1);
    panelStrokePaint.setColor(Skia.Color("#415a77"));
    panelStrokePaint.setAlphaf(0.6);
    canvas.drawRect(
      Skia.XYWHRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth),
      panelStrokePaint
    );

    // Solar grid division lines
    const gridPaint = Skia.Paint();
    gridPaint.setStyle(Skia.PaintStyle.Stroke);
    gridPaint.setStrokeWidth(1);
    gridPaint.setColor(Skia.Color("#778da9"));
    gridPaint.setAlphaf(0.35);
    for (let x = -st.panelLength + 6; x < st.panelLength; x += 8) {
      canvas.drawLine(x, -st.panelWidth / 2, x, st.panelWidth / 2, gridPaint);
    }

    // Outer Rotating Hab Ring
    const ringPaint = Skia.Paint();
    ringPaint.setStyle(Skia.PaintStyle.Stroke);
    ringPaint.setStrokeWidth(2.5);
    ringPaint.setColor(Skia.Color("#8d99ae"));
    ringPaint.setAlphaf(0.55);
    canvas.drawCircle(0, 0, st.ringRadius, ringPaint);

    // Structural spoke struts
    const spokePaint = Skia.Paint();
    spokePaint.setStyle(Skia.PaintStyle.Stroke);
    spokePaint.setStrokeWidth(1);
    spokePaint.setColor(Skia.Color("#8d99ae"));
    spokePaint.setAlphaf(0.4);
    canvas.drawLine(-st.ringRadius, 0, st.ringRadius, 0, spokePaint);
    canvas.drawLine(0, -st.ringRadius, 0, st.ringRadius, spokePaint);

    // Central Core Hub Gradient Caching
    const hubShader = getOrCreateCached(state, "cachedStationSkiaShader", width, height, () => {
      return Skia.Shader.MakeRadialGradient(
        Skia.Point(-st.coreRadius * 0.2, -st.coreRadius * 0.2),
        st.coreRadius,
        [Skia.Color("#e0e1dd"), Skia.Color("#778da9"), Skia.Color("#0d1b2a")],
        [0.0, 0.5, 1.0],
        Skia.TileMode.Clamp
      );
    });

    const hubPaint = Skia.Paint();
    hubPaint.setShader(hubShader);
    hubPaint.setAlphaf(0.85);
    canvas.drawCircle(0, 0, st.coreRadius, hubPaint);

    // Inner core viewport ring
    const viewportPaint = Skia.Paint();
    viewportPaint.setStyle(Skia.PaintStyle.Stroke);
    viewportPaint.setStrokeWidth(1);
    viewportPaint.setColor(Skia.Color("#00f0ff"));
    viewportPaint.setAlphaf(0.7);
    canvas.drawCircle(0, 0, st.coreRadius * 0.5, viewportPaint);

    // Blinking Warning Beacons
    const beaconPaint = Skia.Paint();
    const beaconCorePaint = Skia.Paint();
    beaconCorePaint.setColor(Skia.Color("#ffffff"));

    for (let i = 0; i < st.beacons.length; i++) {
      const b = st.beacons[i];
      b.twinklePhase += b.twinkleSpeed;
      const pulse = 0.3 + 0.7 * Math.sin(b.twinklePhase);

      beaconPaint.setColor(b.skColor || Skia.Color("#ff2a2a"));
      beaconPaint.setAlphaf(pulse);
      canvas.drawCircle(b.x, b.y, 3.5, beaconPaint);

      beaconCorePaint.setAlphaf(Math.min(1.0, pulse * 1.2));
      canvas.drawRect(Skia.XYWHRect(b.x - 1, b.y - 1, 2, 2), beaconCorePaint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 16. RingingPlanetBackgroundEffect (Canvas & Skia)
// -------------------------------------------------------------
export const RingingPlanetBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.planetInitialized) {
      initializeRingingPlanet(world, state);
    }
    const planet = state.planet;
    if (!planet) return;

    ctx.save();

    // 1. Back section of rings (drawn behind planet)
    ctx.save();
    ctx.translate(planet.x, planet.y);
    ctx.rotate(planet.ringTilt);
    ctx.scale(1.0, 0.32);

    ctx.strokeStyle = "#d4af37";
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = planet.ringOuterRadius - planet.ringInnerRadius;
    const midRingRadius = (planet.ringInnerRadius + planet.ringOuterRadius) / 2;

    ctx.beginPath();
    ctx.arc(0, 0, midRingRadius, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Planet body gradient caching using CelestialBodiesSystem
    const planetTheme = getPlanetTheme("purple");
    const planetGrad = getOrCreateCached(state, "cachedPlanetGradient", width, height, () => {
      const grad = ctx.createRadialGradient(
        -planet.radius * 0.3, -planet.radius * 0.3, planet.radius * 0.1,
        0, 0, planet.radius
      );
      grad.addColorStop(0, planetTheme.bodyGradient[0]);
      grad.addColorStop(0.5, planetTheme.bodyGradient[1]);
      grad.addColorStop(1, planetTheme.bodyGradient[2]);
      return grad;
    });

    ctx.save();
    ctx.translate(planet.x, planet.y);

    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
    ctx.fill();

    // Planet Craters
    ctx.fillStyle = "#261304";
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < planet.craters.length; i++) {
      const crater = planet.craters[i];
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Front section of rings (drawn over planet)
    ctx.save();
    ctx.translate(planet.x, planet.y);
    ctx.rotate(planet.ringTilt);
    ctx.scale(1.0, 0.32);

    ctx.strokeStyle = "#f3e5ab";
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = planet.ringOuterRadius - planet.ringInnerRadius;

    ctx.beginPath();
    ctx.arc(0, 0, midRingRadius, 0, Math.PI);
    ctx.stroke();

    // Ring shadow gap
    ctx.strokeStyle = "#1a0d03";
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = (planet.ringOuterRadius - planet.ringInnerRadius) * 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, midRingRadius * 0.96, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    // 4. Cratered Moon
    ctx.save();
    ctx.translate(planet.moonX, planet.moonY);

    ctx.fillStyle = "#8a8a8a";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, planet.moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Moon craters
    ctx.fillStyle = "#4a4a4a";
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < planet.moonCraters.length; i++) {
      const mc = planet.moonCraters[i];
      ctx.beginPath();
      ctx.arc(mc.x, mc.y, mc.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
};

export const SkiaRingingPlanetBackgroundEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    if (!state.planetInitialized) {
      initializeRingingPlanet(world, state);
    }
    const planet = state.planet;
    if (!planet) return;

    canvas.save();

    const midRingRadius = (planet.ringInnerRadius + planet.ringOuterRadius) / 2;
    const ringThickness = planet.ringOuterRadius - planet.ringInnerRadius;

    // 1. Back section of rings
    canvas.save();
    canvas.translate(planet.x, planet.y);
    canvas.rotate((planet.ringTilt * 180) / Math.PI, 0, 0);
    canvas.scale(1.0, 0.32);

    const backRingPaint = Skia.Paint();
    backRingPaint.setStyle(Skia.PaintStyle.Stroke);
    backRingPaint.setStrokeWidth(ringThickness);
    backRingPaint.setColor(Skia.Color("#d4af37"));
    backRingPaint.setAlphaf(0.35);

    const backRingPath = Skia.Path.Make();
    backRingPath.addArc(
      Skia.XYWHRect(-midRingRadius, -midRingRadius, midRingRadius * 2, midRingRadius * 2),
      180, 180
    );
    canvas.drawPath(backRingPath, backRingPaint);
    canvas.restore();

    // 2. Planet body
    canvas.save();
    canvas.translate(planet.x, planet.y);

    const planetShader = getOrCreateCached(state, "cachedPlanetSkiaShader", width, height, () => {
      return Skia.Shader.MakeRadialGradient(
        Skia.Point(-planet.radius * 0.3, -planet.radius * 0.3),
        planet.radius,
        [Skia.Color("#e6c280"), Skia.Color("#a66a38"), Skia.Color("#3b1e08")],
        [0.0, 0.5, 1.0],
        Skia.TileMode.Clamp
      );
    });

    const planetPaint = Skia.Paint();
    planetPaint.setShader(planetShader);
    canvas.drawCircle(0, 0, planet.radius, planetPaint);

    // Planet craters
    const craterPaint = Skia.Paint();
    craterPaint.setColor(Skia.Color("#261304"));
    craterPaint.setAlphaf(0.25);
    for (let i = 0; i < planet.craters.length; i++) {
      const crater = planet.craters[i];
      canvas.drawCircle(crater.x, crater.y, crater.radius, craterPaint);
    }
    canvas.restore();

    // 3. Front section of rings
    canvas.save();
    canvas.translate(planet.x, planet.y);
    canvas.rotate((planet.ringTilt * 180) / Math.PI, 0, 0);
    canvas.scale(1.0, 0.32);

    const frontRingPaint = Skia.Paint();
    frontRingPaint.setStyle(Skia.PaintStyle.Stroke);
    frontRingPaint.setStrokeWidth(ringThickness);
    frontRingPaint.setColor(Skia.Color("#f3e5ab"));
    frontRingPaint.setAlphaf(0.6);

    const frontRingPath = Skia.Path.Make();
    frontRingPath.addArc(
      Skia.XYWHRect(-midRingRadius, -midRingRadius, midRingRadius * 2, midRingRadius * 2),
      0, 180
    );
    canvas.drawPath(frontRingPath, frontRingPaint);

    // Ring shadow gap
    const gapPaint = Skia.Paint();
    gapPaint.setStyle(Skia.PaintStyle.Stroke);
    gapPaint.setStrokeWidth(ringThickness * 0.15);
    gapPaint.setColor(Skia.Color("#1a0d03"));
    gapPaint.setAlphaf(0.4);

    const gapPath = Skia.Path.Make();
    gapPath.addArc(
      Skia.XYWHRect(-midRingRadius * 0.96, -midRingRadius * 0.96, midRingRadius * 1.92, midRingRadius * 1.92),
      0, 180
    );
    canvas.drawPath(gapPath, gapPaint);
    canvas.restore();

    // 4. Cratered Moon
    canvas.save();
    canvas.translate(planet.moonX, planet.moonY);

    const moonPaint = Skia.Paint();
    moonPaint.setColor(Skia.Color("#8a8a8a"));
    moonPaint.setAlphaf(0.85);
    canvas.drawCircle(0, 0, planet.moonRadius, moonPaint);

    const moonCraterPaint = Skia.Paint();
    moonCraterPaint.setColor(Skia.Color("#4a4a4a"));
    moonCraterPaint.setAlphaf(0.5);
    for (let i = 0; i < planet.moonCraters.length; i++) {
      const mc = planet.moonCraters[i];
      canvas.drawCircle(mc.x, mc.y, mc.radius, moonCraterPaint);
    }
    canvas.restore();

    canvas.restore();
  }
};

/**
 * Registers all shared VFX shape drawers to a Renderer instance for both Canvas and Skia backends.
 */
export function registerSharedVFX(renderer: Renderer<any, any>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("shield_bubble", EnergyShieldBubbleEffect);
      r.registerShape("shockwave", DebrisShockwaveEffect);
      r.registerShape("thruster_flame", ThrusterPlumeFlameEffect);
      r.registerShape("laser_beam", LaserRailBeamEffect);
      r.registerShape("singularity", SingularityVortexEffect);
      r.registerShape("comet_trail", CometMotionTrailEffect);
      r.registerShape("hologram_glitch", RGBHologramGlitchEffect);
      r.registerShape("floating_text", FloatingTextScoreEffect);
    },
    skia: (r) => {
      r.registerShape("shield_bubble", SkiaEnergyShieldBubbleEffect);
      r.registerShape("shockwave", SkiaDebrisShockwaveEffect);
      r.registerShape("thruster_flame", SkiaThrusterPlumeFlameEffect);
      r.registerShape("laser_beam", SkiaLaserRailBeamEffect);
      r.registerShape("singularity", SkiaSingularityVortexEffect);
      r.registerShape("comet_trail", SkiaCometMotionTrailEffect);
      r.registerShape("hologram_glitch", SkiaRGBHologramGlitchEffect);
      r.registerShape("floating_text", SkiaFloatingTextScoreEffect);
    }
  });
}

/**
 * Shared particle creation helper for pooling and zero-allocation particle instantiation.
 * @public
 */
export function createSharedParticle(
  world: World<any, any, any>,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  pool: { acquire: (world: World<any, any, any>, params: any) => number },
  size = 3,
  ttl = 0.8
): number {
  return pool.acquire(world, { x, y, dx, dy, size, color, ttl });
}

// -------------------------------------------------------------
// 2. ScrollingStarfieldEffect (Canvas & Skia)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:222-228. Considerar extraer a función compartida. Ref: 2346d9f5
export const ScrollingStarfieldEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:404-410. Considerar extraer a función compartida. Ref: 5267edd1
    const { width, height, state } = getScreenAndVFXState(world);

    if (!state.starsInitialized) {
      initializeStars(world, state);
    }

    const { offsetX } = computeParallaxOffset(state.timePhase, 0, "layer2_distant_stars");

    ctx.save();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = state.stars[i];
      const posX = wrapParallaxCoordinate(star.x - star.speed - offsetX * 0.1, width);

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      ctx.fillStyle = star.color;
      ctx.fillRect(posX - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize);
    }

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:272-277. Considerar extraer a función compartida. Ref: 9309adbb
export const SkiaScrollingStarfieldEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);

    if (!state.starsInitialized) {
      initializeStars(world, state);
    }

    canvas.save();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:386-395. Considerar extraer a función compartida. Ref: f0187418
    const paint = Skia.Paint();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = state.stars[i];
      star.x -= star.speed;
      if (star.x < 0) star.x = width;

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      paint.setColor(star.skColor || Skia.Color("#ffffff"));
      canvas.drawRect(
        Skia.XYWHRect(star.x - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize),
        paint
      );
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 3. HyperdriveWarpSpeedLinesEffect (Canvas & Skia)
// -------------------------------------------------------------
export const HyperdriveWarpSpeedLinesEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:484-493. Considerar extraer a función compartida. Ref: d45cd223
    const { width, height, state } = getScreenAndVFXState(world);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    if (!state.warpLinesInitialized) {
      initializeLines(world, state, maxRadius);
    }

    ctx.save();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:498-514. Considerar extraer a función compartida. Ref: 29333365
    ctx.lineWidth = 1.5;

    for (let i = 0; i < WARP_LINE_COUNT; i++) {
      const line = state.lines[i];
      line.radius += line.speed;
      if (line.radius > maxRadius) {
        const rng = world.renderRandom;
        line.radius = rng.nextRange(10, 50);
        line.angle = rng.nextRange(0, Math.PI * 2);
        line.length = rng.nextRange(15, 60);
        line.speed = rng.nextRange(4, 12);
      }

      const x1 = centerX + Math.cos(line.angle) * line.radius;
      const y1 = centerY + Math.sin(line.angle) * line.radius;
      const x2 = centerX + Math.cos(line.angle) * (line.radius + line.length);
      const y2 = centerY + Math.sin(line.angle) * (line.radius + line.length);

      ctx.strokeStyle = line.color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaHyperdriveWarpSpeedLinesEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    if (!state.warpLinesInitialized) {
      initializeLines(world, state, maxRadius);
    }

    canvas.save();
    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:459-475. Considerar extraer a función compartida. Ref: ddaf91f3
    paint.setStrokeWidth(1.5);

    for (let i = 0; i < WARP_LINE_COUNT; i++) {
      const line = state.lines[i];
      line.radius += line.speed;
      if (line.radius > maxRadius) {
        const rng = world.renderRandom;
        line.radius = rng.nextRange(10, 50);
        line.angle = rng.nextRange(0, Math.PI * 2);
        line.length = rng.nextRange(15, 60);
        line.speed = rng.nextRange(4, 12);
      }

      const x1 = centerX + Math.cos(line.angle) * line.radius;
      const y1 = centerY + Math.sin(line.angle) * line.radius;
      const x2 = centerX + Math.cos(line.angle) * (line.radius + line.length);
      const y2 = centerY + Math.sin(line.angle) * (line.radius + line.length);

      paint.setColor(line.skColor || Skia.Color("#ffffff"));
      canvas.drawLine(x1, y1, x2, y2, paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 4. EnergyShieldBubbleEffect (Canvas & Skia)
// -------------------------------------------------------------
export const EnergyShieldBubbleEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
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

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:978-984. Considerar extraer a función compartida. Ref: f91f9998
export const SkiaEnergyShieldBubbleEffect: ShapeDrawer<any, ComponentRegistry> = {
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

    // Arc discharge sparks - identical RNG consumption for Canvas/Skia parity
    const rng = world.renderRandom;
    for (let i = 0; i < 3; i++) {
      const arcStart = rng.nextRange(0, Math.PI * 2);
      const arcLen = rng.nextRange(0.2, 0.7);
      // Consume rng identically to Canvas
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 5. DebrisShockwaveEffect (Canvas & Skia)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1410-1426. Considerar extraer a función compartida. Ref: 9e2f447d
export const DebrisShockwaveEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:696-714. Considerar extraer a función compartida. Ref: 4acbb34e
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    const baseSize = render.size || 20;
    const maxRadius = baseSize * 4;
    const currentRadius = maxRadius * progress;

    ctx.save();

    ctx.strokeStyle = "#ff7800";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ffdc64";
    ctx.globalAlpha = alpha * 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    const rng = world.renderRandom;
    ctx.fillStyle = "#ffb432";
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:733-741. Considerar extraer a función compartida. Ref: 2f09c167
    ctx.globalAlpha = alpha;

    for (let i = 0; i < 8; i++) {
      const angle = rng.nextRange(0, Math.PI * 2);
      const distFactor = rng.nextRange(0.6, 1.4);
      const sparkDist = currentRadius * distFactor;
      const sparkX = Math.cos(angle) * sparkDist;
      const sparkY = Math.sin(angle) * sparkDist;
      const sparkSize = rng.nextRange(1.5, 3.5);

      ctx.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize);
    }

    ctx.restore();
  }
};

export const SkiaDebrisShockwaveEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:627-645. Considerar extraer a función compartida. Ref: 1cf0b2c5
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    const baseSize = render.size || 20;
    const maxRadius = baseSize * 4;
    const currentRadius = maxRadius * progress;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    paint.setColor(Skia.Color("#ff7800"));
    paint.setAlphaf(alpha);
    paint.setStrokeWidth(4);
    canvas.drawCircle(0, 0, currentRadius, paint);

    paint.setColor(Skia.Color("#ffdc64"));
    paint.setAlphaf(alpha * 0.7);
    paint.setStrokeWidth(2);
    canvas.drawCircle(0, 0, currentRadius * 1.2, paint);

    const rng = world.renderRandom;
    const sparkPaint = Skia.Paint();
    sparkPaint.setColor(Skia.Color("#ffb432"));
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:675-683. Considerar extraer a función compartida. Ref: a9552617
    sparkPaint.setAlphaf(alpha);

    for (let i = 0; i < 8; i++) {
      const angle = rng.nextRange(0, Math.PI * 2);
      const distFactor = rng.nextRange(0.6, 1.4);
      const sparkDist = currentRadius * distFactor;
      const sparkX = Math.cos(angle) * sparkDist;
      const sparkY = Math.sin(angle) * sparkDist;
      const sparkSize = rng.nextRange(1.5, 3.5);

      canvas.drawRect(
        Skia.XYWHRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize),
        sparkPaint
      );
    }

    canvas.restore();
  }
};

// =============================================================
// II. 10 NEW ADDITIONAL EFFECTS (CANVAS & SKIA)
// =============================================================

// -------------------------------------------------------------
// 6. DriftingNebulaBackgroundEffect (Canvas & Skia)
// -------------------------------------------------------------
export const DriftingNebulaBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const state = getVFXState(world);
    if (!state.nebulaeInitialized) {
      initializeNebulae(world, state);
    }

    const { offsetX } = computeParallaxOffset(state.timePhase, 0, "layer1_nebula");
    const theme = getLevelTheme("violet_nebula");

    ctx.save();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = state.nebulae[i];
      neb.x += neb.vx;
      neb.y += neb.vy;

      const posX = neb.x - offsetX * 0.1;

      // Concentric soft circles with decaying opacities using Level Theme palette
      ctx.fillStyle = theme.nebulaPalette[i % theme.nebulaPalette.length] || neb.color;
      ctx.globalAlpha = 0.015;
      for (let r = neb.radius; r > 10; r -= 15) {
        ctx.beginPath();
        ctx.arc(posX, neb.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
};

export const SkiaDriftingNebulaBackgroundEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const state = getVFXState(world);
    if (!state.nebulaeInitialized) {
      initializeNebulae(world, state);
    }

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = state.nebulae[i];
      neb.x += neb.vx;
      neb.y += neb.vy;

      paint.setColor(neb.skColor || Skia.Color("#4a0082"));
      paint.setAlphaf(0.015);
      for (let r = neb.radius; r > 10; r -= 15) {
        canvas.drawCircle(neb.x, neb.y, r, paint);
      }
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 7. MatrixDigitalRainEffect (Canvas & Skia)
// -------------------------------------------------------------
export const MatrixDigitalRainEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:848-854. Considerar extraer a función compartida. Ref: 6a369da9
    const { height, state } = getScreenAndVFXState(world);

    if (!state.matrixInitialized) {
      initializeMatrix(world, state);
    }

    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:857-863. Considerar extraer a función compartida. Ref: 777ba080
    ctx.save();

    for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
      const col = state.matrixColumns[i];
      col.y += col.speed;
      if (col.y > height) {
        col.y = -150;
        col.speed = world.renderRandom.nextRange(2, 6);
      }

      // Draw streaming pixel cubes rather than allocating strings per frame
      ctx.fillStyle = "#00ff33";
      ctx.globalAlpha = col.intensity * 0.15;
      for (let j = 0; j < col.length; j++) {
        ctx.fillRect(col.x, col.y - j * 8, 4, 6);
      }

      // Leading bright tip
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = col.intensity;
      ctx.fillRect(col.x, col.y, 4, 6);
    }

    ctx.restore();
  }
};

export const SkiaMatrixDigitalRainEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { height, state } = getScreenAndVFXState(world);

    if (!state.matrixInitialized) {
      initializeMatrix(world, state);
    }

    canvas.save();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:831-837. Considerar extraer a función compartida. Ref: 6c495825
    const paint = Skia.Paint();

    for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
      const col = state.matrixColumns[i];
      col.y += col.speed;
      if (col.y > height) {
        col.y = -150;
      }

      paint.setColor(Skia.Color("#00ff33"));
      paint.setAlphaf(col.intensity * 0.15);
      for (let j = 0; j < col.length; j++) {
        canvas.drawRect(Skia.XYWHRect(col.x, col.y - j * 8, 4, 6), paint);
      }

      // Bright tip
      paint.setColor(Skia.Color("#ffffff"));
      paint.setAlphaf(col.intensity);
      canvas.drawRect(Skia.XYWHRect(col.x, col.y, 4, 6), paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 8. CRTGlitchShudderEffect (Canvas & Skia)
// -------------------------------------------------------------
export const CRTGlitchShudderEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:914-920. Considerar extraer a función compartida. Ref: 90aca425
    const { width, height } = getScreenAndVFXState(world);

    const rng = world.renderRandom;
    if (rng.next() < 0.96) return; // Keep glitches highly responsive & sparse

    ctx.save();

    const glitchLines = rng.nextInt(2, 5);
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:924-928. Considerar extraer a función compartida. Ref: 9fea618b
    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < glitchLines; i++) {
      const y = rng.nextRange(10, height - 10);
      const h = rng.nextRange(1, 4);
      const offset = rng.nextRange(-15, 15);

      ctx.globalAlpha = rng.nextRange(0.2, 0.5);
      ctx.fillRect(offset, y, width, h);
    }

    ctx.restore();
  }
};

export const SkiaCRTGlitchShudderEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height } = getScreenAndVFXState(world);

    const rng = world.renderRandom;
    if (rng.next() < 0.96) return;

    canvas.save();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#ffffff"));

    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:911-916. Considerar extraer a función compartida. Ref: 395935ec
    const glitchLines = rng.nextInt(2, 5);
    for (let i = 0; i < glitchLines; i++) {
      const y = rng.nextRange(10, height - 10);
      const h = rng.nextRange(1, 4);
      const offset = rng.nextRange(-15, 15);

      paint.setAlphaf(rng.nextRange(0.2, 0.5));
      canvas.drawRect(Skia.XYWHRect(offset, y, width, h), paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 9. ThrusterPlumeFlameEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ThrusterPlumeFlameEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 10;
    const timePhase = getVFXState(world).timePhase;
    const { plumeLength } = computeThrusterPlume(timePhase, size);

    ctx.save();

    // Inner fiery cone
    ctx.fillStyle = "#ff5500";
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, plumeLength);
    ctx.closePath();
    ctx.fill();

    // Outer plasma core
    ctx.fillStyle = "#ffcc00";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-size / 3, 0);
    ctx.lineTo(size / 3, 0);
    ctx.lineTo(0, plumeLength * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:580-586. Considerar extraer a función compartida. Ref: f6d151ad
export const SkiaThrusterPlumeFlameEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 10;
    const timePhase = getVFXState(world).timePhase;
    const { plumeLength } = computeThrusterPlume(timePhase, size);

    canvas.save();

    const paint = Skia.Paint();

    // Fiery cone
    paint.setColor(Skia.Color("#ff5500"));
    const pathOuter = Skia.Path.Make();
    pathOuter.moveTo(-size / 2, 0);
    pathOuter.lineTo(size / 2, 0);
    pathOuter.lineTo(0, plumeLength);
    pathOuter.close();
    canvas.drawPath(pathOuter, paint);

    // Inner cone
    paint.setColor(Skia.Color("#ffcc00"));
    paint.setAlphaf(0.7);
    const pathInner = Skia.Path.Make();
    pathInner.moveTo(-size / 3, 0);
    pathInner.lineTo(size / 3, 0);
    pathInner.lineTo(0, plumeLength * 0.65);
    pathInner.close();
    canvas.drawPath(pathInner, paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 10. LaserRailBeamEffect (Canvas & Skia)
// -------------------------------------------------------------
export const LaserRailBeamEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
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

    // Electrical Discharges (Deterministic zig-zags)
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

export const SkiaLaserRailBeamEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const length = render.size || 300;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    // Thick Outer Glow
    paint.setColor(Skia.Color("#00ffff"));
    paint.setAlphaf(0.5);
    paint.setStrokeWidth(10 + 2 * Math.sin(timePhase * 6));
    canvas.drawLine(0, 0, 0, -length, paint);

    // White Core
    paint.setColor(Skia.Color("#ffffff"));
    paint.setAlphaf(0.9);
    paint.setStrokeWidth(3);
    canvas.drawLine(0, 0, 0, -length, paint);

    // Electrical discharges
    const rng = world.renderRandom;
    paint.setColor(Skia.Color("#b4ffff"));
    paint.setAlphaf(0.8);
    paint.setStrokeWidth(1);

    const path = Skia.Path.Make();
    path.moveTo(0, 0);

    let curY = 0;
    while (curY > -length) {
      curY -= rng.nextRange(15, 30);
      const curX = rng.nextRange(-10, 10);
      path.lineTo(curX, curY);
    }
    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 11. ScreenBorderGlowEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ScreenBorderGlowEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, state } = getScreenAndVFXState(world);
    const timePhase = state.timePhase;

    ctx.save();

    // Red alert pulse
    ctx.strokeStyle = "#ff0000";
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(timePhase * 3);
    ctx.lineWidth = 14;

    ctx.strokeRect(7, 7, width - 14, height - 14);

    ctx.restore();
  }
};

export const SkiaScreenBorderGlowEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, state } = getScreenAndVFXState(world);
    const timePhase = state.timePhase;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#ff0000"));
    paint.setAlphaf(0.12 + 0.08 * Math.sin(timePhase * 3));
    paint.setStrokeWidth(14);

    canvas.drawRect(Skia.XYWHRect(7, 7, width - 14, height - 14), paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 12. SingularityVortexEffect (Canvas & Skia)
// -------------------------------------------------------------
export const SingularityVortexEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1217-1225. Considerar extraer a función compartida. Ref: ff4fc95f
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const baseSize = render.size || 30;
    const state = getVFXState(world);

    if (!state.vortexInitialized) {
      initializeVortex(world, state);
    }

    ctx.save();

    // 1. Accretion Disk (Concentric spiraling glowing paths)
    ctx.strokeStyle = "#9900ff";
    ctx.globalAlpha = 0.3;
    for (let r = baseSize; r > 5; r -= 6) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Black Hole Center
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, baseSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Spiraling Matter Particles
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1246-1255. Considerar extraer a función compartida. Ref: 0e31a971
    ctx.fillStyle = "#ff00ff";
    for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
      const p = state.accretionParticles[i];
      p.angle -= p.speed; // Swirl
      p.radius -= 0.2; // Fall in

      if (p.radius < 5) {
        const rng = world.renderRandom;
        p.radius = rng.nextRange(baseSize * 0.8, baseSize * 1.5);
        p.angle = rng.nextRange(0, Math.PI * 2);
      }

      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }

    ctx.restore();
  }
};

export const SkiaSingularityVortexEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const baseSize = render.size || 30;
    const state = getVFXState(world);

    if (!state.vortexInitialized) {
      initializeVortex(world, state);
    }

    canvas.save();
    const paint = Skia.Paint();

    // Accretion disk rings
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#9900ff"));
    paint.setAlphaf(0.3);
    for (let r = baseSize; r > 5; r -= 6) {
      paint.setStrokeWidth(2);
      canvas.drawCircle(0, 0, r, paint);
    }

    // Black Hole Center
    const centerPaint = Skia.Paint();
    centerPaint.setColor(Skia.Color("#000000"));
    canvas.drawCircle(0, 0, baseSize * 0.4, centerPaint);

    // Particles
    const pPaint = Skia.Paint();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1210-1218. Considerar extraer a función compartida. Ref: 375483f3
    pPaint.setColor(Skia.Color("#ff00ff"));

    for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
      const p = state.accretionParticles[i];
      p.angle -= p.speed;
      p.radius -= 0.2;

      if (p.radius < 5) {
        const rng = world.renderRandom;
        p.radius = rng.nextRange(baseSize * 0.8, baseSize * 1.5);
      }

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
export const CometMotionTrailEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 15;
    const timePhase = getVFXState(world).timePhase;
    const segments = computeCometTrailSegments(timePhase, size);

    ctx.save();

    // Renders a tapering neon plume trailing behind using pre-calculated angles
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 1;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      ctx.globalAlpha = seg.alpha;
      ctx.beginPath();
      ctx.arc(seg.wiggle, seg.offset, seg.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaCometMotionTrailEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 15;
    const timePhase = getVFXState(world).timePhase;
    const segments = computeCometTrailSegments(timePhase, size);

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#00ffcc"));
    paint.setStrokeWidth(1);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      paint.setAlphaf(seg.alpha);
      canvas.drawCircle(seg.wiggle, seg.offset, seg.radius, paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 14. RGBHologramGlitchEffect (ShapeDrawer)
// -------------------------------------------------------------
export const RGBHologramGlitchEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
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

export const SkiaRGBHologramGlitchEffect: ShapeDrawer<any, ComponentRegistry> = {
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
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:634-650. Considerar extraer a función compartida. Ref: a3bdea7c
export const FloatingTextScoreEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    ctx.save();

    // Fades and floats upward
    ctx.fillStyle = "#ffd700";
    ctx.globalAlpha = alpha;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";

    // Draw the static text representatively to avoid frame allocations
    ctx.fillText("CRITICAL! +100", 0, -progress * 50);

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:682-699. Considerar extraer a función compartida. Ref: 0d074f4b
export const SkiaFloatingTextScoreEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const { progress, alpha } = computeEffectProgress(world, entity);
    if (alpha <= 0.01) return;

    canvas.save();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#ffd700"));
    paint.setAlphaf(alpha);

    // Skia draws text or representative indicator cubes cleanly
    canvas.drawRect(Skia.XYWHRect(-10, -progress * 50, 20, 6), paint);

    canvas.restore();
  }
};
