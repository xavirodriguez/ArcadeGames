import {
  EventBus,
  TimeScale,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { createBeltInputComponent } from "../belt/BeltMovementTypes";
import {
  DEATH_FLOW_RESOURCE,
  HitRunDeathFlowState,
  registerHitRunDeathFlow
} from "../systems/HitRunDeathFlowSystem";

function createDeathScenario(): {
  world: World<CoreComponentRegistry>;
  bus: EventBus;
  player: number;
} {
  const world = new World<CoreComponentRegistry>();
  const bus = new EventBus();
  world.setResource("EventBus", bus);
  world.setResource("RunState", { deaths: 0 });

  const player = world.createEntity();
  world.addComponent(player, createBeltInputComponent());
  world.addComponent(player, { type: "Faction", value: "player" });

  registerHitRunDeathFlow(world);
  return { world, bus, player };
}

function getFlow(world: World<CoreComponentRegistry>): HitRunDeathFlowState {
  const flow = world.getResource<HitRunDeathFlowState>(DEATH_FLOW_RESOURCE);
  if (!flow) throw new Error("Death flow state was not registered.");
  return flow;
}

describe("Hit & Run death recovery lifecycle", () => {
  it("uses the TimeScale object contract and measures the recovery window in wall time", () => {
    const { world, bus, player } = createDeathScenario();

    bus.emitDeferred("combat:death", { entity: player, category: "test" });
    bus.flushDeferred();

    // The first tick starts the flow and consumes 100 ms of the 450 ms window.
    world.update(0.1);

    expect(getFlow(world).active).toBe(true);
    expect(getFlow(world).remaining).toBeCloseTo(0.35, 8);
    expect(world.getResource<TimeScale>("TimeScale")?.scale).toBe(0.28);

    // This system is runsWhileFrozen and receives the raw 360 ms delta,
    // not the scheduler's 100.8 ms scaled delta.
    world.update(0.36);

    expect(getFlow(world).active).toBe(false);
    expect(getFlow(world).requestRestart).toBe(true);
    expect(getFlow(world).remaining).toBeLessThanOrEqual(0);
    expect(world.getResource<TimeScale>("TimeScale")?.scale).toBe(1);
  });

  it("counts duplicate lethal events only once through slow motion and restart request", () => {
    const { world, bus, player } = createDeathScenario();

    bus.emitDeferred("combat:death", { entity: player, category: "test" });
    bus.emitDeferred("combat:death", { entity: player, category: "test" });
    bus.flushDeferred();
    world.update(0.05);

    expect(
      world.getResource<{ deaths: number }>("RunState")?.deaths
    ).toBe(1);

    bus.emitDeferred("combat:death", { entity: player, category: "duplicate" });
    bus.flushDeferred();
    world.update(0.05);

    expect(
      world.getResource<{ deaths: number }>("RunState")?.deaths
    ).toBe(1);

    world.update(0.4);
    expect(getFlow(world).requestRestart).toBe(true);

    bus.emitDeferred("combat:death", { entity: player, category: "stale" });
    bus.flushDeferred();
    world.update(0.05);

    expect(
      world.getResource<{ deaths: number }>("RunState")?.deaths
    ).toBe(1);
    expect(getFlow(world).requestRestart).toBe(true);
  });

  it("suspends the recovery timer during an explicit pause", () => {
    const { world, bus, player } = createDeathScenario();

    bus.emitDeferred("combat:death", { entity: player, category: "test" });
    bus.flushDeferred();
    world.update(0.1);

    const remainingBeforePause = getFlow(world).remaining;
    world.setResource("IsPaused", true);
    world.update(0.25);

    expect(getFlow(world).remaining).toBe(remainingBeforePause);
    expect(getFlow(world).active).toBe(true);

    world.setResource("IsPaused", false);
    world.update(0.36);

    expect(getFlow(world).requestRestart).toBe(true);
    expect(world.getResource<TimeScale>("TimeScale")?.scale).toBe(1);
  });
});
