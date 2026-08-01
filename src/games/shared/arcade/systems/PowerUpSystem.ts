import { System, World, CoreComponentRegistry, ComponentType, CollisionEventsComponent, ComponentRegistry, VelocityComponent } from "@tiny-aster/core";
import { PowerUpComponent } from "../types/ArcadeTypes";

/** @public */
export interface IPowerUpEffect {
  apply(world: World<any>, playerEntity: number): void;
}

/** @public */
export class PowerUpSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry
> extends System<TComponents> {
  public update(world: World<TComponents>, _deltaTime: number): void {
      const powerUpType = "PowerUp" as unknown as ComponentType<TComponents>;
      const collisionType = "CollisionEvents" as unknown as ComponentType<TComponents>;
      const entities = world.query(powerUpType, collisionType);

      for (const entity of entities) {
          const powerUp = world.getComponent(entity, powerUpType) as PowerUpComponent | undefined;
          const collisionsComp = world.getComponent(entity, collisionType) as CollisionEventsComponent | undefined;

          if (!powerUp || !collisionsComp || !collisionsComp.collisions) continue;

          for (const col of collisionsComp.collisions) {
              const other = col.otherEntity;

              // Check if other is player
              const isPlayer = world.hasComponent(other, "LocalPlayer" as unknown as ComponentType<TComponents>) ||
                               world.hasComponent(other, "RemotePlayer" as unknown as ComponentType<TComponents>) ||
                               world.hasComponent(other, "Player" as unknown as ComponentType<TComponents>);

              if (isPlayer) {
                  const registry = world.getResource<Record<string, IPowerUpEffect>>("PowerUpEffects") || {
                      speed_boost: {
                          apply(w: World<TComponents>, player: number) {
                              const velocityType = "Velocity" as unknown as ComponentType<TComponents>;
                              if (w.hasComponent(player, velocityType)) {
                                  w.mutateComponent(player, velocityType, (v: unknown) => {
                                      const vel = v as VelocityComponent;
                                      vel.vx *= 1.5;
                                      vel.vy *= 1.5;
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
