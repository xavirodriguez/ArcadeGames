import { World, EffectDrawer, ShapeDrawer, ComponentRegistry, CoreComponentRegistry, RenderComponent, TTLComponent, Renderer, RendererUtils, RenderContext, EventRegistry, BlueprintRegistryMap, Entity, RandomService } from "@tiny-aster/core";
import type { SkColor, SkPath, SkShader } from "@shopify/react-native-skia";
import { Skia } from "./SkiaContext";
import { computeAsteroidSilhouette } from "./ProceduralShapeUtils";
import { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor } from "./CosmicPalette";
import { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow } from "./GlowSystem";
import { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate } from "./ParallaxSystem";
import { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState } from "./ExplosionSystem";
import { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme } from "./CelestialBodiesSystem";
import { MotionTrailParams, computeTrailParameters, getThrusterFlameColors, CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint } from "./MotionTrailSystem";
import { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme } from "./LevelThemeSystem";

export { COSMIC_ARCADE_PALETTE, getSemanticColor, hexToRgba, getSkiaColor };
export { GlowIntensity, GlowStyle, GLOW_PRESETS, getGlowStyle, renderCanvasGlow, renderSkiaGlow };
export { ParallaxLayerName, PARALLAX_FACTORS, computeParallaxOffset, wrapParallaxCoordinate };
export { ExplosionType, ExplosionProfile, EXPLOSION_PROFILES, computeExplosionState };
export { PlanetType, PlanetTheme, PLANET_THEMES, getPlanetTheme };
export { MotionTrailParams, computeTrailParameters, getThrusterFlameColors, CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint };
export { LevelThemeName, LevelVisualTheme, LEVEL_THEME_PRESETS, getLevelTheme };

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  skColor?: SkColor | null;
}

export interface SpeedLine {
  angle: number;
  radius: number;
  length: number;
  speed: number;
  color: string;
  skColor?: SkColor | null;
}

export interface NebulaCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  skColor?: SkColor | null;
}

export interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  intensity?: number;
  chars: string[];
}

export interface AccretionParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface MilkyWayDustParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  skColor?: SkColor | null;
}

export interface MilkyWayBandState {
  angle: number;
  particles: MilkyWayDustParticle[];
}

export interface RingingPlanetState {
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

export interface DistantAsteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  points: { x: number; y: number }[];
  color: string;
  skColor?: SkColor | null;
  skPath?: SkPath | null;
}

