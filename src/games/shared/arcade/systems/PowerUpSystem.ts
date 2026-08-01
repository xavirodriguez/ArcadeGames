import { System, World, CoreComponentRegistry, Component, ComponentRegistry } from "@tiny-aster/core";
import { PowerUpComponent } from "../types/ArcadeTypes";

/** @public */
export interface IPowerUpEffect {
  apply(world: World<any>, playerEntity: number): void;
}

/** @public */
export interface PowerUpSystemComponents extends CoreComponentRegistry {
  PowerUp: PowerUpComponent;
  LocalPlayer?: Component;
  RemotePlayer?: Component;
  Player?: Component;
}

/** @public */
export class PowerUpSystem<
  TComponents extends PowerUpSystemComponents = PowerUpSystemComponents
> extends System<TComponents> {
  public update(world: World<TComponents>, _deltaTime: number): void {
      const entities = world.query("PowerUp", "CollisionEvents");

      for (const entity of entities) {
          const powerUp = world.getComponent(entity, "PowerUp");
          const collisionsComp = world.getComponent(entity, "CollisionEvents");

          if (!powerUp || !collisionsComp || !collisionsComp.collisions) continue;

          for (const col of collisionsComp.collisions) {
              const other = col.otherEntity;

              // Check if other is player
              const isPlayer = world.hasComponent(other, "LocalPlayer") ||
                               world.hasComponent(other, "RemotePlayer") ||
                               world.hasComponent(other, "Player");

              if (isPlayer) {
                  const registry = world.getResource<Record<string, IPowerUpEffect>>("PowerUpEffects") || {
                      speed_boost: {
                          apply(w: World<TComponents>, player: number) {
                              if (w.hasComponent(player, "Velocity")) {
                                  w.mutateComponent(player, "Velocity", (v) => {
                                      v.vx *= 1.5;
                                      v.vy *= 1.5;
                                  });
                              }
                          }
                      }
                  };

                  const effect = registry[powerUp.powerUpType];
                  if (effect && typeof effect.apply === "function") {
                      effect.apply(world, other);
                  }

                  // Destroy power-up entity
                  world.getCommandBuffer().removeEntity(entity);
                  break; // stop processing further collisions for this power-up
              }
          }
      }
  }
}
