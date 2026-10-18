import type { Entity, World } from "@tiny-aster/core";
import type { CoreComponentRegistry } from "@tiny-aster/core";
import { resolveEchoRunnerPalette, type EchoRunnerResolvedPalette } from "./EchoRunnerVisualUtils";

export interface EchoRunnerStateSwitchDrawData {
  readonly palette: EchoRunnerResolvedPalette;
  readonly size: number;
  readonly color: string;
  readonly activated: boolean;
}

export interface EchoRunnerStateGateDrawData {
  readonly palette: EchoRunnerResolvedPalette;
  readonly size: number;
  readonly width: number;
  readonly color: string;
  readonly isOpen: boolean;
}

export interface EchoRunnerDeathZoneDrawData {
  readonly palette: EchoRunnerResolvedPalette;
  readonly width: number;
  readonly height: number;
}

/** Resolve the shared visual contract for a Pulse-activated switch. */
export function resolveEchoRunnerStateSwitchDrawData(
  world: World<CoreComponentRegistry>,
  entity: Entity
): EchoRunnerStateSwitchDrawData | null {
  const trigger = world.getComponent(entity, "StateTrigger");
  const render = world.getComponent(entity, "Render");
  if (!trigger || !render) return null;

  const palette = resolveEchoRunnerPalette(world);
  return {
    palette,
    size: render.size ?? 26,
    color: trigger.activated ? palette.restorationCyan : palette.corruptionCrimson,
    activated: trigger.activated
  };
}

/** Resolve the shared visual contract for a gate and its current open state. */
export function resolveEchoRunnerStateGateDrawData(
  world: World<CoreComponentRegistry>,
  entity: Entity
): EchoRunnerStateGateDrawData | null {
  const gate = world.getComponent(entity, "StateGate");
  const render = world.getComponent(entity, "Render");
  if (!gate || !render) return null;

  const palette = resolveEchoRunnerPalette(world);
  return {
    palette,
    size: render.size ?? 60,
    width: (render.size ?? 60) * 0.42,
    color: gate.isOpen ? palette.restorationCyan : palette.corruptionCrimson,
    isOpen: gate.isOpen
  };
}

/** Resolve lethal-zone geometry from the same Collider2D data used by physics. */
export function resolveEchoRunnerDeathZoneDrawData(
  world: World<CoreComponentRegistry>,
  entity: Entity
): EchoRunnerDeathZoneDrawData | null {
  const render = world.getComponent(entity, "Render");
  const collider = world.getComponent(entity, "Collider2D");
  if (!render || !collider || collider.shape.type !== "aabb") return null;

  return {
    palette: resolveEchoRunnerPalette(world),
    width: collider.shape.halfWidth * 2,
    height: collider.shape.halfHeight * 2
  };
}
