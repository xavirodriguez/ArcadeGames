import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { PowerUpComponent } from "../types/ArcadeTypes";

/** @public */
export interface IPowerUpEffect {
  apply(world: World<any>, playerEntity: number): void;
}

/** @public */
export class PowerUpSystem extends System<CoreComponentRegistry & { PowerUp: PowerUpComponent }> {
  public update(world: World<CoreComponentRegistry & { PowerUp: PowerUpComponent }>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
      const powerUpType = "PowerUp" as Extract<keyof (CoreComponentRegistry & { PowerUp: PowerUpComponent }), string>;
      const collisionType = "CollisionEvents" as Extract<keyof (CoreComponentRegistry & { PowerUp: PowerUpComponent }), string>;
      const entities = world.query(powerUpType, collisionType);

      for (const entity of entities) {
          const powerUp = world.getComponent(entity, powerUpType) as PowerUpComponent | undefined;
          const collisionsComp = world.getComponent(entity, collisionType) as any;

          if (!powerUp || !collisionsComp || !collisionsComp.collisions) continue;

          for (const col of collisionsComp.collisions) {
              const other = col.otherEntity;

              // Check if other is player
              const isPlayer = world.hasComponent(other, "LocalPlayer" as any) ||
                               world.hasComponent(other, "RemotePlayer" as any) ||
                               world.hasComponent(other, "Player" as any);

              if (isPlayer) {
                  const registry = world.getResource<Record<string, IPowerUpEffect>>("PowerUpEffects") || {
                      speed_boost: {
                          apply(w: World<any>, player: number) {
                              if (w.hasComponent(player, "Velocity" as any)) {
                                  w.mutateComponent(player, "Velocity" as any, (v: any) => {
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
