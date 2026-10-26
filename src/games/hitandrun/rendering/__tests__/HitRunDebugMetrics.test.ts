import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  HIT_RUN_DEBUG_METRICS_RESOURCE,
  recordHitRunDebugAllocation,
  registerHitRunDebugMetrics
} from "../HitRunDebugMetrics";

describe("HitRunDebugMetrics", () => {
  it("reports bullet/enemy spawn counts and tracked event count for the tick", () => {
    const world = new World<CoreComponentRegistry>();
    const eventBus = new EventBus<Record<string, unknown>>();
    world.setResource("EventBus", eventBus);
    registerHitRunDebugMetrics(world);

    recordHitRunDebugAllocation(world, "bullet");
    recordHitRunDebugAllocation(world, "bullet");
    recordHitRunDebugAllocation(world, "enemy");
    eventBus.emit("combat:hit", { targetEntity: 4, amount: 1 });

    world.update(1 / 60);

    const metrics = world.getResource<{
      bulletSpawnsThisTick: number;
      enemySpawnsThisTick: number;
      trackedEventsThisTick: number;
    }>(HIT_RUN_DEBUG_METRICS_RESOURCE);
    expect(metrics).toMatchObject({
      bulletSpawnsThisTick: 2,
      enemySpawnsThisTick: 1,
      trackedEventsThisTick: 1
    });
  });
});
