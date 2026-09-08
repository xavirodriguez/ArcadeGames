import { World, Juice, CoreComponentRegistry, createEmitter, PhysicsUtils } from "@tiny-aster/core";
import { TransformComponent, VelocityComponent } from "@tiny-aster/core";
import { InputComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { PlayerBulletPool } from "../EntityPool";
import { createPlayerBullet } from "../EntityFactory";
import { GameSystem } from "./GameSystem";

const InputUtils = {
  isPressed(inputState: { buttons: Record<string, boolean> }, button: string): boolean {
    return !!inputState.buttons[button];
  },
  getAxis(inputState: { axes: Record<string, number> }, axis: string): number {
    return inputState.axes[axis] || 0;
  }
};

/**
 * System that handles player input and movement.
 */
export class SpaceInvadersInputSystem extends GameSystem {
  private bulletPool: PlayerBulletPool;
  private isMultiplayer = false;

  constructor(bulletPool: PlayerBulletPool) {
    super();
    this.bulletPool = bulletPool;
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const config = this.getGameConfig(world);

    const gameState = world.getSingleton("GameState");
    if (gameState && !this.shouldUpdate(world)) {
      // Force velocity to 0 so player doesn't slide/drift
      const entities = world.query("Player", "Velocity");
      entities.forEach((entity) => {
        const vel = world.getComponent(entity, "Velocity");
        if (vel && vel.vx !== 0) {
          world.mutateComponent(entity, "Velocity", v => {
            v.vx = 0;
          });
        }
      });
      return;
    }

    const useNetwork = world.getResource("UseNetworkInputs") === true;
    if (this.isMultiplayer && !useNetwork) return;

    const inputState = world.getSingleton("InputState");
    const entities = world.query("Player", "Input", "Transform", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent(entity, "Input");
      const pos = world.getComponent(entity, "Transform");
      const vel = world.getComponent(entity, "Velocity");

      if (input && pos && vel) {
        // 1. Cálculos fuera de la mutación
        let nextMoveLeft = input.moveLeft;
        let nextMoveRight = input.moveRight;
        let nextShoot = input.shoot;
        let nextShootCooldownRemaining = input.shootCooldownRemaining;

        const isReplay = world.getResource("IsReplayPlayback") === true;
        if (isReplay) {
          nextMoveLeft = input.moveLeft;
          nextMoveRight = input.moveRight;
          nextShoot = input.shoot;
        } else if (useNetwork) {
          const axes = (input as any).axes || {};
          const actions = (input as any).actions;
          nextMoveLeft = (axes.moveX === -1);
          nextMoveRight = (axes.moveX === 1);
          nextShoot = (actions instanceof Set ? actions.has("shoot") : Array.isArray(actions) ? actions.includes("shoot") : false);
        } else if (inputState) {
          nextMoveLeft = InputUtils.isPressed(inputState, "moveLeft");
          nextMoveRight = InputUtils.isPressed(inputState, "moveRight");
          nextShoot = InputUtils.isPressed(inputState, "shoot");

          const horizontal = InputUtils.getAxis(inputState, "horizontal");
          if (horizontal < -0.35) nextMoveLeft = true;
          if (horizontal > 0.35) nextMoveRight = true;
        }

        // Apply movement
        let moveX = 0;
        if (nextMoveLeft) moveX -= 1;
        else if (nextMoveRight) moveX += 1;
        const targetDx = moveX * config.PLAYER_SPEED;

        // Handle shooting timer
        if (nextShootCooldownRemaining > 0) {
          nextShootCooldownRemaining = PhysicsUtils.tickTimer(nextShootCooldownRemaining, deltaTime);
        }

        if (nextShoot && nextShootCooldownRemaining <= 0) {
          // Check if there is already a player bullet
          const activeBullets = world.query("PlayerBullet");
          if (activeBullets.length === 0) {
            // Estructural: fuera de mutación
            createPlayerBullet(world, pos.x, pos.y - 25, this.bulletPool);
            nextShootCooldownRemaining = config.PLAYER_SHOOT_COOLDOWN / 1000;

            // Physical recoil on player ship (Y axis recoil down ~10px and elastic return)
            Juice.add(world, entity, {
              property: "y",
              target: 10,
              duration: 60,
              easing: "easeOut"
            });
            Juice.add(world, entity, {
              property: "y",
              target: 0,
              duration: 180,
              delay: 60,
              easing: "elasticOut"
            });
            Juice.squash(world, entity, 0.9, 1.15, 100);
            Juice.shake(world, 1.5, 60);

            // Muzzle smoke emitter
            const emitter = createEmitter(world, {
              type: "smoke",
              x: pos.x,
              y: pos.y - 25,
              rate: 0,
              burst: true,
              count: 4,
              lifetime: [0.2, 0.4],
              speed: [15, 40],
              size: [2, 4],
              color: ["#888888", "#CCCCCC", "#AAAAAA"],
              angle: [240, 300],
              loop: false
            });
            world.getCommandBuffer().addComponent(emitter, { type: "TTL", timeLeft: 0.5, remaining: 0.5 });

            const eventBus = world.getEventBus();
            if (eventBus) {
                eventBus.emitDeferred("PlaySFX", { name: "shoot" });
                eventBus.emitDeferred("PlaySFX", { name: "thump" });
            }
          }
        }

        // 2. Aplicar mutaciones si han cambiado los valores
        if (input.moveLeft !== nextMoveLeft ||
            input.moveRight !== nextMoveRight ||
            input.shoot !== nextShoot ||
            input.shootCooldownRemaining !== nextShootCooldownRemaining) {
          world.mutateComponent(entity, "Input", i => {
            i.moveLeft = nextMoveLeft;
            i.moveRight = nextMoveRight;
            i.shoot = nextShoot;
            i.shootCooldownRemaining = nextShootCooldownRemaining;
          });
        }

        if (vel.vx !== targetDx) {
          world.mutateComponent(entity, "Velocity", v => {
            v.vx = targetDx;
          });
        }
      }
    });
  }
}
