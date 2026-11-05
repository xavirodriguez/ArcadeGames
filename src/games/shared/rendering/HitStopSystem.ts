import { System } from "@tiny-aster/core";
import type { CoreComponentRegistry, World } from "@tiny-aster/core";

export const HitStopPriority = {
  LOW: 5,
  NORMAL: 10,
  HIGH: 20,
  CRITICAL: 30,
} as const;

export type HitStopPriority = (typeof HitStopPriority)[keyof typeof HitStopPriority];

export const JUICE_HIT_STOP_POLICY_RESOURCE = "JuiceHitStopPolicy";
const HIT_STOP_COOLDOWN_SECONDS = 0.05;
const JUICE_FREEZE_SOURCE = "juice";

export interface JuiceHitStopPolicyState {
  /** Priority of the active or most recently completed Juice-owned freeze. */
  priority: number;
  /** Anti-chaining cooldown in seconds. GameplayFreeze remains the only active duration clock. */
  cooldownRemaining: number;
  /** True while a positive finite Juice-owned GameplayFreeze countdown is active. */
  active: boolean;
}

function ensureHitStopPolicy<TComponents extends CoreComponentRegistry>(
  world: World<TComponents>
): JuiceHitStopPolicyState {
  if (!world.isSnapshotResourceRegistered(JUICE_HIT_STOP_POLICY_RESOURCE)) {
    world.registerSnapshotResource(JUICE_HIT_STOP_POLICY_RESOURCE);
  }

  let policy = world.getResource<JuiceHitStopPolicyState>(JUICE_HIT_STOP_POLICY_RESOURCE);
  if (!policy) {
    policy = { priority: 0, cooldownRemaining: 0, active: false };
    world.setResource(JUICE_HIT_STOP_POLICY_RESOURCE, policy);
  }
  return policy;
}

export function isHitStopActive<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>
): boolean {
  const freeze = world.getResource<{ source?: string }>("GameplayFreeze");
  // The scheduler removes an expired freeze after all phases, so source ownership
  // remains observable for the complete expiry tick.
  return freeze?.source === JUICE_FREEZE_SOURCE;
}

/**
 * Requests a deterministic gameplay freeze through the core scheduler.
 *
 * Priority/cooldown arbitration is snapshot state; the effective duration lives
 * exclusively in GameplayFreeze. Existing freezes owned by other systems are
 * never shortened or replaced by Juice.
 */
export function requestHitStop<TComponents extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TComponents>,
  durationMs: number,
  priority: HitStopPriority | number = HitStopPriority.NORMAL
): boolean {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(priority)) {
    return false;
  }

  const policy = ensureHitStopPolicy(world);
  const durationSeconds = durationMs / 1000;
  const freeze = world.getResource<{ remaining?: number; source?: string }>("GameplayFreeze");
  const freezeIsActive = freeze !== undefined &&
    (freeze.remaining === undefined || freeze.remaining > 0);
  const isOwnedJuiceFreeze = policy.active &&
    freeze?.source === JUICE_FREEZE_SOURCE &&
    typeof freeze.remaining === "number" &&
    freeze.remaining > 0;

  if (freezeIsActive) {
    if (!isOwnedJuiceFreeze || priority <= policy.priority) {
      return false;
    }

    // Higher priority replaces the one canonical scheduler countdown.
    freeze.remaining = durationSeconds;
    policy.priority = priority;
    return true;
  }

  // A freeze may have been removed by another owner between policy ticks.
  // Start cooldown once, then allow only a strictly higher priority to bypass it.
  if (policy.active) {
    policy.active = false;
    policy.cooldownRemaining = HIT_STOP_COOLDOWN_SECONDS;
  }

  if (policy.cooldownRemaining > 0 && priority <= policy.priority) {
    return false;
  }

  world.setResource("GameplayFreeze", {
    remaining: durationSeconds,
    source: JUICE_FREEZE_SOURCE
  });
  policy.active = true;
  policy.priority = priority;
  policy.cooldownRemaining = 0;
  return true;
}

export class HitStopSystem extends System<CoreComponentRegistry> {
  constructor() {
    super();
    // It must continue to observe GameplayFreeze expiry and advance cooldown
    // while the scheduler has frozen the gameplay phases.
    this.runsWhileFrozen = true;
  }

  public override onRegister(world: World<CoreComponentRegistry>): void {
    ensureHitStopPolicy(world);
  }

  public override update(world: World<CoreComponentRegistry>, dt: number): void {
    const policy = ensureHitStopPolicy(world);
    const freeze = world.getResource<{ remaining?: number; source?: string }>("GameplayFreeze");
    const ownsActiveFreeze = policy.active &&
      freeze?.source === JUICE_FREEZE_SOURCE &&
      (freeze.remaining === undefined || freeze.remaining > 0);

    if (policy.active && !ownsActiveFreeze) {
      // Schedule has already decremented the canonical freeze before phases.
      // Reaching zero here starts cooldown; this system never decrements duration.
      policy.active = false;
      policy.cooldownRemaining = HIT_STOP_COOLDOWN_SECONDS;
      return;
    }

    if (!policy.active && policy.cooldownRemaining > 0) {
      policy.cooldownRemaining = Math.max(0, policy.cooldownRemaining - dt);
      if (policy.cooldownRemaining === 0) {
        policy.priority = 0;
      }
    }
  }
}
