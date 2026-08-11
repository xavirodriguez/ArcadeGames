import { World, System, computeShipPhysics } from "@tiny-aster/core";
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

      for (const entity of entities) {
          const transform = world.getComponent(entity, "Transform")!;
          const velocity = world.getComponent(entity, "Velocity")!;
          const input = world.getComponent(entity, "Input")!;
          const ship = world.getComponent(entity, "Ship");

          // Helper to check action state safely without modifying the frozen input object
          const hasAction = (actionName: string): boolean => {
              const acts = input.actions;
              if (acts instanceof Set) {
                  return acts.has(actionName);
              }
              if (Array.isArray(acts)) {
                  return acts.includes(actionName);
              }
              if (acts && typeof acts === "object") {
                  return (acts as Record<string, boolean>)[actionName] === true;
              }
              return false;
          };

          // 1. Process physics (rotation, thrust, friction)
          const phys = computeShipPhysics(
              transform,
              velocity,
              input,
              config,
              dtSec
          );

          world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = phys.vx;
              v.vy = phys.vy;
          });

          world.mutateComponent(entity, "Transform", (t) => {
              t.rotation = phys.rotation;
          });

          // 2. Process shooting
          // Cooldown decrement
          if (ship && ship.shootCooldownRemaining > 0) {
              world.mutateComponent(entity, "Ship", (s) => {
                  s.shootCooldownRemaining -= dtSec;
                  if (s.shootCooldownRemaining < 0) s.shootCooldownRemaining = 0;
              });
          }

          const currentShip = world.getComponent(entity, "Ship");
          const cooldown = currentShip ? currentShip.shootCooldownRemaining : 0;

          if (hasAction("shoot") && cooldown <= 0) {
              const bulletSpeed = config.BULLET_SPEED ?? 300;
              const vx = velocity.vx + Math.cos(transform.rotation) * bulletSpeed;
              const vy = velocity.vy + Math.sin(transform.rotation) * bulletSpeed;

              createBullet({
                  world,
                  x: transform.x,
                  y: transform.y,
                  vx,
                  vy,
                  ownerId: "player"
              });

              if (world.hasComponent(entity, "Ship")) {
                  world.mutateComponent(entity, "Ship", (s) => {
                      s.shootCooldownRemaining = config.SHIP_SHOOT_COOLDOWN ?? 0.25;
                  });
              }
          }

          // Decrement hyperspace cooldown
          if (ship) {
              if (ship.hyperspaceCooldownRemaining === undefined) {
                  world.mutateComponent(entity, "Ship", (s) => {
                      s.hyperspaceCooldownRemaining = 0;
                      s.hyperspacePrepTime = 0;
                  });
              }
              const currentShip = world.getComponent(entity, "Ship")!;
              if (currentShip.hyperspaceCooldownRemaining && currentShip.hyperspaceCooldownRemaining > 0) {
                  world.mutateComponent(entity, "Ship", (s) => {
                      if (s.hyperspaceCooldownRemaining !== undefined) {
                          s.hyperspaceCooldownRemaining -= dtSec;
                          if (s.hyperspaceCooldownRemaining < 0) s.hyperspaceCooldownRemaining = 0;
                      }
                  });
              }
          }

          // 3. Process hyperspace
          const isHyperspaceHeld = hasAction("hyperspace");
          const latestShip = world.getComponent(entity, "Ship")!;
          const hCooldown = latestShip.hyperspaceCooldownRemaining ?? 0;
          const prepActive = (latestShip.hyperspacePrepTime ?? 0) > 0;

          if (isHyperspaceHeld && hCooldown <= 0) {
              const totalPrepTime = config.HYPERSPACE_PREP_TIME ?? 0.5;
              if (!prepActive) {
                  // Initialize hyperspace destination and charge timer
                  const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || {
                      width: config.SCREEN_WIDTH ?? 800,
                      height: config.SCREEN_HEIGHT ?? 600
                  };
                  const rand = world.gameplayRandom;
                  const rx = rand.next() * screen.width;
                  const ry = rand.next() * screen.height;

                  world.mutateComponent(entity, "Ship", (s) => {
                      s.hyperspacePrepTime = totalPrepTime;
                      s.hyperspacePreviewX = rx;
                      s.hyperspacePreviewY = ry;
                  });
              } else {
                  // Decrement prep time
                  world.mutateComponent(entity, "Ship", (s) => {
                      if (s.hyperspacePrepTime !== undefined) {
                          s.hyperspacePrepTime -= dtSec;
                          if (s.hyperspacePrepTime < 0) s.hyperspacePrepTime = 0;
                      }
                  });
              }

              // Re-read because we just mutated it
              const updatedShip = world.getComponent(entity, "Ship")!;
              const rx = updatedShip.hyperspacePreviewX ?? transform.x;
              const ry = updatedShip.hyperspacePreviewY ?? transform.y;

              // Spawn visual preview indicator at destination coordinates using low TTL (e.g. 0.05s)
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
              world.getCommandBuffer().addComponent(previewEntity, {
                  type: "TTL",
                  timeLeft: 0.05,
                  remaining: 0.05
              } as any);

              // If preparation completes, confirm teletransporte!
              if (updatedShip.hyperspacePrepTime === 0) {
                  world.mutateComponent(entity, "Transform", (t) => {
                      t.x = rx;
                      t.y = ry;
                  });

                  world.mutateComponent(entity, "Velocity", (v) => {
                      v.vx = 0;
                      v.vy = 0;
                  });

                  world.mutateComponent(entity, "Ship", (s) => {
                      s.hyperspaceCooldownRemaining = config.HYPERSPACE_COOLDOWN ?? 5.0;
                      s.hyperspacePrepTime = 0;
                      s.hyperspacePreviewX = undefined;
                      s.hyperspacePreviewY = undefined;
                  });

                  // Clear the input flag so hyperspace is consumed
                  world.mutateComponent(entity, "Input", (inp) => {
                      const acts = inp.actions;
                      if (acts instanceof Set) {
                          acts.delete("hyperspace");
                      } else if (Array.isArray(acts)) {
                          inp.actions = acts.filter(x => x !== "hyperspace");
                      } else if (acts && typeof acts === "object") {
                          (acts as Record<string, boolean>)["hyperspace"] = false;
                      }
                  });
              }
          } else if (!isHyperspaceHeld && prepActive) {
              // Cancel hyperspace charging if key released before completion
              world.mutateComponent(entity, "Ship", (s) => {
                  s.hyperspacePrepTime = 0;
                  s.hyperspacePreviewX = undefined;
                  s.hyperspacePreviewY = undefined;
              });
          }
      }
  }

  public onRegister(_world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
