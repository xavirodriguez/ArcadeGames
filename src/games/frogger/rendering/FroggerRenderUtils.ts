import { World, RenderComponent } from "@tiny-aster/core";
import { FrogFacing, FroggerComponentRegistry, GoalLilyPadComponent, TurtleDivePhase } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import { FROGGER_VISUAL_TOKENS } from "./FroggerVisualTokens";

export function shouldSkipFroggerRenderDueToInvulnerability(
  world: World<FroggerComponentRegistry>,
  entity: number
): boolean {
  const frogger = world.getComponent(entity, "Frogger");
  const health = world.getComponent(entity, "Health");
  const isInvulnerable =
    (frogger?.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) ||
    (health?.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0);

  return isInvulnerable && Math.floor(world.tick / 3) % 2 === 0;
}

export function isFroggerInvulnerable(
  world: World<FroggerComponentRegistry>,
  entity: number
): boolean {
  const frogger = world.getComponent(entity, "Frogger");
  const health = world.getComponent(entity, "Health");
  return (
    (frogger?.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) ||
    (health?.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0)
  );
}

export interface FroggerPlayerDrawContext {
  render: RenderComponent;
  size: number;
  half: number;
  isInvuln: boolean;
  primaryColor: string;
}

export function resolveFroggerPlayerDrawContext(
  world: World<FroggerComponentRegistry>,
  entity: number
): FroggerPlayerDrawContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render) return null;

  if (shouldSkipFroggerRenderDueToInvulnerability(world, entity)) {
    return null;
  }

  const isInvuln = isFroggerInvulnerable(world, entity);
  const size = render.size || 32;
  const half = size / 2;
  const primaryColor = FROGGER_VISUAL_TOKENS.frog.body;

  return {
    render,
    size,
    half,
    isInvuln,
    primaryColor,
  };
}

/**
 * Rotation for art authored facing up. The returned value is radians for Canvas
 * and can be converted to degrees for Skia; it never changes the ECS transform.
 */
export function resolveFroggerFacingRotation(facing: FrogFacing | undefined): number {
  switch (facing) {
    case "right": return Math.PI / 2;
    case "down": return Math.PI;
    case "left": return -Math.PI / 2;
    case "up":
    default: return 0;
  }
}

export interface FroggerTurtleVisualState {
  bodyColor: string;
  shellColor: string;
  opacity: number;
}

export function resolveFroggerTurtleVisualState(phase: TurtleDivePhase | undefined): FroggerTurtleVisualState {
  if (phase === "warning") {
    return {
      bodyColor: FROGGER_VISUAL_TOKENS.turtles.warning,
      shellColor: FROGGER_VISUAL_TOKENS.turtles.shell,
      opacity: 1,
    };
  }
  if (phase === "submerged") {
    return {
      bodyColor: FROGGER_VISUAL_TOKENS.turtles.submerged,
      shellColor: FROGGER_VISUAL_TOKENS.turtles.submerged,
      opacity: 0.62,
    };
  }
  return {
    bodyColor: FROGGER_VISUAL_TOKENS.turtles.body,
    shellColor: FROGGER_VISUAL_TOKENS.turtles.shell,
    opacity: 1,
  };
}

export interface TurtleShellSegment {
  segX: number;
}

const turtleShellSegmentsCache = new Map<number, readonly TurtleShellSegment[]>();

export function resolveFroggerShellSegments(width: number): readonly TurtleShellSegment[] {
  const cached = turtleShellSegmentsCache.get(width);
  if (cached) return cached;

  const halfW = width / 2;
  const segmentCount = Math.max(1, Math.floor(width / 35));
  const step = width / segmentCount;
  const segments: TurtleShellSegment[] = [];

  for (let i = 0; i < segmentCount; i += 1) {
    const segX = -halfW + i * step + step / 2;
    segments.push({ segX });
  }

  turtleShellSegmentsCache.set(width, segments);
  return segments;
}

export interface FroggerGoalContext {
  render: RenderComponent;
  pad: GoalLilyPadComponent;
  size: number;
  half: number;
  occupied: boolean;
}

export function resolveFroggerGoalContext(
  world: World<FroggerComponentRegistry>,
  entity: number
): FroggerGoalContext | null {
  const pad = world.getComponent(entity, "GoalLilyPad") as GoalLilyPadComponent | undefined;
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !pad) return null;

  const size = render.size || 36;
  const half = size / 2;
  const occupied = pad.occupied;

  return {
    render,
    pad,
    size,
    half,
    occupied,
  };
}

export interface FroggerBackgroundContext {
  config: typeof DEFAULT_FROGGER_CONFIG;
  w: number;
  grid: number;
}

export function resolveFroggerBackgroundContext(
  world: World<FroggerComponentRegistry>
): FroggerBackgroundContext {
  const config = world.getResource<typeof DEFAULT_FROGGER_CONFIG>("GameConfig") || DEFAULT_FROGGER_CONFIG;
  const w = config.worldWidth;
  const grid = config.GRID_SIZE;

  return { config, w, grid };
}

/**
 * Converts the gameplay direction sign into the local vehicle-art orientation.
 * Vehicle geometry is authored facing right and mirrored for left-moving traffic.
 */
export function resolveFroggerVehicleDirection(direction: number | undefined): -1 | 1 {
  return direction !== undefined && direction < 0 ? -1 : 1;
}

export interface FroggerSlotColors {
  slotColor: string;
  occupiedColor: string;
}

export function resolveFroggerSlotColors(_world: World<FroggerComponentRegistry>): FroggerSlotColors {
  const slotColor = FROGGER_VISUAL_TOKENS.lilyPads.free;
  const occupiedColor = FROGGER_VISUAL_TOKENS.lilyPads.occupied;
  return { slotColor, occupiedColor };
}
