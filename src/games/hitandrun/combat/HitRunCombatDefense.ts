import { World, CoreComponentRegistry, Entity } from "@tiny-aster/core";

export interface HitRunCombatDefenseComponent {
  type: "CombatDefense";
  guard: number;
  maxGuard: number;
  guardRegenPerSecond: number;
  guardCostMultiplier: number;
  guardRegenDelay: number;
  guardRegenDelayRemaining: number;
  guardBreakDuration: number;
  guardBreakRemaining: number;
  armor: number;
  maxArmor: number;
  armorAbsorption: number;
}

export interface HitRunDamageResult {
  healthDamage: number;
  blocked: boolean;
  guardBroken: boolean;
  armorBroken: boolean;
  remainingGuard?: number;
  remainingArmor?: number;
}

export const DEFAULT_HIT_RUN_COMBAT_DEFENSE: Omit<HitRunCombatDefenseComponent, "type"> = {
  guard: 60,
  maxGuard: 60,
  guardRegenPerSecond: 18,
  guardCostMultiplier: 1.25,
  guardRegenDelay: 0.65,
  guardRegenDelayRemaining: 0,
  guardBreakDuration: 0.9,
  guardBreakRemaining: 0,
  armor: 0,
  maxArmor: 0,
  armorAbsorption: 0.5
};

export function createHitRunCombatDefense(
  overrides: Partial<Omit<HitRunCombatDefenseComponent, "type">> = {}
): HitRunCombatDefenseComponent {
  return {
    type: "CombatDefense",
    ...DEFAULT_HIT_RUN_COMBAT_DEFENSE,
    ...overrides
  };
}

/**
 * Resolves optional directional guard and armor before Health is mutated.
 * Entities without CombatDefense retain the legacy full-damage behavior.
 * Guard is effective only against attacks arriving from the entity's facing side.
 */
export function resolveHitRunDamage(
  world: World<CoreComponentRegistry>,
  source: Entity | undefined,
  target: Entity,
  incomingDamage: number
): HitRunDamageResult {
  const damage = Number.isFinite(incomingDamage) ? Math.max(0, incomingDamage) : 0;
  const defense = world.getMutableComponent(target, "CombatDefense" as never) as
    | HitRunCombatDefenseComponent
    | undefined;
  if (!defense || damage <= 0) {
    return { healthDamage: damage, blocked: false, guardBroken: false, armorBroken: false };
  }

  let remainingDamage = damage;
  let guardBroken = false;
  let armorBroken = false;
  const input = (world.getComponent(target, "BeltInput") ??
    world.getComponent(target, "PlatformerInput")) as
    | { guardHeld?: boolean }
    | undefined;
  const targetTransform = world.getComponent(target, "Transform") as
    | { x: number; worldX?: number; scaleX?: number }
    | undefined;
  const sourceTransform = source !== undefined && world.hasEntity(source)
    ? world.getComponent(source, "Transform") as
        | { x: number; worldX?: number }
        | undefined
    : undefined;
  const facing = (targetTransform?.scaleX ?? 1) >= 0 ? 1 : -1;
  const sourceX = sourceTransform?.worldX ?? sourceTransform?.x;
  const targetX = targetTransform?.worldX ?? targetTransform?.x;
  const incomingFromFront =
    sourceX !== undefined && targetX !== undefined &&
    (sourceX - targetX) * facing > 0;

  if (
    input?.guardHeld === true &&
    incomingFromFront &&
    defense.guardBreakRemaining <= 0 &&
    defense.guard > 0
  ) {
    const cost = damage * Math.max(0, defense.guardCostMultiplier);
    defense.guardRegenDelayRemaining = Math.max(0, defense.guardRegenDelay);
    if (defense.guard >= cost) {
      defense.guard = Math.max(0, defense.guard - cost);
      return {
        healthDamage: 0,
        blocked: true,
        guardBroken: false,
        armorBroken: false,
        remainingGuard: defense.guard,
        remainingArmor: defense.armor
      };
    }

    const absorbed = defense.guard / Math.max(0.0001, defense.guardCostMultiplier);
    defense.guard = 0;
    defense.guardBreakRemaining = Math.max(0, defense.guardBreakDuration);
    remainingDamage = Math.max(0, damage - absorbed);
    guardBroken = true;
  }

  if (defense.armor > 0 && remainingDamage > 0) {
    const desiredAbsorption = remainingDamage * Math.min(1, Math.max(0, defense.armorAbsorption));
    const absorbed = Math.min(defense.armor, desiredAbsorption);
    defense.armor = Math.max(0, defense.armor - absorbed);
    remainingDamage = Math.max(0, remainingDamage - absorbed);
    armorBroken = defense.armor <= 0;
  }

  return {
    healthDamage: remainingDamage,
    blocked: remainingDamage <= 0 && !guardBroken,
    guardBroken,
    armorBroken,
    remainingGuard: defense.guard,
    remainingArmor: defense.armor
  };
}

/** Fixed-step simulation-time regeneration; armor never regenerates implicitly. */
export function tickHitRunCombatDefense(
  world: World<CoreComponentRegistry>,
  deltaTime: number
): void {
  if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
  const entities = world.query("CombatDefense" as never);
  for (let i = 0; i < entities.length; i++) {
    const defense = world.getMutableComponent(entities[i], "CombatDefense" as never) as
      | HitRunCombatDefenseComponent
      | undefined;
    if (!defense) continue;
    defense.guardBreakRemaining = Math.max(0, defense.guardBreakRemaining - deltaTime);
    defense.guardRegenDelayRemaining = Math.max(0, defense.guardRegenDelayRemaining - deltaTime);
    const input = (world.getComponent(entities[i], "BeltInput") ??
      world.getComponent(entities[i], "PlatformerInput")) as
      | { guardHeld?: boolean }
      | undefined;
    if (
      input?.guardHeld !== true &&
      defense.guardRegenDelayRemaining <= 0 &&
      defense.guardBreakRemaining <= 0
    ) {
      defense.guard = Math.min(
        Math.max(0, defense.maxGuard),
        defense.guard + Math.max(0, defense.guardRegenPerSecond) * deltaTime
      );
    }
  }
}
