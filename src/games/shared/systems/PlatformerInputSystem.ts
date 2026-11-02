import { World, System, CoreComponentRegistry, TouchInputState } from "@tiny-aster/core";

/**
 * System that maps game actions to platformer horizontal movement,
 * and samples jump button edges. Jump decisions are handled by PlatformerJumpSystem.
 * @public
 */
export class PlatformerInputSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const inputType = "PlatformerInput";
    const entities = world.query(inputType);
    const len = entities.length;
    const touchState = world.getResource<TouchInputState>("TouchInputState");

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const input = world.getMutableComponent(entity, inputType) as {
        moveDir?: number;
        jumpHeld?: boolean;
        jumpPressed?: boolean;
        jumpReleased?: boolean;
        previousJumpHeld?: boolean;
      } | undefined;
      if (touchState) {
        if (touchState.moveX < -0.2 || touchState.getButton("moveLeft")) {
          input.moveDir = -1;
        } else if (touchState.moveX > 0.2 || touchState.getButton("moveRight")) {
          input.moveDir = 1;
        } else if (touchState.paddle.active) {
          const transform = world.getComponent(entity, "Transform") as { x: number } | undefined;
          if (transform) {
            if (touchState.paddle.x < transform.x - 5) input.moveDir = -1;
            else if (touchState.paddle.x > transform.x + 5) input.moveDir = 1;
          }
        }

        if (touchState.getButton("jump") || touchState.consumeTaps().length > 0) {
          input.jumpHeld = true;
        }
      }

      const previousJumpHeld = input.previousJumpHeld ?? false;
      const isJumpHeldNow = input.jumpHeld ?? false;
      const jumpPressed = isJumpHeldNow && !previousJumpHeld;
      const jumpReleased = !isJumpHeldNow && previousJumpHeld;
      input.previousJumpHeld = isJumpHeldNow;

      input.jumpPressed = jumpPressed;
      input.jumpReleased = jumpReleased;

    }
  }
}
