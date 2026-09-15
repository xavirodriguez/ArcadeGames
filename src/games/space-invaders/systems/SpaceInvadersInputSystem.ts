import { World, Juice, CoreComponentRegistry, createEmitter, PhysicsUtils } from "@tiny-aster/core";
import { TransformComponent, VelocityComponent, WorldUtils } from "@tiny-aster/core";
import { InputComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { PlayerBulletPool } from "../EntityPool";
import { createPlayerBullet } from "../EntityFactory";
import { GameSystem } from "./GameSystem";

function removeBulletSafely(world: World<SpaceInvadersComponentRegistry>, bullet: number): void {
  if (!WorldUtils.isAliveAndTracked(world, bullet) || !world.hasComponent(bullet, "Transform")) {
    return;
  }
  const reclaimable = world.getComponent(bullet, "Reclaimable");
  if (reclaimable) {
    if (typeof reclaimable.onReclaim === "function") {
      reclaimable.onReclaim({ world, entity: bullet });
    } else {
      const pool = world.getResource<any>(reclaimable.poolId);
      if (pool && typeof pool.release === "function") {
        pool.release({ world, entity: bullet });
      }
    }
  }
  world.getCommandBuffer().removeEntity(bullet);
}

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
        // EMP Ability Cooldown Update & Input Trigger Check
        let empActiveTrigger = false;
        if (world.hasComponent(entity, "EmpAbility")) {
          const emp = world.getComponent(entity, "EmpAbility");
          if (emp) {
            if (emp.cooldownRemaining > 0) {
              world.mutateComponent(entity, "EmpAbility", e => {
                e.cooldownRemaining = Math.max(0, e.cooldownRemaining - deltaTime * 1000);
              });
            }
            if (inputState && InputUtils.isPressed(inputState, "emp")) {
              empActiveTrigger = true;
            }
          }
        }

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

        // EMP Ability Trigger Logic
        const empComp = world.getComponent(entity, "EmpAbility");
        if (empActiveTrigger && empComp && empComp.charge >= 1.0 && empComp.cooldownRemaining <= 0) {
          const radius = empComp.radius || config.EMP_RADIUS;
          const enemyBullets = world.query("EnemyBullet", "Transform");
          let clearedBulletsCount = 0;

          for (let b = 0; b < enemyBullets.length; b++) {
            const bEntity = enemyBullets[b];
            const bPos = world.getComponent(bEntity, "Transform");
            if (bPos) {
              const dx = bPos.x - pos.x;
              const dy = bPos.y - pos.y;
              if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                removeBulletSafely(world, bEntity);
                clearedBulletsCount++;
              }
            }
          }

          world.mutateSingleton("Formation", f => {
            f.stunnedRemaining = config.EMP_STUN_DURATION;
          });

          world.mutateComponent(entity, "EmpAbility", e => {
            e.charge = 0;
            e.cooldownRemaining = config.EMP_COOLDOWN;
          });

          Juice.shake(world as World<CoreComponentRegistry>, 8, 250);

          const eventBus = world.getEventBus();
          if (eventBus) {
            if (!world.isReSimulating) {
              eventBus.emitDeferred("si:emp_used", { clearedBullets: clearedBulletsCount, x: pos.x, y: pos.y });
              eventBus.emitDeferred("PlaySFX", { name: "emp_blast", volume: 0.9 });
            }
          }
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

            world.mutateComponent(entity, "Render", render => {
              render.muzzleFlashFrames = 3;
            });

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
                eventBus.emitDeferred("PlaySFX", { name: "shoot", pitchRange: 0.05, cooldownMs: 80 });
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
