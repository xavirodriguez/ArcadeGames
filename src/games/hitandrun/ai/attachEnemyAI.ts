import { World, CoreComponentRegistry, Entity } from "@tiny-aster/core";
import { resolveAIFromTags } from "./behaviorTagResolver";
import type { HitRunEnemyArchetypeId } from "../waves/HitRunWaveTypes";
import { getEnemyArchetype } from "../waves/HitRunEnemyArchetypes";

export interface AttachEnemyAIOptions {
  archetypeId: HitRunEnemyArchetypeId;
  /** Override tags (default: arquetipo.behaviorTags). */
  tags?: string[];
  /** Ancho de patrulla a cada lado del spawn (px). */
  patrolHalfWidth?: number;
  visionRange?: number;
}

/**
 * Adjunta StateMachine + sensores según behaviorTags.
 * Llamar justo después de spawnear el enemigo (pool / wave).
 */
export function attachEnemyAI(
  world: World<CoreComponentRegistry>,
  entity: Entity,
  opts: AttachEnemyAIOptions
): void {
  const arch = getEnemyArchetype(opts.archetypeId);
  const tags = opts.tags ?? arch?.behaviorTags ?? [];
  const resolved = resolveAIFromTags(tags, opts.archetypeId, arch?.speed);

  if (opts.visionRange !== undefined) {
    resolved.data.visionRange = opts.visionRange;
  }

  // PlayerSensor
  if (resolved.needsPlayerSensor) {
    world.addComponent(entity, {
      type: "PlayerSensor",
      visionRange: (resolved.data.visionRange as number) ?? 180,
      detectedPlayerEntity: undefined
    } as any);
  }

  // Patrol + GroundDetector
  if (resolved.needsPatrol) {
    const tr = world.getComponent(entity, "Transform");
    const x = tr?.x ?? 0;
    const half = opts.patrolHalfWidth ?? 64;
    world.addComponent(entity, {
      type: "Patrol",
      direction: 1,
      startX: x - half,
      endX: x + half
    } as any);
    world.addComponent(entity, {
      type: "GroundDetector",
      sensorOffsetX: 10,
      sensorOffsetY: 14,
      hasWallAhead: false,
      hasGroundAhead: true
    } as any);
  }

  // Charger también se beneficia de GroundDetector en Attack
  if (resolved.machineId === "hr_charge" && !world.hasComponent(entity, "GroundDetector")) {
    world.addComponent(entity, {
      type: "GroundDetector",
      sensorOffsetX: 12,
      sensorOffsetY: 14,
      hasWallAhead: false,
      hasGroundAhead: true
    } as any);
  }

  // StateMachine
  world.addComponent(entity, {
    type: "StateMachine",
    machineId: resolved.machineId,
    currentState: resolved.initialState,
    previousState: resolved.initialState,
    elapsedMs: 0,
    data: {
      ...resolved.data,
      shootCooldownRemaining: 0
    }
  } as any);
}
