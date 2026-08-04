import { System, World, VelocityComponent, InputStateComponent, Juice } from "@tiny-aster/core";
import { FlappyBirdInputComponent, BirdComponent, FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

const InputUtils = {
  isPressed(inputState: InputStateComponent, button: string): boolean {
    return !!inputState.buttons[button];
  }
};

/**
 * System that buffers and manages inputs for action consumption.
 */
export class InputBufferSystem extends System<FlappyBirdComponentRegistry> {
  private static buffers = new Map<number, Set<string>>();

  public override onRegister(world: World<any>): void {
    InputBufferSystem.buffers.clear();
  }

  public static buffer(world: World<any>, entity: number, action: string): void {
    let set = this.buffers.get(entity);
    if (!set) {
      set = new Set();
      this.buffers.set(entity, set);
    }
    set.add(action);
  }

  public static consume(world: World<any>, entity: number, action: string): boolean {
    const set = this.buffers.get(entity);
    if (set && set.has(action)) {
      set.delete(action);
      return true;
    }
    return false;
  }

  public update(world: World<FlappyBirdComponentRegistry>, deltaTime: number): void {
    // Optional buffer decay/cleanup
  }
}

/**
 * System that handles player input and bird flap mechanics.
 */
export class FlappyBirdInputSystem extends System<FlappyBirdComponentRegistry> {
  constructor(private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super();
  }

  private isMultiplayer = false;

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World<FlappyBirdComponentRegistry>, deltaTime: number): void {
    if (this.isMultiplayer) return;

    const inputState = world.getSingleton("InputState");
    const flapRequested = inputState ? InputUtils.isPressed(inputState, "flap") : false;

    const entities = world.query("Bird", "FlappyInput", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent(entity, "FlappyInput");
      const vel = world.getComponent(entity, "Velocity");
      const bird = world.getComponent(entity, "Bird");

      if (input && vel && bird && bird.isAlive) {
        let shouldFlap = false;

        // Sync input state & timers
        world.mutateComponent(entity, "FlappyInput", mutableInput => {
          const isButtonDown = flapRequested || mutableInput.glide || mutableInput.flap;

          // Track initial press vs hold
          const wasButtonDown = !!mutableInput.isPressed;
          mutableInput.isPressed = isButtonDown;

          const isNewPress = isButtonDown && !wasButtonDown;

          // Track press duration to separate tap (flap) from hold (glide)
          if (isButtonDown) {
            mutableInput.pressDuration = (mutableInput.pressDuration || 0) + deltaTime;
          } else {
            mutableInput.pressDuration = 0;
          }

          if (mutableInput.flapCooldownRemaining > 0) {
            mutableInput.flapCooldownRemaining -= deltaTime;
          }

          // Apply flap buffer on new press
          if (isNewPress) {
            InputBufferSystem.buffer(world, entity, "flap");
          }

          const isFlapRequested = isNewPress || (mutableInput.flap && !wasButtonDown);

          if (mutableInput.flapCooldownRemaining <= 0 && (isFlapRequested || InputBufferSystem.consume(world, entity, "flap"))) {
            shouldFlap = true;
            mutableInput.flapCooldownRemaining = this.config.FLAP_COOLDOWN / 1000;
            mutableInput.flap = false;
            // Always consume/clear any buffered press if we successfully flapped
            InputBufferSystem.consume(world, entity, "flap");
          }

          // Glide is only activated if the button is held for more than 200ms (0.2 seconds)
          mutableInput.glide = isButtonDown && (mutableInput.pressDuration > 0.2);
        });

        if (shouldFlap) {
          world.mutateComponent(entity, "Velocity", mutableVel => {
            mutableVel.vy = this.config.FLAP_STRENGTH;
          });
          world.getCommandBuffer().addComponent(entity, { type: "HapticRequest", pattern: "selection" } as any);
          // Juice: Squash al aletear
          Juice.squash(world as any, entity, 1.2, 0.8, 50);
        }

        // Apply gravity
        const dt = deltaTime;
        let nextVelY = 0;
        world.mutateComponent(entity, "Velocity", v => {
          v.vy += (this.config.GRAVITY || FLAPPY_CONFIG.GRAVITY) * dt;
          nextVelY = v.vy;
        });

        // Sync bird component velocityY
        world.mutateComponent(entity, "Bird", b => {
          b.velocityY = nextVelY;
        });
      }
    });
  }
}
