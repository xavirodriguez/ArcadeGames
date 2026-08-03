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
      const dtSec = deltaTime / 1000;
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

          // 3. Process hyperspace
          if (hasAction("hyperspace")) {
              const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || {
                  width: config.SCREEN_WIDTH ?? 800,
                  height: config.SCREEN_HEIGHT ?? 600
              };
              const rand = world.gameplayRandom;
              const rx = rand.next() * screen.width;
              const ry = rand.next() * screen.height;

              world.mutateComponent(entity, "Transform", (t) => {
                  t.x = rx;
                  t.y = ry;
              });

              world.mutateComponent(entity, "Velocity", (v) => {
                  v.vx = 0;
                  v.vy = 0;
              });

              // Clear the input flag so hyperspace doesn't trigger repeatedly on hold
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
      }
  }

  public onRegister(_world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
