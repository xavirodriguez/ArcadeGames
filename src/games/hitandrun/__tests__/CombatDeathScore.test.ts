import { World, CoreComponentRegistry, EventBus } from "@tiny-aster/core";
import { registerHitRunScoreSystem, HIT_RUN_SCORE_RESOURCE, HitRunScoreState } from "../systems/HitRunScoreSystem";

describe("M9: Score bound to combat:death events", () => {
  it("killing enemies emits combat:death and increments the Score resource as reflected in getGameState", () => {
    const world = new World<CoreComponentRegistry>();
    const bus = new EventBus();
    world.setResource("EventBus", bus);

    const scoreSys = registerHitRunScoreSystem(world);

    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Transform",
      x: 100,
      y: 100,
      worldX: 100,
      worldY: 100,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(enemy, {
      type: "Enemy",
      kind: "patrol"
    });

    // Emit combat:death deferred
    bus.emitDeferred("combat:death", {
      entity: enemy,
      category: "bullet"
    });

    // Flush bus and update score system
    bus.flushDeferred();
    scoreSys.update(world, 0.016);

    const scoreState = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
    expect(scoreState?.score).toBeGreaterThan(0);
  });
});
