import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import type { GameplayFreeze } from "@tiny-aster/core";
import { getVFXState } from "./SharedVFXInternal";

export const HitStopPriority = {
  LOW: 5,
  NORMAL: 10,
  HIGH: 20,
  CRITICAL: 30,
} as const;

export type HitStopPriority = (typeof HitStopPriority)[keyof typeof HitStopPriority];

/**
 * Reports an active Juice-owned hit-stop. GameplayFreeze remains the sole
 * authority for whether the scheduler is actually frozen.
 */
export function isHitStopActive<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>
): boolean {
  const state = getVFXState(world);
  const freeze = world.getResource<GameplayFreeze>("GameplayFreeze");
  return state.hitStopActive && freeze !== undefined &&
    typeof freeze.remaining === "number" && freeze.remaining > 0;
}

/**
 * Requests a finite gameplay freeze through the core scheduler contract.
 * Priority and anti-chaining cooldown are policy state only; they never own
 * or decrement a second duration timer.
 */
export function requestHitStop<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>,
  durationMs: number,
  priority: HitStopPriority | number = HitStopPriority.NORMAL
): boolean {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(priority)) {
    return false;
  }

  const state = getVFXState(world);
  const durationSeconds = durationMs / 1000;
  const freeze = world.getResource<GameplayFreeze>("GameplayFreeze");

  // An active Juice hit-stop may be extended only by a strictly higher priority.
  if (state.hitStopActive && freeze && typeof freeze.remaining === "number" && freeze.remaining > 0) {
    if (priority <= state.hitStopPriority) return false;

    world.setResource("GameplayFreeze", { remaining: durationSeconds });
    state.hitStopPriority = priority;
    state.hitStopCooldown = 0;
    return true;
  }

  // Do not override freezes owned by pause, Hit & Run, or another gameplay
  // subsystem. Those callers already use the canonical resource directly.
  if (freeze !== undefined) return false;

  // The previous finite hit-stop may have been cleared explicitly between
  // system updates. Preserve its anti-chaining policy in that case.
  if (state.hitStopActive) {
    state.hitStopActive = false;
    state.hitStopCooldown = 0.05;
  }

  if (state.hitStopCooldown > 0 && priority <= state.hitStopPriority) {
    return false;
  }

  world.setResource("GameplayFreeze", { remaining: durationSeconds });
  state.hitStopActive = true;
  state.hitStopPriority = priority;
  state.hitStopCooldown = 0;
  return true;
}

/**
 * Policy lifecycle only. Schedule owns and decrements GameplayFreeze.
 * This system must run while frozen so it can observe expiry and advance the
 * 50ms anti-chaining cooldown without introducing another active timer.
 */
export class HitStopSystem extends System<CoreComponentRegistry> {
  public override runsWhileFrozen = true;

  public update(world: World<CoreComponentRegistry>, dt: number): void {
    const state = getVFXState(world);
    const freeze = world.getResource<GameplayFreeze>("GameplayFreeze");

    if (state.hitStopActive) {
      if (
        freeze === undefined ||
        (typeof freeze.remaining === "number" && freeze.remaining <= 0)
      ) {
        state.hitStopActive = false;
        state.hitStopCooldown = 0.05;
      }
      return;
    }

    if (state.hitStopCooldown > 0) {
      state.hitStopCooldown = Math.max(0, state.hitStopCooldown - dt);
      if (state.hitStopCooldown === 0) {
        state.hitStopPriority = 0;
      }
    }
  }
}
