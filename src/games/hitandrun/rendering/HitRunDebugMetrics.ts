import { System, SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";

export const HIT_RUN_DEBUG_METRICS_RESOURCE = "HitRunDebugMetrics";

export interface HitRunDebugMetrics {
  bulletSpawnsThisTick: number;
  enemySpawnsThisTick: number;
  trackedEventsThisTick: number;
  structureChangesThisTick: number;
  pendingBulletSpawns: number;
  pendingEnemySpawns: number;
  pendingTrackedEvents: number;
  previousStructureVersion: number;
}

const TRACKED_EVENT_NAMES = [
  "combat:hit",
  "combat:death",
  "combat:explosion",
  "spawn:wave_start",
  "spawn:wave_complete",
  "game:over",
  "enemy:spawned",
  "enemy:destroyed",
  "CollectiblePickedUp",
  "PlayerDied",
  "PlaySFX"
] as const;

function getOrCreateMetrics(world: World<CoreComponentRegistry>): HitRunDebugMetrics {
  let metrics = world.getResource<HitRunDebugMetrics>(HIT_RUN_DEBUG_METRICS_RESOURCE);
  if (!metrics) {
    metrics = {
      bulletSpawnsThisTick: 0,
      enemySpawnsThisTick: 0,
      trackedEventsThisTick: 0,
      structureChangesThisTick: 0,
      pendingBulletSpawns: 0,
      pendingEnemySpawns: 0,
      pendingTrackedEvents: 0,
      previousStructureVersion: world.structureVersion
    };
    world.setResource(HIT_RUN_DEBUG_METRICS_RESOURCE, metrics);
  }
  return metrics;
}

/**
 * Records a projectile/enemy spawn attempt, including pooled reuse.
 * This measures gameplay churn, not JavaScript heap allocations.
 */
export function recordHitRunDebugAllocation(
  world: World<CoreComponentRegistry>,
  kind: "bullet" | "enemy"
): void {
  const metrics = getOrCreateMetrics(world);
  if (kind === "bullet") {
    metrics.pendingBulletSpawns++;
  } else {
    metrics.pendingEnemySpawns++;
  }
}

class HitRunDebugMetricsSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const metrics = getOrCreateMetrics(world);
    metrics.bulletSpawnsThisTick = metrics.pendingBulletSpawns;
    metrics.enemySpawnsThisTick = metrics.pendingEnemySpawns;
    metrics.trackedEventsThisTick = metrics.pendingTrackedEvents;

    metrics.pendingBulletSpawns = 0;
    metrics.pendingEnemySpawns = 0;
    metrics.pendingTrackedEvents = 0;

    metrics.structureChangesThisTick = Math.max(
      0,
      world.structureVersion - metrics.previousStructureVersion
    );
    metrics.previousStructureVersion = world.structureVersion;
  }
}

/**
 * Registers low-overhead counters for projectile/enemy spawn churn, a curated set
 * of gameplay events, and ECS structural changes. Event totals cover only
 * TRACKED_EVENT_NAMES, not every EventBus emission.
 */
export function registerHitRunDebugMetrics(world: World<CoreComponentRegistry>): void {
  if (world.getResource<boolean>("HitRunDebugMetricsRegistered") === true) return;
  const metrics = getOrCreateMetrics(world);
  metrics.previousStructureVersion = world.structureVersion;

  const eventBus = world.getEventBus();
  if (eventBus) {
    for (const eventName of TRACKED_EVENT_NAMES) {
      eventBus.on(eventName, () => {
        getOrCreateMetrics(world).pendingTrackedEvents++;
      });
    }
  }

  world.addSystem(new HitRunDebugMetricsSystem(), {
    phase: SystemPhase.Presentation,
    priority: -100
  });
  world.setResource("HitRunDebugMetricsRegistered", true);
}
