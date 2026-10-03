import { System, World } from "@tiny-aster/core";
import { computeCarPhysics } from "../physics/CarPhysics";
import type { RacingConfig } from "../types/RacingConfigSchema";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

export class RacingInputSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) { super(); }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, deltaTime: number): void {
    const state = world.getSingleton("RacingState");
    if (!state || state.phase !== "racing") return;
    const cars = world.query("LocalPlayer", "Transform", "Velocity", "Input", "Car");

    for (let i = 0; i < cars.length; i += 1) {
      const entity = cars[i];
      const transform = world.getComponent(entity, "Transform");
      const velocity = world.getComponent(entity, "Velocity");
      const input = world.getComponent(entity, "Input");
      if (!transform || !velocity || !input) continue;

      const result = computeCarPhysics(
        transform,
        velocity,
        {
          moveX: input.axes.moveX ?? 0,
          moveY: input.axes.moveY ?? 0,
          boost: input.actions.boost === true,
          brake: input.actions.brake === true
        },
        this.config,
        deltaTime
      );

      const nextVelocity = world.getMutableComponent(entity, "Velocity");
      const nextTransform = world.getMutableComponent(entity, "Transform");
      if (nextVelocity) { nextVelocity.vx = result.vx; nextVelocity.vy = result.vy; }
      if (nextTransform) { nextTransform.rotation = result.rotation; nextTransform.dirty = true; }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
