import { World, System, computeShipPhysics, getForwardVector, PhysicsUtils } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { createBullet } from "../EntityFactory";

/** @public */
export class AsteroidInputSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private config: AsteroidConfig;

  constructor(config: AsteroidConfig) {
    super();
    this.config = config;
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
      const gameState = world.getSingleton("GameState");
      if (gameState && (((gameState.readyRemaining ?? 0) > 0) || ((gameState.intermissionRemaining ?? 0) > 0))) {
          return;
      }

      const dtSec = deltaTime; // deltaTime is already strictly in units of seconds (e.g. 0.016s)
      const config = world.getResource<AsteroidConfig>("GameConfig") || this.config;

      // Query local player entities
      const entities = world.query("LocalPlayer", "Transform", "Velocity", "Input");

      if (entities.length > 0) {
          world.setResource("LocalPhysicsProcessedThisFrame", true);
      }

      const len = entities.length;
      // Safe for determinism/rollback. Sequential indexed loop replaces for..of iterator.
      for (let i = 0; i < len; i++) {
          const entity = entities[i];
          const transform = world.getComponent(entity, "Transform")!;
          const velocity = world.getComponent(entity, "Velocity")!;
          const input = world.getComponent(entity, "Input")!;
          const ship = world.getComponent(entity, "Ship");

          // 1. Process physics (rotation, thrust, friction)
          const phys = computeShipPhysics(
              transform,
              velocity,
              input,
              config,
              dtSec
          );

          // Safe for determinism/rollback. Replacing mutateComponent with direct getMutableComponent eliminates callback closure allocations per frame.
          const mutVel = world.getMutableComponent(entity, "Velocity");
          if (mutVel) {
              mutVel.vx = phys.vx;
              mutVel.vy = phys.vy;
          }

          const mutTrans = world.getMutableComponent(entity, "Transform");
          if (mutTrans) {
              mutTrans.rotation = phys.rotation;
          }

          // 2. Process shooting
          if (ship && ship.shootCooldownRemaining > 0) {
              const mutShip = world.getMutableComponent(entity, "Ship");
              if (mutShip) {
                  mutShip.shootCooldownRemaining = PhysicsUtils.tickTimer(mutShip.shootCooldownRemaining, dtSec);
              }
          }

          const currentShip = world.getComponent(entity, "Ship");
          const cooldown = currentShip ? currentShip.shootCooldownRemaining : 0;

          if (this.hasAction(input, "shoot") && cooldown <= 0) {
              const bulletSpeed = config.BULLET_SPEED ?? 300;
              const forward = getForwardVector(transform.rotation);
              const vx = velocity.vx + forward.x * bulletSpeed;
              const vy = velocity.vy + forward.y * bulletSpeed;

              createBullet({
                  world,
                  x: transform.x,
                  y: transform.y,
                  vx,
                  vy,
                  rotation: transform.rotation,
                  ownerId: "player"
              });

              const eventBus = world.getEventBus();
              if (eventBus) {
                  eventBus.emitDeferred("PlaySFX", {
                      name: "shoot",
                      pitchRange: 0.05,
                      cooldownMs: 80
                  });
              }

              if (world.hasComponent(entity, "Ship")) {
                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip) {
                      mutShip.shootCooldownRemaining = config.SHIP_SHOOT_COOLDOWN ?? 0.25;
                  }
              }
          }

          if (this.hasAction(input, "thrust")) {
              const eventBus = world.getEventBus();
              if (eventBus) {
                  eventBus.emitDeferred("PlaySFX", {
                      name: "thrust_loop",
                      cooldownMs: 150,
                      volume: 0.6
                  });
              }
          }

          // Decrement hyperspace cooldown
          if (ship) {
              if (ship.hyperspaceCooldownRemaining === undefined) {
                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip) {
                      mutShip.hyperspaceCooldownRemaining = 0;
                      mutShip.hyperspacePrepTime = 0;
                  }
              }
              const activeShip = world.getComponent(entity, "Ship")!;
              if (activeShip.hyperspaceCooldownRemaining && activeShip.hyperspaceCooldownRemaining > 0) {
                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip && mutShip.hyperspaceCooldownRemaining !== undefined) {
                      mutShip.hyperspaceCooldownRemaining = PhysicsUtils.tickTimer(mutShip.hyperspaceCooldownRemaining, dtSec);
                  }
              }
          }

          // 3. Process hyperspace
          const isHyperspaceHeld = this.hasAction(input, "hyperspace");
          const latestShip = world.getComponent(entity, "Ship")!;
          const hCooldown = latestShip.hyperspaceCooldownRemaining ?? 0;
          const prepActive = (latestShip.hyperspacePrepTime ?? 0) > 0;

          const previewEntityId = latestShip.hyperspacePreviewEntityId;

          if (isHyperspaceHeld && hCooldown <= 0) {
              const totalPrepTime = config.HYPERSPACE_PREP_TIME ?? 0.5;
              if (!prepActive && previewEntityId === undefined) {
                  const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || {
                      width: config.SCREEN_WIDTH ?? 800,
                      height: config.SCREEN_HEIGHT ?? 600
                  };
                  const rand = world.gameplayRandom;
                  const rx = rand.next() * screen.width;
                  const ry = rand.next() * screen.height;

                  // Create preview entity once at prep start via CommandBuffer (AST-007)
                  const previewEntity = world.reserveEntityId();
                  world.getCommandBuffer().createEntity(previewEntity);
                  world.getCommandBuffer().addComponent(previewEntity, {
                      type: "Transform",
                      x: rx,
                      y: ry,
                      rotation: 0,
                      scaleX: 1,
                      scaleY: 1,
                      worldX: rx,
                      worldY: ry,
                      worldRotation: 0,
                      worldScaleX: 1,
                      worldScaleY: 1,
                      dirty: false
                  } as any);
                  world.getCommandBuffer().addComponent(previewEntity, {
                      type: "Render",
                      shape: "singularity",
                      size: 40,
                      color: "#00f0ff",
                      visible: true,
                      opacity: 0.6,
                      order: 10,
                      rotation: 0,
                      angularVelocity: 2.0,
                      hitFlashFrames: 0
                  } as any);

                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip) {
                      mutShip.hyperspacePrepTime = totalPrepTime;
                      mutShip.hyperspacePreviewX = rx;
                      mutShip.hyperspacePreviewY = ry;
                      mutShip.hyperspacePreviewEntityId = previewEntity;
                  }
              } else if (prepActive) {
                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip && mutShip.hyperspacePrepTime !== undefined) {
                      mutShip.hyperspacePrepTime = PhysicsUtils.tickTimer(mutShip.hyperspacePrepTime, dtSec);
                  }
              }

              const updatedShip = world.getComponent(entity, "Ship")!;
              const rx = updatedShip.hyperspacePreviewX ?? transform.x;
              const ry = updatedShip.hyperspacePreviewY ?? transform.y;
              const previewId = updatedShip.hyperspacePreviewEntityId;

              if (previewId !== undefined && world.hasEntity(previewId)) {
                  const mutPreviewTrans = world.getMutableComponent(previewId, "Transform");
                  if (mutPreviewTrans) {
                      mutPreviewTrans.x = rx;
                      mutPreviewTrans.y = ry;
                  }
              }

              if (updatedShip.hyperspacePrepTime === 0 && previewId !== undefined) {
                  const mutTrans = world.getMutableComponent(entity, "Transform");
                  if (mutTrans) {
                      mutTrans.x = rx;
                      mutTrans.y = ry;
                  }

                  const mutVel = world.getMutableComponent(entity, "Velocity");
                  if (mutVel) {
                      mutVel.vx = 0;
                      mutVel.vy = 0;
                  }

                  world.getCommandBuffer().removeEntity(previewId);

                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip) {
                      mutShip.hyperspaceCooldownRemaining = config.HYPERSPACE_COOLDOWN ?? 5.0;
                      mutShip.hyperspacePrepTime = 0;
                      mutShip.hyperspacePreviewX = undefined;
                      mutShip.hyperspacePreviewY = undefined;
                      mutShip.hyperspacePreviewEntityId = undefined;
                  }

                  const mutInp = world.getMutableComponent(entity, "Input");
                  if (mutInp) {
                      const acts = mutInp.actions;
                      if (acts instanceof Set) {
                          acts.delete("hyperspace");
                      } else if (Array.isArray(acts)) {
                          mutInp.actions = acts.filter(x => x !== "hyperspace");
                      } else if (acts && typeof acts === "object") {
                          (acts as Record<string, boolean>)["hyperspace"] = false;
                      }
                  }

                  const eventBus = world.getEventBus();
                  if (eventBus) {
                      eventBus.emitDeferred("PlaySFX", { name: "wrap", volume: 0.9 });
                  }
              }
          } else {
              const currentShipComp = world.getComponent(entity, "Ship");
              if (currentShipComp?.hyperspacePreviewEntityId !== undefined) {
                  world.getCommandBuffer().removeEntity(currentShipComp.hyperspacePreviewEntityId);
                  const mutShip = world.getMutableComponent(entity, "Ship");
                  if (mutShip) {
                      mutShip.hyperspacePrepTime = 0;
                      mutShip.hyperspacePreviewX = undefined;
                      mutShip.hyperspacePreviewY = undefined;
                      mutShip.hyperspacePreviewEntityId = undefined;
                  }
              }
          }
      }
  }

  private hasAction(input: AsteroidsComponentRegistry["Input"], actionName: string): boolean {
    const acts = input.actions;
    if (acts instanceof Set) {
      return acts.has(actionName);
    }
    if (Array.isArray(acts)) {
      const aLen = acts.length;
      for (let j = 0; j < aLen; j++) {
        if (acts[j] === actionName) return true;
      }
      return false;
    }
    if (acts && typeof acts === "object") {
      return (acts as Record<string, boolean>)[actionName] === true;
    }
    return false;
  }

  public onRegister(_world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
