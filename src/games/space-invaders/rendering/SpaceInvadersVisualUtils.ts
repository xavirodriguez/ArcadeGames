import { HealthComponent, RenderComponent, World } from "@tiny-aster/core";
import { InvaderComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { EnemyTagComponent } from "../components/EnemyTagComponent";
import { resolveHitFlash, HitFlashState } from "../../shared/rendering/RenderUtils";
import { colors } from "../../../theme/colors";
import { computeSinePulse } from "./shared/SpaceInvadersPulseUtils";
import { calculateBulletProximity, calculateBossPhase, calculateBossVibrato, calculateParticleHeatColor, calculateShieldHpRatio } from "../../shared/rendering/spaceInvadersMath";
import { CircularPositionBuffer } from "../../shared/rendering/SharedVFX";

export type { HitFlashState };

/**
 * Calculates hit flash presentation properties (color and opacity) for an entity.
 * Shared between Canvas2D and Skia renderers to maintain functional visual parity.
 */
export function applyHitFlash(
  render: RenderComponent | undefined,
  baseColor: string,
  baseOpacity: number = 1.0
): HitFlashState {
  return resolveHitFlash(render, baseColor, baseOpacity);
}

/**
 * Safely extracts shooting state from the typed InputComponent of an entity.
 */
export function isPlayerShooting(world: World<SpaceInvadersComponentRegistry>, entity: number): boolean {
  const input = world.getComponent(entity, "Input");
  return Boolean(input && input.shoot);
}

/**
 * Calculates dynamic player tilt in radians based on horizontal velocity.
 */
export function calculatePlayerTilt(vx: number, maxTilt = 0.15): number {
  const targetTilt = vx * 0.0004;
  return Math.max(-maxTilt, Math.min(maxTilt, targetTilt));
}

/**
 * Calculates dual-stage thruster plume length based on tick and size.
 */
export function calculateThrusterPlumeLength(tick: number, size: number): number {
  const flicker = 1.0 + 0.18 * Math.sin(tick / 2);
  return (size / 2.2) * flicker;
}

export interface MuzzleFlashState {
  flashSize: number;
  muzzleFlashFrames: number;
  shouldDrawFlash: boolean;
}

export function resolveMuzzleFlashState(
  render: RenderComponent | undefined,
  isShooting: boolean,
  tick: number
): MuzzleFlashState {
  const muzzleFlashFrames = render?.muzzleFlashFrames ?? 0;
  const shouldDrawFlash = isShooting || muzzleFlashFrames > 0;
  const flashSize = (3.5 + 1.5 * Math.sin(tick * 0.8)) * (muzzleFlashFrames > 0 ? 1.8 : 1.0);
  if (render && muzzleFlashFrames > 0) {
    render.muzzleFlashFrames = muzzleFlashFrames - 1;
  }
  return { flashSize, muzzleFlashFrames, shouldDrawFlash };
}

export interface ShieldPulseState {
  isInvulnerable: boolean;
  shieldAlpha: number;
  radius: number;
}

export function resolveShieldPulseState(
  health: HealthComponent | undefined,
  size: number,
  tick: number
): ShieldPulseState {
  const isInvulnerable = Boolean(
    health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0
  );
  if (!isInvulnerable) {
    return { isInvulnerable: false, shieldAlpha: 0, radius: 0 };
  }
  const shieldPulse = computeSinePulse(tick, 0.25, 0.08, 1.0);
  const shieldAlpha = 0.35 + 0.15 * Math.sin(tick / 4 + Math.PI);
  const radius = size * 0.72 * shieldPulse;
  return { isInvulnerable: true, shieldAlpha, radius };
}

export interface InvaderColorState {
  baseColor: string;
  isTeleporter: boolean;
}

export function resolveInvaderColor(
  render: RenderComponent | undefined,
  invaderComp?: InvaderComponent,
  enemyTag?: EnemyTagComponent
): InvaderColorState {
  let baseColor = render?.color || colors.white;
  const isTeleporter = enemyTag?.variant === "teleporter" || render?.color === "#00D9FF";

  if (invaderComp && !isTeleporter && render?.color !== "#00D9FF") {
    const row = invaderComp.row;
    if (row === 0) {
      baseColor = colors.magentaHot;
    } else if (row <= 2) {
      baseColor = colors.cyan;
    } else {
      baseColor = colors.gold;
    }
  } else if (isTeleporter) {
    baseColor = "#00D9FF";
  }

  return { baseColor, isTeleporter };
}

export interface KamikazeAimVector {
  phase: "warning" | "telegraphing" | "diving" | "returning";
  relTargetX: number;
  relTargetY: number;
  blinkAlpha: number;
  pulse: number;
  bottomRelY: number;
}

export function resolveKamikazeAimVector(
  world: World<SpaceInvadersComponentRegistry>,
  entity: number
): KamikazeAimVector | null {
  const kami = world.getComponent(entity, "Kamikaze");
  if (!kami) return null;

  const tick = world.tick;
  const pos = world.getComponent(entity, "Transform");
  const targetX = kami.targetX ?? (pos ? pos.x : 0);
  const targetY = kami.targetY ?? GAME_CONFIG.worldHeight;
  const relTargetX = targetX - (pos ? pos.x : 0);
  const relTargetY = targetY - (pos ? pos.y : 0);

  const blinkAlpha = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.3));
  const pulse = computeSinePulse(tick, 0.4, 0.4, 0.6);
  const bottomRelY = pos ? GAME_CONFIG.worldHeight - pos.y - 35 : 450;

  return {
    phase: kami.phase,
    relTargetX,
    relTargetY,
    blinkAlpha,
    pulse,
    bottomRelY,
  };
}

