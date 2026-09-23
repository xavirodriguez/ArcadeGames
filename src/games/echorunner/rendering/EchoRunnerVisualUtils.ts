import { World } from "@tiny-aster/core";
import { ECHO_PALETTE } from "./EchoRunnerPalette";

export interface RenderComponentLike {
  visible?: boolean;
  size?: number;
  color?: string;
  hitFlashFrames?: number;
}

export interface StateMachineComponentLike {
  currentState?: string;
}

export interface VelocityComponentLike {
  vx: number;
  vy: number;
}

export interface GroundStateComponentLike {
  isGrounded?: boolean;
}

export interface PlatformerInputComponentLike {
  pulseCooldown?: number;
}

export interface HealthComponentLike {
  invulnerableRemaining?: number;
}

export interface RespawnPointComponentLike {
  checkpointId?: string;
}

export interface RunStateResource {
  collectedTemporalIds?: string[];
  activeCheckpoint?: string;
  elapsedTime?: number;
}

/**
 * Common draw context helper for EchoRunner entity drawers.
 * @public
 */
export interface EchoDrawContext {
  render: RenderComponentLike;
  size: number;
  isHitFlash: boolean;
  state: string;
}

export function resolveEchoDrawContext(
  world: World,
  entity: number,
  defaultSize: number = 20
): EchoDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponentLike | undefined;
  if (!render || !render.visible) return null;

  const size = render.size || defaultSize;
  const sm = world.getComponent(entity, "StateMachine") as StateMachineComponentLike | undefined;
  const state = sm && typeof sm === "object" && "currentState" in sm && typeof sm.currentState === "string" ? sm.currentState : "Idle";
  const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

  return { render, size, isHitFlash, state };
}

export interface EchoPlayerPose {
  tiltAngle: number;
  hoverY: number;
  leftLegX: number;
  leftLegY: number;
  rightLegX: number;
  rightLegY: number;
}

/**
 * Calculates player visual pose offset, tilt, and leg positioning based on velocity and grounded state.
 */
export function calculateEchoPlayerPose(
  size: number,
  isGrounded: boolean,
  vx: number,
  vy: number,
  tick: number
): EchoPlayerPose {
  let tiltAngle = 0;
  let hoverY = 0;
  let leftLegX = -size * 0.15;
  let leftLegY = size * 0.5;
  let rightLegX = size * 0.15;
  let rightLegY = size * 0.5;

  if (!isGrounded) {
    if (vy < -20) {
      tiltAngle = -0.12;
      leftLegY = size * 0.35;
      rightLegY = size * 0.35;
    } else {
      tiltAngle = 0.08;
      leftLegX = -size * 0.22;
      rightLegX = size * 0.22;
      leftLegY = size * 0.45;
      rightLegY = size * 0.45;
    }
  } else if (Math.abs(vx) > 15) {
    tiltAngle = Math.min(Math.max(vx * 0.0008, -0.2), 0.2);
    const stride = Math.sin(tick * 0.4);
    leftLegX = -size * 0.15 + stride * 4;
    leftLegY = size * 0.5 - Math.abs(stride) * 2;
    rightLegX = size * 0.15 - stride * 4;
    rightLegY = size * 0.5 - Math.abs(stride) * 2;
  } else {
    hoverY = Math.sin(tick * 0.12) * 1.5;
  }

  return { tiltAngle, hoverY, leftLegX, leftLegY, rightLegX, rightLegY };
}

export interface HopperVisualState {
  isAlert: boolean;
  isAttack: boolean;
  glowColor: string;
  scaleX: number;
  scaleY: number;
}

/**
 * Resolves visual state and squash/stretch scaling for Hopper enemies.
 */
export function resolveHopperVisualState(state: string): HopperVisualState {
  const isAlert = state === "Alert" || state === "Windup" || state === "Compress";
  const isAttack = state === "Attack";
  const glowColor = isAttack ? ECHO_PALETTE.restorationCyan : (isAlert ? ECHO_PALETTE.corruptionAmber : "#10b981");

  let scaleX = 1;
  let scaleY = 1;

  if (isAlert) {
    scaleX = 1.3;
    scaleY = 0.7;
  } else if (isAttack) {
    scaleX = 0.8;
    scaleY = 1.25;
  }

  return { isAlert, isAttack, glowColor, scaleX, scaleY };
}

export interface SentinelVisualState {
  isAlert: boolean;
  isAttack: boolean;
  glowColor: string;
}

/**
 * Resolves visual state and glow color for Sentinel enemies.
 */
export function resolveSentinelVisualState(state: string): SentinelVisualState {
  const isAlert = state === "Alert" || state === "Windup";
  const isAttack = state === "Attack";
  const glowColor = isAlert ? ECHO_PALETTE.corruptionAmber : (isAttack ? ECHO_PALETTE.corruptionCrimson : ECHO_PALETTE.corruptionPurple);
  return { isAlert, isAttack, glowColor };
}

export interface WatcherVisualState {
  isAlert: boolean;
  isAttack: boolean;
  glowColor: string;
}

/**
 * Resolves visual state and glow color for Watcher enemies.
 */
export function resolveWatcherVisualState(state: string): WatcherVisualState {
  const isAlert = state === "Alert" || state === "Windup";
  const isAttack = state === "Attack";
  const glowColor = isAttack ? ECHO_PALETTE.corruptionCrimson : (isAlert ? ECHO_PALETTE.corruptionAmber : "#3b82f6");
  return { isAlert, isAttack, glowColor };
}

