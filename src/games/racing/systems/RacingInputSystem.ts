import { System, World, TouchInputState } from "@tiny-aster/core";
import { computeCarPhysics } from "../physics/CarPhysics";
import type { RacingConfig } from "../types/RacingConfigSchema";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

export class RacingInputSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) { super(); }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, deltaTime: number): void {
    const state = world.getSingleton("RacingState");
    if (!state || state.phase !== "racing") return;
    const cars = world.query("Car", "Transform", "Velocity", "Input");
    const touchState = world.getResource<TouchInputState>("TouchInputState");

    for (let i = 0; i < cars.length; i += 1) {
      const entity = cars[i];
      const transform = world.getComponent(entity, "Transform");
      const velocity = world.getComponent(entity, "Velocity");
      const input = world.getComponent(entity, "Input");
      if (!transform || !velocity || !input) continue;

      let moveX = input.axes.moveX ?? 0;
      let moveY = input.axes.moveY ?? 0;

      if (touchState) {
        if (touchState.paddle.active) {
          if (touchState.paddle.x < transform.x - 5) moveX = -1;
          else if (touchState.paddle.x > transform.x + 5) moveX = 1;
        } else if (touchState.moveX !== 0) {
          moveX = touchState.moveX;
        }

        if (touchState.getButton("thrust") || touchState.getButton("gas") || touchState.moveY < -0.2) {
          moveY = -1;
        }
      }

      const result = computeCarPhysics(
        transform,
        velocity,
        {
          moveX,
          moveY,
          boost: input.actions.boost === true || (touchState ? touchState.getButton("boost") : false),
          brake: input.actions.brake === true || (touchState ? touchState.getButton("brake") : false)
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
