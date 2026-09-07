import { ECHO_PALETTE } from "./EchoRunnerPalette";

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