export interface BulletTrailContext {
  size: number;
  isPlayerBullet: boolean;
  glowColor: string;
  coreColor: string;
  proximityFactor: number;
  currentX: number;
  currentY: number;
  points: ReturnType<CircularPositionBuffer["getPoints"]>;
  baseTrailAlpha: number;
  baseAuraAlpha: number;
  shadowBlurAmount: number;
  auraSizeScale: number;
}

export function resolveBulletTrailContext(
  world: World<SpaceInvadersComponentRegistry>,
  entity: number,
  render: RenderComponent,
  trailBuffer: CircularPositionBuffer
): BulletTrailContext {
  const { size = 4 } = render;
  const isPlayerBullet = world.hasComponent(entity, "PlayerBullet");
  const glowColor = render.color || (isPlayerBullet ? colors.cyan : colors.redHot);
  const coreColor = colors.white;
  const proximityFactor = calculateBulletProximity(world, entity, isPlayerBullet);

  const transform = world.getComponent(entity, "Transform");
  const currentX = transform ? (transform.worldX ?? transform.x) : 0;
  const currentY = transform ? (transform.worldY ?? transform.y) : 0;

  trailBuffer.pushPosition(currentX, currentY, transform?.rotation ?? 0, world.tick);

  const points = trailBuffer.getPoints();
  const baseTrailAlpha = isPlayerBullet ? 0.25 : 0.25 + proximityFactor * 0.25;
  const baseAuraAlpha = isPlayerBullet ? 0.4 : 0.4 + proximityFactor * 0.4;
  const shadowBlurAmount = isPlayerBullet ? 8 : 8 + proximityFactor * 16;
  const auraSizeScale = 1.0 + proximityFactor * 0.3;

  return {
    size,
    isPlayerBullet,
    glowColor,
    coreColor,
    proximityFactor,
    currentX,
    currentY,
    points,
    baseTrailAlpha,
    baseAuraAlpha,
    shadowBlurAmount,
    auraSizeScale,
  };
}

export interface BossVisualState {
  size: number;
  currentHp: number;
  maxHp: number;
  hpRatio: number;
  phase: number;
  baseColor: string;
  accentColor: string;
  scaleMultiplier: number;
  scale: number;
  shakeX: number;
  shakeY: number;
  vibX: number;
  vibY: number;
  s: number;
  corePulse: number;
  coreRadius: number;
  pulseSpeed: number;
}

export function resolveBossVisualState(
  world: World<SpaceInvadersComponentRegistry>,
  entity: number,
  render: RenderComponent
): BossVisualState {
  const { size = 80 } = render;
  const boss = world.getComponent(entity, "Boss");
  const health = world.getComponent(entity, "Health");

  const currentHp = health ? health.current : boss ? boss.hp : 50;
  const maxHp = health ? health.max : boss ? boss.maxHp : 50;
  const hpRatio = calculateShieldHpRatio(currentHp, maxHp);

  const { phase, baseColor, accentColor, scaleMultiplier } = calculateBossPhase(hpRatio);

  const scale = phase === 3 ? 1.3 : phase === 2 ? 1.15 : 1.0;
  const tick = world.tick;

  const shakeX = phase === 3 ? Math.sin(tick * 0.8) * 3 : 0;
  const shakeY = phase === 3 ? Math.cos(tick * 0.9) * 3 : 0;

  const { vibX, vibY } = calculateBossVibrato(phase, tick);

  const s = size / 20;

  const pulseSpeed = phase === 3 ? 0.3 : phase === 2 ? 0.15 : 0.08;
  const corePulse = computeSinePulse(tick, pulseSpeed, 0.5, 0.5);
  const coreRadius = s * (3.5 + 1.2 * corePulse);

  return {
    size,
    currentHp,
    maxHp,
    hpRatio,
    phase,
    baseColor,
    accentColor,
    scaleMultiplier,
    scale,
    shakeX,
    shakeY,
    vibX,
    vibY,
    s,
    corePulse,
    coreRadius,
    pulseSpeed,
  };
}

export interface ParticleVisualState {
  size: number;
  colorStr: string;
  progress: number;
  particleColor: string;
  currentSize: number;
}

export function resolveParticleState(
  world: World<SpaceInvadersComponentRegistry>,
  entity: number,
  render: RenderComponent
): ParticleVisualState {
  const { size = 2, color = "white" } = render;
  const ttl = world.getComponent(entity, "TTL");
  let progress = 0.5;

  if (ttl && ttl.remaining !== undefined) {
    const totalLife = ttl.timeLeft || 0.5;
    progress = Math.max(0, Math.min(1.0, 1.0 - (ttl.remaining / totalLife)));
  }

  const particleColor = calculateParticleHeatColor(color, progress);
  const currentSize = Math.max(0.5, size * (1.1 - progress));

  return {
    size,
    colorStr: color,
    progress,
    particleColor,
    currentSize,
  };
}

export function resolveExplosionParticleData(p: {
  active: boolean;
  life: number;
  maxLife: number;
  type: string;
  x: number;
  y: number;
  radius: number;
  size: number;
  color: string;
  skColor?: any;
}) {
  if (!p.active) return null;
  const ratio = Math.max(0, p.life / p.maxLife);
  return {
    ratio,
    type: p.type,
    x: p.x,
    y: p.y,
    radius: p.radius,
    size: p.size,
    color: p.color,
    skColor: p.skColor,
  };
}
