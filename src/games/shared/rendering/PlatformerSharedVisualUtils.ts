import { World, resolveThemeColorWithFallback } from "@tiny-aster/core";

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

export const DEFAULT_ECHO_PALETTE = {
  restorationCyan: "#00f0ff",
  restorationCyanGlow: "rgba(0, 240, 255, 0.4)",
  restorationCyanFade: "rgba(0, 240, 255, 0.08)",
  restorationGold: "#fbbf24",
  restorationGoldGlow: "rgba(251, 191, 36, 0.5)",
  restorationWhite: "#ffffff",
  corruptionCrimson: "#ff0055",
  corruptionCrimsonGlow: "rgba(255, 0, 85, 0.4)",
  corruptionAmber: "#f97316",
  corruptionPurple: "#a855f7",
  corruptionPurpleGlow: "rgba(168, 85, 247, 0.4)",
  archiveVoidDark: "#060913",
  archiveSlate: "#1e293b",
  archiveBorderDark: "#0f172a",
  archiveBorderLight: "#334155",
  archiveGridLine: "rgba(0, 240, 255, 0.05)",
  archiveGridLineSecondary: "rgba(168, 85, 247, 0.03)",
  archiveDataStream: "rgba(255, 0, 85, 0.06)",
  archiveNodeActive: "#10b981",
  archiveNodeInactive: "#ef4444",
  watcher: "#3b82f6",
  shadowColor: "rgba(0, 0, 0, 0.35)",
} as const;

export interface EchoRunnerResolvedPalette {
  restorationCyan: string;
  restorationCyanGlow: string;
  restorationCyanFade: string;
  restorationGold: string;
  restorationGoldGlow: string;
  restorationWhite: string;

  corruptionCrimson: string;
  corruptionCrimsonGlow: string;
  corruptionAmber: string;
  corruptionPurple: string;
  corruptionPurpleGlow: string;

  archiveVoidDark: string;
  archiveSlate: string;
  archiveBorderDark: string;
  archiveBorderLight: string;
  archiveGridLine: string;
  archiveGridLineSecondary: string;
  archiveDataStream: string;
  archiveNodeActive: string;
  archiveNodeInactive: string;
  watcher: string;
  shadowColor: string;
}

export function resolveEchoRunnerPalette(world: World): EchoRunnerResolvedPalette {
  return {
    restorationCyan: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.restorationCyan, "restorationCyan", "player", "primary"),
    restorationCyanGlow: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.restorationCyanGlow, "restorationCyanGlow", "primaryGlow"),
    restorationCyanFade: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.restorationCyanFade, "restorationCyanFade"),
    restorationGold: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.restorationGold, "restorationGold", "secondary"),
    restorationGoldGlow: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.restorationGoldGlow, "restorationGoldGlow", "secondaryGlow"),
    restorationWhite: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.restorationWhite, "restorationWhite", "white"),

    corruptionCrimson: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.corruptionCrimson, "corruptionCrimson", "enemy", "accent"),
    corruptionCrimsonGlow: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.corruptionCrimsonGlow, "corruptionCrimsonGlow", "accentGlow"),
    corruptionAmber: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.corruptionAmber, "corruptionAmber", "amber"),
    corruptionPurple: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.corruptionPurple, "corruptionPurple", "purple"),
    corruptionPurpleGlow: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.corruptionPurpleGlow, "corruptionPurpleGlow", "purpleGlow"),

    archiveVoidDark: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveVoidDark, "archiveVoidDark", "background"),
    archiveSlate: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveSlate, "archiveSlate", "surface", "world"),
    archiveBorderDark: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveBorderDark, "archiveBorderDark", "borderDark"),
    archiveBorderLight: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveBorderLight, "archiveBorderLight", "borderLight"),
    archiveGridLine: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveGridLine, "archiveGridLine", "gridLine"),
    archiveGridLineSecondary: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveGridLineSecondary, "archiveGridLineSecondary", "gridLineSecondary"),
    archiveDataStream: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveDataStream, "archiveDataStream", "dataStream"),
    archiveNodeActive: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveNodeActive, "archiveNodeActive", "nodeActive"),
    archiveNodeInactive: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.archiveNodeInactive, "archiveNodeInactive", "nodeInactive"),
    watcher: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.watcher, "watcher", "blue"),
    shadowColor: resolveThemeColorWithFallback(world, DEFAULT_ECHO_PALETTE.shadowColor, "shadowColor", "shadow"),
  };
}