export interface ChargerVisualState {
  isStunned: boolean;
  isAlert: boolean;
  isAttack: boolean;
  glowColor: string;
}

/**
 * Resolves visual state and glow color for Charger enemies.
 */
export function resolveChargerVisualState(state: string): ChargerVisualState {
  const isStunned = state === "Recovery" || state === "Stunned";
  const isAlert = state === "Alert" || state === "Windup";
  const isAttack = state === "Attack";
  const glowColor = isStunned ? ECHO_PALETTE.restorationGold : (isAlert ? ECHO_PALETTE.corruptionAmber : ECHO_PALETTE.corruptionCrimson);
  return { isStunned, isAlert, isAttack, glowColor };
}

/**
 * Resolves palette colors for memory fragment collectibles based on collected count progression.
 */
export function resolveMemoryFragmentColors(collectedCount: number): { strokeColor: string; fillColor: string } {
  const isRestoredProgression = collectedCount >= 5;
  const strokeColor = isRestoredProgression ? ECHO_PALETTE.restorationCyan : ECHO_PALETTE.corruptionPurple;
  const fillColor = isRestoredProgression ? ECHO_PALETTE.restorationCyanGlow : ECHO_PALETTE.corruptionPurpleGlow;
  return { strokeColor, fillColor };
}

export interface EchoPlayerDrawContext {
  render: RenderComponentLike;
  size: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  isAttacking: boolean;
  isInvulnerable: boolean;
  isHitFlash: boolean;
  health?: HealthComponentLike;
}

export function resolveEchoPlayerDrawContext(
  world: World,
  entity: number
): EchoPlayerDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponentLike | undefined;
  if (!render || !render.visible) return null;
  const size = render.size || 20;

  const vel = world.getComponent(entity, "Velocity") as VelocityComponentLike | undefined;
  const groundState = world.getComponent(entity, "PlatformerGroundState") as GroundStateComponentLike | undefined;
  const input = world.getComponent(entity, "PlatformerInput") as PlatformerInputComponentLike | undefined;
  const health = world.getComponent(entity, "Health") as HealthComponentLike | undefined;

  const vx = vel ? vel.vx : 0;
  const vy = vel ? vel.vy : 0;
  const isGrounded = groundState ? groundState.isGrounded ?? true : true;
  const isAttacking = Boolean(input && input.pulseCooldown !== undefined && input.pulseCooldown > 0.25);
  const isInvulnerable = Boolean(health && health.invulnerableRemaining && health.invulnerableRemaining > 0);
  const isHitFlash = Boolean(render.hitFlashFrames !== undefined && render.hitFlashFrames > 0);

  return {
    render,
    size,
    vx,
    vy,
    isGrounded,
    isAttacking,
    isInvulnerable,
    isHitFlash,
    health,
  };
}

export interface EchoMemoryFragmentDrawContext {
  render: RenderComponentLike;
  size: number;
  elapsed: number;
  hoverOffset: number;
  strokeColor: string;
  fillColor: string;
}

export function resolveEchoMemoryFragmentDrawContext(
  world: World,
  entity: number
): EchoMemoryFragmentDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponentLike | undefined;
  if (!render || !render.visible) return null;
  const size = render.size || 16;
  const elapsed = world.tick * 0.016;
  const hoverOffset = Math.sin(elapsed * 6) * 4;

  const runState = world.getResource<RunStateResource>("RunState");
  const collectedCount = runState?.collectedTemporalIds?.length || 0;
  const { strokeColor, fillColor } = resolveMemoryFragmentColors(collectedCount);

  return {
    render,
    size,
    elapsed,
    hoverOffset,
    strokeColor,
    fillColor,
  };
}

export interface EchoCollectibleDrawContext {
  render: RenderComponentLike;
  size: number;
  elapsed: number;
  hoverOffset: number;
}

export function resolveEchoCollectibleDrawContext(
  world: World,
  entity: number,
  defaultSize = 24
): EchoCollectibleDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponentLike | undefined;
  if (!render || !render.visible) return null;
  const size = render.size || defaultSize;
  const elapsed = world.tick * 0.016;
  const hoverOffset = Math.sin(elapsed * 4) * 6;

  return {
    render,
    size,
    elapsed,
    hoverOffset,
  };
}

export interface EchoCheckpointDrawContext {
  render: RenderComponentLike;
  size: number;
  isActive: boolean;
}

export function resolveEchoCheckpointDrawContext(
  world: World,
  entity: number
): EchoCheckpointDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponentLike | undefined;
  if (!render || !render.visible) return null;
  const size = render.size || 32;
  const respawnPoint = world.getComponent(entity, "RespawnPoint") as RespawnPointComponentLike | undefined;
  const runState = world.getResource<RunStateResource>("RunState");
  const isActive = Boolean(runState && respawnPoint && runState.activeCheckpoint === respawnPoint.checkpointId);

  return {
    render,
    size,
    isActive,
  };
}

export interface EchoBackgroundContext {
  width: number;
  height: number;
  elapsed: number;
}

export function resolveEchoBackgroundContext(world: World): EchoBackgroundContext {
  const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
  const width = screenConfig.width;
  const height = screenConfig.height;
  const runState = world.getResource<RunStateResource>("RunState");
  const elapsed = runState?.elapsedTime || (world.tick * 0.016);

  return { width, height, elapsed };
}
