import { World, TransformComponent, RenderComponent, HealthComponent } from "@tiny-aster/core";
import {
  FlappyBirdComponentRegistry,
  BirdComponent,
  PipeComponent
} from "../types/FlappyBirdTypes";
import {
  calculateBirdTiltAngle,
  calculateSquashAndStretch,
  calculateFlappyPipeGeometry,
  PipeGeometry
} from "../../shared/rendering/geometry";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { VisualParticlePool } from "../../shared/rendering/VisualParticlePool";
import { processFlappyBirdParticleEvents } from "./particleEvents";

/**
 * Common draw context resolved for Flappy Bird player ship rendering.
 */
export interface FlappyBirdDrawContext {
  render: RenderComponent;
  transform: TransformComponent;
  birdComp: BirdComponent;
  health: HealthComponent | undefined;
  size: number;
  x: number;
  y: number;
  vy: number;
  isAlive: boolean;
  globalOpacity: number;
  angleRad: number;
  angleDeg: number;
  scaleX: number;
  scaleY: number;
  isDyingGlitch: boolean;
  speed: number;
}

/**
 * Resolves draw context, computes tilt/squash, and processes particle events for Flappy Bird.
 */
export function resolveFlappyBirdDrawContext(
  world: World<FlappyBirdComponentRegistry>,
  entity: number,
  particlePool: VisualParticlePool
): FlappyBirdDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render) return null;
  const size = render.size || 15;

  const transform = world.getComponent(entity, "Transform") as TransformComponent | undefined;
  const birdComp = world.getComponent(entity, "Bird") as BirdComponent | undefined;
  if (!transform || !birdComp) return null;

  const health = world.getComponent(entity, "Health") as HealthComponent | undefined;
  const x = transform.worldX ?? transform.x;
  const y = transform.worldY ?? transform.y;

  processFlappyBirdParticleEvents(world, entity, birdComp, particlePool, x, y, size);

  const vy = birdComp.velocityY;
  const isAlive = birdComp.isAlive;

  const flashState = resolveHitFlash(render, render.color || "yellow", 1.0, 0.35);
  const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, {
    mode: "interval",
    multiplier: 0.01,
    dimOpacity: 0.35,
  });

  let globalOpacity = flashState.isFlashing ? flashState.opacity : 1.0;
  if (invState.isInvulnerable) {
    globalOpacity = invState.opacity;
  }

  const { angleRad, angleDeg } = calculateBirdTiltAngle(vy);
  const { scaleX, scaleY } = calculateSquashAndStretch(vy);
  const speed = Math.abs(vy);
  const isDyingGlitch = Boolean(render.hitFlashFrames && render.hitFlashFrames > 0);

  return {
    render,
    transform,
    birdComp,
    health,
    size,
    x,
    y,
    vy,
    isAlive,
    globalOpacity,
    angleRad,
    angleDeg,
    scaleX,
    scaleY,
    isDyingGlitch,
    speed,
  };
}

/**
 * Common draw context resolved for Flappy Pipe (Containment Tower) rendering.
 */
export interface FlappyPipeDrawContext {
  render: RenderComponent;
  pos: TransformComponent;
  pipe: PipeComponent;
  size: number;
  width: number;
  halfWidth: number;
  variant: string;
  geometry: PipeGeometry;
  capHeight: number;
  capExtraWidth: number;
  capWidth: number;
  capHalfWidth: number;
  beaconPulse: number;
}

/**
 * Resolves draw context and pipe geometry for Flappy Pipe obstacles.
 */
