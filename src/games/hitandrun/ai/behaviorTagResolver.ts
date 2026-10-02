import type { HitRunEnemyArchetypeId } from "../waves/HitRunWaveTypes";
import { getEnemyArchetype } from "../waves/HitRunEnemyArchetypes";

export type HitRunMachineId =
  | "hr_walk"
  | "hr_hop"
  | "hr_charge"
  | "hr_shooter"
  | "hr_tank"
  | "hr_flank";

export interface ResolvedEnemyAI {
  machineId: HitRunMachineId;
  initialState: string;
  data: Record<string, unknown>;
  needsPlayerSensor: boolean;
  needsPatrol: boolean;
  canShoot: boolean;
  shootCooldown: number;
  shootDamage: number;
  shootCategory: string;
}

/**
 * Prioridad: flank > charge > hop > tank > walk > shooter.
 * Tag `flank` activa useFlank en cualquier máquina y puede forzar hr_flank.
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
  const useFlank = t.has("flank") || t.has("pincer");

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
    shootSpeed: shootHeavy ? 200 : 280,
    useFlank,
    // Parámetros de flanqueo data-driven
    flankOffsetX: useFlank ? 72 : 48,
    flankArriveRadius: 18,
    flankMaxDuration: 1.4,
    flankSpeedMult: 1.2
  };

  // Especialista en pinza
  if (t.has("flank") || t.has("pincer")) {
    // Si también es charge/hop, se queda en esa locomoción con useFlank=true
    if (!t.has("charge") && !t.has("hop") && !t.has("tank")) {
      return {
        machineId: "hr_flank",
        initialState: "Patrol",
        data: {
          ...baseData,
          useFlank: true,
          patrolSpeed: speed * 1.05,
          attackDuration: 0.35,
          recoveryDuration: 0.28,
          flankOffsetX: 80,
          flankMaxDuration: 1.6
        },
        needsPlayerSensor: true,
        needsPatrol: true,
        canShoot,
        shootCooldown: baseData.shootCooldown as number,
        shootDamage: baseData.shootDamage as number,
        shootCategory: baseData.shootCategory as string
      };
    }
  }

  if (t.has("charge")) {
    return {
      machineId: "hr_charge",
      initialState: "Idle",
      data: {
        ...baseData,
        attackDuration: 0.9,
        recoveryDuration: 0.5,
        // Charge + flank: breve reposicionamiento lateral antes de embestir
        useFlank,
        alertDuration: useFlank ? 0.15 : 0.25
      },
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
      data: { ...baseData, attackDuration: 0.85, useFlank },
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
        visionRange: 220,
        useFlank: useFlank || true, // tanks siempre buscan ángulo
        flankOffsetX: 96,
        flankMaxDuration: 1.8,
        flankSpeedMult: 0.9
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
    if (canShoot && !t.has("walk") && !t.has("block")) {
      return {
        machineId: "hr_shooter",
        initialState: "Idle",
        data: { ...baseData, useFlank },
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
        patrolSpeed: t.has("block") ? speed * 0.55 : speed,
        useFlank: useFlank || t.has("walk") // walk flanquea por defecto (presión lateral)
      },
      needsPlayerSensor: true,
      needsPatrol: true,
      canShoot,
      shootCooldown: baseData.shootCooldown as number,
      shootDamage: baseData.shootDamage as number,
      shootCategory: baseData.shootCategory as string
    };
  }

  return {
    machineId: "hr_walk",
    initialState: "Patrol",
    data: { ...baseData, useFlank: true },
    needsPlayerSensor: true,
    needsPatrol: true,
    canShoot: false,
    shootCooldown: 1,
    shootDamage: 1,
    shootCategory: "enemy_bullet"
  };
}
