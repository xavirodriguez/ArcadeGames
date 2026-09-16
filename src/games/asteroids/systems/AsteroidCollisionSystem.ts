/* eslint-disable @typescript-eslint/no-explicit-any */
import { World, System, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { applyAsteroidCombatDeathEffects, triggerShipExplosionParticles } from "./AsteroidRewardEffects";

/**
 * System to resolve collision logic for Asteroids.
 * Handles Bullet-Asteroid and Ship-Asteroid collisions using a double-safety approach:
 * A) Unique pair processing (entityA < entityB)
 * B) Verification that entities still exist before processing.
 * Utilizes the world CommandBuffer for deferred mutations and EventBus for deferred events.
 * @public
 */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private static readonly SHIP_EXPLOSION_COLORS = ["#00f0ff", "#5cf2ff", "#ff5d00", "#ffffff"] as const;

  private processedDeaths = new Set<number>();
  private destroyedEntities = new Set<number>();

  // Rollback-safe per-tick player session cache
  private playerCache = new Map<string, number>();
  private playerCacheTick = -1;

  constructor() {
    super();
  }

  public override onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.on("combat:death", (event: any) => {
        this.onCombatDeath(world, event);
      });
    }
  }

  private hasEntity(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, entity: number): boolean {
    if (typeof (world as unknown as { hasEntity?: (entity: number) => boolean }).hasEntity === "function") {
      return (world as unknown as { hasEntity: (entity: number) => boolean }).hasEntity(entity);
    }
    return world.hasComponent(entity, "Transform");
  }

  private findPlayerByOwnerId(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    ownerId: string
  ): number | undefined {
    // Rebuild cache if world tick has changed (e.g., new frame or rollback resimulation)
    if (this.playerCacheTick !== world.tick) {
      this.playerCache.clear();
      this.playerCacheTick = world.tick;

      const ships = world.query("Ship");
      for (let i = 0; i < ships.length; i++) {
        const ent = ships[i];
        const remote = world.getComponent(ent, "RemotePlayer");
        if (remote && remote.sessionId) {
          this.playerCache.set(remote.sessionId, ent);
        }
        const ship = world.getComponent(ent, "Ship");
        if (ship && ship.sessionId) {
          this.playerCache.set(ship.sessionId, ent);
        }
      }

      const remotes = world.query("RemotePlayer");
      for (let i = 0; i < remotes.length; i++) {
        const ent = remotes[i];
        const remote = world.getComponent(ent, "RemotePlayer");
        if (remote && remote.sessionId && !this.playerCache.has(remote.sessionId)) {
          this.playerCache.set(remote.sessionId, ent);
        }
      }
    }

    return this.playerCache.get(ownerId);
  }

  private onCombatDeath(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, event: any): void {
    const asteroid = event.entity;
    const bullet = event.sourceEntity;

    if (this.processedDeaths.has(asteroid)) {
      return;
    }
    this.processedDeaths.add(asteroid);

    applyAsteroidCombatDeathEffects(
      world,
      asteroid,
      bullet,
      (w, ownerId) => this.findPlayerByOwnerId(w, ownerId)
    );
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    this.processedDeaths.clear();
    // Safe for determinism/rollback. Reusing instance Set avoids per-tick heap allocations during collision updates.
    this.destroyedEntities.clear();
    // Paso 4: Double-security collision resolution system
    const entities = world.query("CollisionEvents");
    const len = entities.length;

    // 1. Iterate over collision pairs with zero-allocation indexed loop
    for (let i = 0; i < len; i++) {
      const entityA = entities[i];
      const colComp = world.getComponent(entityA, "CollisionEvents");
      if (!colComp) {
        continue;
      }

      for (const collision of colComp.collisions) {
        const entityB = collision.otherEntity;

        // Doble Seguridad A: Procesa cada par solo una vez verificando if (entityA < entityB)
        if (!(entityA < entityB)) {
          continue;
        }

        // Doble Seguridad B: Antes de procesar la colisión, verifica que las entidades sigan existiendo
        if (!this.hasEntity(world, entityA) || !this.hasEntity(world, entityB)) {
          continue;
        }

        // Ensure we don't process if either entity was already destroyed in this system update
        if (this.destroyedEntities.has(entityA) || this.destroyedEntities.has(entityB)) {
          continue;
        }

        const isBulletA = world.hasComponent(entityA, "Bullet");
        const isBulletB = world.hasComponent(entityB, "Bullet");
        const isAsteroidA = world.hasComponent(entityA, "Asteroid");
        const isAsteroidB = world.hasComponent(entityB, "Asteroid");
        const isShipA = world.hasComponent(entityA, "Ship");
        const isShipB = world.hasComponent(entityB, "Ship");
        const isUfoA = world.hasComponent(entityA, "Ufo");
        const isUfoB = world.hasComponent(entityB, "Ufo");

        // Case 0: Bullet-UFO
        if ((isBulletA && isUfoB) || (isBulletB && isUfoA)) {
          const bullet = isBulletA ? entityA : entityB;
          const ufo = isBulletA ? entityB : entityA;

          if (!this.destroyedEntities.has(bullet) && !this.destroyedEntities.has(ufo)) {
            const ufoComp = world.getComponent(ufo, "Ufo");
            const points = ufoComp?.size === "small" ? 1000 : 200;

            let scoreGain = points;
            world.mutateSingleton("GameState", (state) => {
              state.score += points;
              scoreGain = points;
            });

            world.getCommandBuffer().removeEntity(bullet);
            world.getCommandBuffer().removeEntity(ufo);
            this.destroyedEntities.add(bullet);
            this.destroyedEntities.add(ufo);

            const eventBus = world.getEventBus();
            if (eventBus) {
              eventBus.emitDeferred("PlaySFX", { name: "hit_critical", volume: 1.0 });
              eventBus.emitDeferred("ufo:destroyed", { entity: ufo });
              eventBus.emitDeferred("score:changed", { newScore: points, delta: scoreGain });
            }
          }
          continue;
        }

        // Case 1: Bullet-Asteroid
        if ((isBulletA && isAsteroidB) || (isBulletB && isAsteroidA)) {
            const bullet   = isBulletA ? entityA : entityB;
            const asteroid = isBulletA ? entityB : entityA;

            if (this.destroyedEntities.has(bullet) || this.destroyedEntities.has(asteroid)) continue;

            // If CombatSystem has already processed this, it will have marked the asteroid as Dead
            // or the bullet would be removed. Otherwise, we are running in direct/headless mode,
            // so we manually trigger the combat death reaction to maintain 100% backward compatibility.
            const health = world.getComponent(asteroid, "Health");
            const isDeadPending = health && health.current <= 0;
            if (!world.hasComponent(asteroid, "Dead") && !isDeadPending) {
              this.onCombatDeath(world, { entity: asteroid, sourceEntity: bullet });
              world.getCommandBuffer().removeEntity(bullet);
              this.destroyedEntities.add(bullet);
              this.destroyedEntities.add(asteroid);
            }
            continue;
        }

        // Case 2: Ship-Asteroid
        if ((isShipA && isAsteroidB) || (isShipB && isAsteroidA)) {
          const ship = isShipA ? entityA : entityB;
          const asteroid = isShipA ? entityB : entityA;

          if (this.destroyedEntities.has(ship) || this.destroyedEntities.has(asteroid)) {
            continue;
          }

          // Ignore collision if ship is invulnerable
          if (world.hasComponent(ship, "Invulnerable")) {
            continue;
          }

          let lives = 0;
          // Decrement lives in game state
          world.mutateSingleton("GameState", (state) => {
            state.lives = Math.max(0, state.lives - 1);
            lives = state.lives;
            if (state.lives <= 0) {
              state.isGameOver = true;
            }
          });

          // Reset combo on player hit/life loss
          if (world.hasComponent(ship, "Combo")) {
            world.mutateComponent(ship, "Combo", (c) => {
              c.combo = 0;
              c.multiplier = 1;
              c.timerRemaining = 0;
            });
          } else {
            const shipRemote = world.getComponent(ship, "RemotePlayer");
            const shipComp = world.getComponent(ship, "Ship");
            const ownerId = shipRemote?.sessionId || shipComp?.sessionId;
            let targetComboEntity: number | undefined;
            if (ownerId) {
              const playerEnt = this.findPlayerByOwnerId(world, ownerId);
              if (playerEnt !== undefined && world.hasComponent(playerEnt, "Combo")) {
                targetComboEntity = playerEnt;
              }
            }
            if (targetComboEntity === undefined) {
              const comboEntities = world.query("Combo");
              targetComboEntity = comboEntities[0];
            }
            if (targetComboEntity !== undefined) {
              world.mutateComponent(targetComboEntity, "Combo", (c) => {
                c.combo = 0;
                c.multiplier = 1;
                c.timerRemaining = 0;
              });
            }
          }

          // Spawn particle explosion for player ship impact/death
          triggerShipExplosionParticles(world, ship, AsteroidCollisionSystem.SHIP_EXPLOSION_COLORS);

          if (lives > 0) {
            // Respawn ship at center with invulnerability
            const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
            world.mutateComponent(ship, "Transform", (t) => {
              t.x = screen.width / 2;
              t.y = screen.height / 2;
            });
            world.mutateComponent(ship, "Velocity", (v) => {
              v.vx = 0;
              v.vy = 0;
            });
            world.getCommandBuffer().addComponent(ship, {
              type: "Invulnerable",
              remaining: 3.0
            });
          } else {
            // Modificaciones Diferidas: TODA eliminación debe hacerse con world.getCommandBuffer().removeEntity(entity)
            world.getCommandBuffer().removeEntity(ship);
            this.destroyedEntities.add(ship);
          }

          // Eventos Diferidos: Todo evento debe emitirse con eventBus.emitDeferred()
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("PlaySFX", { name: "explosion_large", volume: 1.0 });
            eventBus.emitDeferred("ship:destroyed", { entity: ship });
          }
        }
      }
    }
  }
  public dispose(): void {}
}
