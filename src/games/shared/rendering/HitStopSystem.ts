import { System, SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { getVFXState, VFXWorldState } from "./SharedVFXInternal";

export enum HitStopPriority {
  LOW = 5,
  NORMAL = 10,
  HIGH = 20,
  CRITICAL = 30
}

export function isHitStopActive<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>
): boolean {
  const state = getVFXState(world);
  return state.hitStopTimer > 0;
}

export function requestHitStop<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>,
  durationMs: number,
  priority: HitStopPriority | number = HitStopPriority.NORMAL
): boolean {
  const state = getVFXState(world);
  const durationSec = durationMs / 1000;

  // Rule FR-3: Priority override matrix
  // Higher priority always overrides lower priority.
  // Equal or lower priority is ignored if active or in cooldown.
  if (state.hitStopTimer > 0) {
    if (priority > state.hitStopPriority) {
      state.hitStopTimer = durationSec;
      state.hitStopPriority = priority;
      return true;
    }
    return false;
  }

  if (state.hitStopCooldown > 0 && priority <= state.hitStopPriority) {
    return false;
  }

  state.hitStopTimer = durationSec;
  state.hitStopPriority = priority;
  state.hitStopCooldown = 0;
  return true;
}

export class HitStopSystem extends System<CoreComponentRegistry> {
  constructor() {
    super();
  }

  public update(world: World<CoreComponentRegistry>, dt: number): void {
    const state = getVFXState(world);

    if (state.hitStopTimer > 0) {
      state.hitStopTimer -= dt;
      if (state.hitStopTimer <= 0) {
        state.hitStopTimer = 0;
        state.hitStopPriority = 0;
        state.hitStopCooldown = 0.05; // 50ms anti-chaining cooldown
      }
    } else if (state.hitStopCooldown > 0) {
      state.hitStopCooldown -= dt;
      if (state.hitStopCooldown < 0) {
        state.hitStopCooldown = 0;
      }
    }
  }
}
