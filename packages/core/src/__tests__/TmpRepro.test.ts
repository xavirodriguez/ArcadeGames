import { World, CoreComponentRegistry, SystemPhase, System } from "@tiny-aster/core";
import { EntityBuilder } from "../ecs/EntityBuilder";

class ReproSystem extends System<CoreComponentRegistry> {
  public ran = 0;
  public update(world: World<CoreComponentRegistry>): void {
    this.ran++;
    EntityBuilder.createDeferred(world).withTransform({ x: 1, y: 2 }).build();
  }
}

describe("repro", () => {
  it("EntityBuilder.createDeferred during update", () => {
    const world = new World<CoreComponentRegistry>();
    const sys = new ReproSystem();
    world.addSystem(sys, { phase: SystemPhase.Simulation });
    world.update(1 / 60);
    expect(sys.ran).toBe(1);
  });
});