export interface SpaceStationBeacon {
  x: number;
  y: number;
  color: string;
  skColor?: SkColor | null;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface SpaceStationState {
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

export interface VFXWorldState {
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
  timePhase: number;
  cachedCRTGradient?: CanvasGradient | null;
  cachedSkiaShader?: SkShader | null;
  cachedPlanetGradient?: CanvasGradient | null;
  cachedPlanetSkiaShader?: SkShader | null;
  cachedRingGradient?: CanvasGradient | null;
  cachedRingSkiaShader?: SkShader | null;
  cachedMilkyWayGradient?: CanvasGradient | null;
  cachedMilkyWaySkiaShader?: SkShader | null;
  cachedStationGradient?: CanvasGradient | null;
  cachedStationSkiaShader?: SkShader | null;
  scanlines?: number[] | null;
  matrixCols?: MatrixColumn[] | null;
  lastWidth: number;
  lastHeight: number;
  lastCRTWidth?: number;
  lastCRTHeight?: number;
}

export const STAR_COUNT = 80;
export const WARP_LINE_COUNT = 45;
export const NEBULA_CLOUD_COUNT = 4;
export const MATRIX_COLUMN_COUNT = 30;
export const ACCRETION_PARTICLE_COUNT = 15;
export const TRAIL_LENGTH = 10;
export const DISTANT_ASTEROID_COUNT = 12;
export const MILKY_WAY_DUST_PARTICLE_COUNT = 25;

const worldStateMap = new WeakMap<World<ComponentRegistry>, VFXWorldState>();

export function getVFXState<TComponents extends ComponentRegistry = ComponentRegistry>(world: World<TComponents>): VFXWorldState {
  let state = worldStateMap.get(world as World<ComponentRegistry>);
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

export function getActiveLevelTheme<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>
): LevelVisualTheme {
  const resourceTheme = world.getResource<LevelThemeName>("ActiveLevelThemeName");
  if (resourceTheme) {
    return getLevelTheme(resourceTheme);
  }
  const gameState = world.getSingleton("GameState" as Extract<keyof TComponents, string>) as { level?: number } | undefined;
  const level = gameState?.level || 1;
  const themes: LevelThemeName[] = ["deep_space", "violet_nebula", "industrial_orbit", "volcanic_rift", "alien_bloom"];
  const themeName = themes[(level - 1) % themes.length];
  return getLevelTheme(themeName);
}

export function getScreenAndVFXState<TComponents extends ComponentRegistry = ComponentRegistry>(
  world: World<TComponents>
): {
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

export function readCanvasSize(ctx: CanvasRenderingContext2D): { width: number; height: number } {
  return {
    width: ctx.canvas ? ctx.canvas.width : 800,
    height: ctx.canvas ? ctx.canvas.height : 600
  };
}

export type CachedVFXKey =
  | "cachedCRTGradient"
  | "cachedSkiaShader"
  | "cachedPlanetGradient"
  | "cachedPlanetSkiaShader"
  | "cachedRingGradient"
  | "cachedRingSkiaShader"
  | "cachedMilkyWayGradient"
  | "cachedMilkyWaySkiaShader"
  | "cachedStationGradient"
  | "cachedStationSkiaShader"
  | "scanlines"
  | "matrixCols";

export function getOrCreateCached<T>(
  state: VFXWorldState,
  cacheKey: CachedVFXKey,
  width: number,
  height: number,
  create: () => T
): T {
  if (!state[cacheKey] || state.lastCRTWidth !== width || state.lastCRTHeight !== height) {
    (state as Record<CachedVFXKey, unknown>)[cacheKey] = create();
    state.lastCRTWidth = width;
    state.lastCRTHeight = height;
  }
  return state[cacheKey] as T;
}

export interface ParallaxLayerOptions<TState> {
  layerName: ParallaxLayerName;
  isInitialized: (state: VFXWorldState) => boolean;
  initialize: (world: World<ComponentRegistry>, state: VFXWorldState) => void;
  getState: (state: VFXWorldState) => TState;
}

export interface ParallaxLayerContext<TState> {
  width: number;
  height: number;
  state: VFXWorldState;
  layerState: TState;
  offsetX: number;
  offsetY: number;
  wrapCoordinate: (x: number, margin?: number) => number;
}

export function createParallaxLayer<TState>(options: ParallaxLayerOptions<TState>) {
  return <TComponents extends ComponentRegistry = ComponentRegistry>(
    world: World<TComponents>
  ): ParallaxLayerContext<TState> | null => {
    const { width, height, state } = getScreenAndVFXState(world);
    if (!options.isInitialized(state)) {
      options.initialize(world, state);
    }
    const layerState = options.getState(state);
    if (!layerState) return null;

    const { offsetX, offsetY } = computeParallaxOffset(state.timePhase, 0, options.layerName);

    return {
      width,
      height,
      state,
      layerState,
      offsetX,
      offsetY,
      wrapCoordinate: (x: number, margin?: number) => wrapParallaxCoordinate(x, width, margin)
    };
  };
}

export function pickColor(rng: RandomService, colors: string[]): { color: string; skColor: SkColor | null } {
  const color = colors[rng.nextInt(0, colors.length)];
  return { color, skColor: Skia ? Skia.Color(color) : null };
}

export function initializeStars(world: World<ComponentRegistry>, state: VFXWorldState) {
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

export function initializeNebulae(world: World<ComponentRegistry>, state: VFXWorldState) {
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

export function initializeMilkyWay(world: World<ComponentRegistry>, state: VFXWorldState) {
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

export function initializeRingingPlanet(world: World<ComponentRegistry>, state: VFXWorldState) {
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

export function initializeDistantAsteroids(world: World<ComponentRegistry>, state: VFXWorldState) {
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

export function initializeSpaceStation(world: World<ComponentRegistry>, state: VFXWorldState) {
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