export function resolveFlappyPipeDrawContext(
  world: World<FlappyBirdComponentRegistry>,
  entity: number
): FlappyPipeDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  const pos = world.getComponent(entity, "Transform") as TransformComponent | undefined;
  if (!render || !pos) return null;

  const pipe = world.getComponent(entity, "Pipe") as PipeComponent | undefined;
  if (!pipe) return null;

  const size = render.size || 60;
  const width = size;
  const halfWidth = width / 2;
  const variant = pipe.visualVariant || "standard";

  const config = world.getResource<{ worldHeight: number }>("GameConfig");
  const worldHeight = config?.worldHeight ?? 600;

  const geometry = calculateFlappyPipeGeometry(pos.y, pipe.gapY, pipe.gapSize, worldHeight);

  const capHeight = 28;
  const capExtraWidth = 12;
  const capWidth = width + capExtraWidth;
  const capHalfWidth = capWidth / 2;

  const beaconPulse = 0.35 + 0.65 * Math.abs(Math.sin(world.tick * 0.2));

  return {
    render,
    pos,
    pipe,
    size,
    width,
    halfWidth,
    variant,
    geometry,
    capHeight,
    capExtraWidth,
    capWidth,
    capHalfWidth,
    beaconPulse,
  };
}

/**
 * Evaluates periodic background debris/sparks spawning deterministically using `world.renderRandom`.
 */
export function maybeSpawnBackgroundDebris(
  world: World<FlappyBirdComponentRegistry>,
  width: number,
  height: number,
  spawnParticleFn: (
    type: "star",
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    color: string,
    angle: number
  ) => void
): void {
  if (world.tick % 300 === 0 && world.renderRandom.next() > 0.3) {
    const dx = world.renderRandom.nextRange(20, width - 20);
    const dy = world.renderRandom.nextRange(40, height * 0.7);
    const angle = world.renderRandom.next() * Math.PI * 2;
    const speed = world.renderRandom.nextRange(15, 35);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    spawnParticleFn(
      "star",
      dx,
      dy,
      vx,
      vy,
      world.renderRandom.nextRange(1.0, 2.0),
      world.renderRandom.nextRange(1.5, 3.0),
      "#5A6173",
      angle
    );
  }
}

/**
 * Common state resolved for Glide Energy meter HUD overlay.
 */
export interface FlappyGlideEnergyState {
  currentEnergy: number;
  maxEnergy: number;
  ratio: number;
  isOverheated: boolean;
  barW: number;
  barH: number;
  bx: number;
  by: number;
  fillColor: string;
}

/**
 * Resolves Glide Energy component and HUD dimensions.
 */
export function resolveGlideEnergyState(
  world: World<FlappyBirdComponentRegistry>,
  width: number,
  height: number
): FlappyGlideEnergyState | null {
  const birds = world.query("Bird", "GlideEnergy");
  if (birds.length === 0) return null;

  const energy = world.getComponent(birds[0], "GlideEnergy");
  if (!energy) return null;

  const barW = 120;
  const barH = 8;
  const bx = (width - barW) / 2;
  const by = height - 25;
  const ratio = Math.max(0, Math.min(1, energy.currentEnergy / energy.maxEnergy));
  const fillColor = energy.isOverheated ? "#FF3300" : ratio < 0.3 ? "#FFC000" : "#00F3FF";

  return {
    currentEnergy: energy.currentEnergy,
    maxEnergy: energy.maxEnergy,
    ratio,
    isOverheated: energy.isOverheated,
    barW,
    barH,
    bx,
    by,
    fillColor,
  };
}

/**
 * Common state resolved for Sector Event HUD overlay banner.
 */
export interface FlappySectorEventInfo {
  sectorEvent: string;
  bannerText: string;
  textColor: string;
}

/**
 * Resolves banner text and colors for active sector events.
 */
export function resolveSectorEventInfo(sectorEvent: string): FlappySectorEventInfo | null {
  if (sectorEvent === "none") return null;

  const bannerText =
    sectorEvent === "solar_flare"
      ? "SECTOR EVENT: SOLAR FLARE (+25% SPEED)"
      : sectorEvent === "asteroid_storm"
      ? "SECTOR EVENT: DUST STORM (-15% SPEED)"
      : "SECTOR EVENT: HYPER WARP (2X COMBO BOOST)";

  const textColor =
    sectorEvent === "solar_flare"
      ? "#FFC000"
      : sectorEvent === "asteroid_storm"
      ? "#D3D9E2"
      : "#00F3FF";

  return { sectorEvent, bannerText, textColor };
}
