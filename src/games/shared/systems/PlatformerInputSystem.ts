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
    // Consume discrete touch taps once per frame, not once per player entity.
    const hasTouchTap = len > 0 && touchState ? touchState.consumeTaps().length > 0 : false;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const input = world.getMutableComponent(entity, inputType) as {
        moveDir?: number;
        jumpHeld?: boolean;
        jumpPressed?: boolean;
        jumpReleased?: boolean;
        previousJumpHeld?: boolean;
        slideHeld?: boolean;
        slideActionHeld?: boolean;
        slideTouchHeld?: boolean;
      } | undefined;
      if (!input) continue;
      if (touchState) {
        input.slideTouchHeld = touchState.getButton("slide");
        input.slideHeld = input.slideActionHeld === true || input.slideTouchHeld;
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

      }

      const previousJumpHeld = input.previousJumpHeld ?? false;
      const isTouchJumpHeld = touchState?.getButton("jump") ?? false;
      const isJumpHeldNow = (input.jumpHeld ?? false) || isTouchJumpHeld;
      const jumpPressed = (isJumpHeldNow && !previousJumpHeld) || hasTouchTap;
      const jumpReleased = (!isJumpHeldNow && previousJumpHeld) || (hasTouchTap && !isTouchJumpHeld);
      input.previousJumpHeld = isJumpHeldNow;

      input.jumpPressed = jumpPressed;
      input.jumpReleased = jumpReleased;
    }
  }
}