export interface EchoDrawContext {
  render: RenderComponentLike;
  size: number;
  isHitFlash: boolean;
  state: string;
  palette: EchoRunnerResolvedPalette;
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
  const palette = resolveEchoRunnerPalette(world);

  return { render, size, isHitFlash, state, palette };
}

export interface EchoPlayerPose {
  tiltAngle: number;
  hoverY: number;
  leftLegX: number;
  leftLegY: number;
  rightLegX: number;
  rightLegY: number;
}

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

export function resolveHopperVisualState(state: string, palette: EchoRunnerResolvedPalette): HopperVisualState {
  const isAlert = state === "Alert" || state === "Windup" || state === "Compress";
  const isAttack = state === "Attack";
  const glowColor = isAttack ? palette.restorationCyan : (isAlert ? palette.corruptionAmber : palette.archiveNodeActive);

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

export function resolveSentinelVisualState(state: string, palette: EchoRunnerResolvedPalette): SentinelVisualState {
  const isAlert = state === "Alert" || state === "Windup";
  const isAttack = state === "Attack";
  const glowColor = isAlert ? palette.corruptionAmber : (isAttack ? palette.corruptionCrimson : palette.corruptionPurple);
  return { isAlert, isAttack, glowColor };
}

export interface WatcherVisualState {
  isAlert: boolean;
  isAttack: boolean;
  glowColor: string;
}

export function resolveWatcherVisualState(state: string, palette: EchoRunnerResolvedPalette): WatcherVisualState {
  const isAlert = state === "Alert" || state === "Windup";
  const isAttack = state === "Attack";
  const glowColor = isAttack ? palette.corruptionCrimson : (isAlert ? palette.corruptionAmber : palette.watcher);
  return { isAlert, isAttack, glowColor };
}

export interface ChargerVisualState {
  isStunned: boolean;
  isAlert: boolean;
  isAttack: boolean;
  glowColor: string;
}

export function resolveChargerVisualState(state: string, palette: EchoRunnerResolvedPalette): ChargerVisualState {
  const isStunned = state === "Recovery" || state === "Stunned";
  const isAlert = state === "Alert" || state === "Windup";
  const isAttack = state === "Attack";
  const glowColor = isStunned ? palette.restorationGold : (isAlert ? palette.corruptionAmber : palette.corruptionCrimson);
  return { isStunned, isAlert, isAttack, glowColor };
}

export function resolveMemoryFragmentColors(collectedCount: number, palette: EchoRunnerResolvedPalette): { strokeColor: string; fillColor: string } {
  const isRestoredProgression = collectedCount >= 5;
  const strokeColor = isRestoredProgression ? palette.restorationCyan : palette.corruptionPurple;
  const fillColor = isRestoredProgression ? palette.restorationCyanGlow : palette.corruptionPurpleGlow;
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
  palette: EchoRunnerResolvedPalette;
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
  const palette = resolveEchoRunnerPalette(world);

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
    palette,
  };
}

export interface EchoMemoryFragmentDrawContext {
  render: RenderComponentLike;
  size: number;
  elapsed: number;
  hoverOffset: number;
  strokeColor: string;
  fillColor: string;
  palette: EchoRunnerResolvedPalette;
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
  const palette = resolveEchoRunnerPalette(world);
  const { strokeColor, fillColor } = resolveMemoryFragmentColors(collectedCount, palette);

  return {
    render,
    size,
    elapsed,
    hoverOffset,
    strokeColor,
    fillColor,
    palette,
  };
}

export interface EchoCollectibleDrawContext {
  render: RenderComponentLike;
  size: number;
  elapsed: number;
  hoverOffset: number;
  palette: EchoRunnerResolvedPalette;
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
  const palette = resolveEchoRunnerPalette(world);

  return {
    render,
    size,
    elapsed,
    hoverOffset,
    palette,
  };
}

export interface EchoCheckpointDrawContext {
  render: RenderComponentLike;
  size: number;
  isActive: boolean;
  palette: EchoRunnerResolvedPalette;
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
  const palette = resolveEchoRunnerPalette(world);

  return {
    render,
    size,
    isActive,
    palette,
  };
}

export interface EchoBackgroundContext {
  width: number;
  height: number;
  elapsed: number;
  palette: EchoRunnerResolvedPalette;
}

export function resolveEchoBackgroundContext(world: World): EchoBackgroundContext {
  const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
  const width = screenConfig.width;
  const height = screenConfig.height;
  const runState = world.getResource<RunStateResource>("RunState");
  const elapsed = runState?.elapsedTime || (world.tick * 0.016);
  const palette = resolveEchoRunnerPalette(world);

  return { width, height, elapsed, palette };
}
