import type { HitRunEnemyArchetypeId } from "../waves/HitRunWaveTypes";
import { getEnemyArchetype } from "../waves/HitRunEnemyArchetypes";

/** Machine IDs registrados en StateMachineRegistry para Hit&Run. */
export type HitRunMachineId =
  | "hr_walk"
  | "hr_hop"
  | "hr_charge"
  | "hr_shooter"
  | "hr_tank";

export interface ResolvedEnemyAI {
  machineId: HitRunMachineId;
  initialState: string;
  /** Datos inyectados en StateMachine.data (duraciones, speeds, etc.). */
  data: Record<string, unknown>;
  /** Si debe spawnear con PlayerSensor. */
  needsPlayerSensor: boolean;
  /** Si debe spawnear con Patrol + GroundDetector. */
  needsPatrol: boolean;
  /** Si dispara proyectiles. */
  canShoot: boolean;
  shootCooldown: number;
  shootDamage: number;
  shootCategory: string;
}

/**
 * Resuelve behaviorTags del arquetipo → máquina + parámetros.
 * Prioridad de locomoción: charge > hop > tank > walk > shooter puro.
 */
export function resolveAIFromTags(
  tags: string[] | undefined,
  archetypeId: HitRunEnemyArchetypeId,
  archetypeSpeed?: number
): ResolvedEnemyAI {
  const t = new Set(tags ?? []);
  const arch = getEnemyArchetype(archetypeId);
  const speed = archetypeSpeed ?? arch?.speed ?? 60;

  const canShoot = t.has("shoot_slow") || t.has("shoot_heavy");
  const shootHeavy = t.has("shoot_heavy");

  const baseData: Record<string, unknown> = {
    patrolSpeed: speed,
    alertDuration: 0.25,
    windupDuration: 0.2,
    attackDuration: 0.4,
    recoveryDuration: 0.35,
    idleDuration: 0.8,
    jumpVelocity: 240,
    chargeSpeed: Math.max(speed * 2.2, 280),
    visionRange: 180,
    canShoot,
    shootCooldown: shootHeavy ? 1.4 : 0.9,
    shootDamage: shootHeavy ? 2 : 1,
    shootCategory: shootHeavy ? "enemy_heavy" : "enemy_bullet",
    shootSpeed: shootHeavy ? 200 : 280
  };

  // Locomoción dominante
  if (t.has("charge")) {
    return {
      machineId: "hr_charge",
      initialState: "Idle",
      data: { ...baseData, attackDuration: 0.9, recoveryDuration: 0.5 },
      needsPlayerSensor: true,
      needsPatrol: false,
      canShoot,
      shootCooldown: baseData.shootCooldown as number,
      shootDamage: baseData.shootDamage as number,
      shootCategory: baseData.shootCategory as string
    };
  }

  if (t.has("hop")) {
    return {
      machineId: "hr_hop",
      initialState: "Idle",
      data: { ...baseData, attackDuration: 0.85 },
      needsPlayerSensor: true,
      needsPatrol: false,
      canShoot,
      shootCooldown: baseData.shootCooldown as number,
      shootDamage: baseData.shootDamage as number,
      shootCategory: baseData.shootCategory as string
    };
  }

  if (t.has("tank") || t.has("shoot_heavy")) {
    return {
      machineId: "hr_tank",
      initialState: "Idle",
      data: {
        ...baseData,
        patrolSpeed: speed * 0.6,
        alertDuration: 0.35,
        windupDuration: 0.4,
        attackDuration: 0.15,
        recoveryDuration: 0.8,
        visionRange: 220
      },
      needsPlayerSensor: true,
      needsPatrol: true,
      canShoot: true,
      shootCooldown: baseData.shootCooldown as number,
      shootDamage: baseData.shootDamage as number,
      shootCategory: baseData.shootCategory as string
    };
  }

  if (t.has("walk") || t.has("block") || t.has("shoot_slow")) {
    // Caminante / muro / shooter ligero
    if (canShoot && !t.has("walk") && !t.has("block")) {
      return {
        machineId: "hr_shooter",
        initialState: "Idle",
        data: baseData,
        needsPlayerSensor: true,
        needsPatrol: false,
        canShoot: true,
        shootCooldown: baseData.shootCooldown as number,
        shootDamage: baseData.shootDamage as number,
        shootCategory: baseData.shootCategory as string
      };
    }
    return {
      machineId: "hr_walk",
      initialState: "Patrol",
      data: {
        ...baseData,
        // block = más lento
        patrolSpeed: t.has("block") ? speed * 0.55 : speed
      },
      needsPlayerSensor: true,
      needsPatrol: true,
      canShoot,
      shootCooldown: baseData.shootCooldown as number,
      shootDamage: baseData.shootDamage as number,
      shootCategory: baseData.shootCategory as string
    };
  }

  // Fallback
  return {
    machineId: "hr_walk",
    initialState: "Patrol",
    data: baseData,
    needsPlayerSensor: true,
    needsPatrol: true,
    canShoot: false,
    shootCooldown: 1,
    shootDamage: 1,
    shootCategory: "enemy_bullet"
  };
}
