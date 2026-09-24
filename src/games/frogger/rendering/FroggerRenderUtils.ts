import { World, RenderComponent, resolveThemeColor } from "@tiny-aster/core";
import { FroggerComponentRegistry, GoalLilyPadComponent } from "../types/FroggerTypes";

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
  const primaryColor = resolveThemeColor(world, "frogger", "player") || "#39FF14";

  return {
    render,
    size,
    half,
    isInvuln,
    primaryColor,
  };
}

export interface TurtleShellSegment {
  segX: number;
}

export function resolveFroggerShellSegments(width: number): TurtleShellSegment[] {
  const halfW = width / 2;
  const segmentCount = Math.floor(width / 35);
  const step = width / segmentCount;
  const segments: TurtleShellSegment[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const segX = -halfW + i * step + step / 2;
    segments.push({ segX });
  }

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
