/* eslint-disable @typescript-eslint/no-explicit-any */
import { World, System, resolveThemeColor } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { fragmentAsteroid } from "../EntityFactory";
import { spawnScorePopup } from "@tiny-aster/gameplay-kit";
import { createSharedParticle, EXPLOSION_PROFILES } from "../../shared/rendering/SharedVFX";
import { getLogsForLevel } from "../story/StoryBeats";
import { colors } from "../../../theme/colors";

/**
 * System to resolve collision logic for Asteroids.
 * Handles Bullet-Asteroid and Ship-Asteroid collisions using a double-safety approach:
 * A) Unique pair processing (entityA < entityB)
 * B) Verification that entities still exist before processing.
 * Utilizes the world CommandBuffer for deferred mutations and EventBus for deferred events.
 * @public
 */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private static readonly ASTEROID_EXPLOSION_COLORS = [colors.pink, colors.magenta, colors.white] as const;
  private static readonly SHIP_EXPLOSION_COLORS = [colors.cyan, colors.orange, colors.white] as const;

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
      /**
       * AST-001 Dual Death Resolution Mode:
       * When HasCombatSystem resource is true (CombatSystem registered in AsteroidsGame),
       * CombatSystem handles health mutation and emits 'combat:death' upon entity death.
       * AsteroidCollisionSystem handles score, combo, particle VFX, fragmentation and destruction
       * exclusively via this listener.
       * When HasCombatSystem is false (direct system mode in headless tests without CombatSystem),
       * AsteroidCollisionSystem.update() falls back to triggering onCombatDeath manually on collision.
       */
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

  private resolveScoreAndCombo(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    size: "large" | "medium" | "small",
    bullet?: number
  ): { newScore: number; scoreGain: number; nextMultiplier: number } {
    const config = world.getResource<any>("GameConfig") || {};
    let points = config.ASTEROID_SCORE_LARGE ?? 20;
    if (size === "medium") points = config.ASTEROID_SCORE_MEDIUM ?? 50;
    else if (size === "small") points = config.ASTEROID_SCORE_SMALL ?? 100;

    let nextCombo = 0;
    let nextMultiplier = 1;

    const comboEntities = world.query("Combo");
    const comboEntity = comboEntities[0];
    if (comboEntity !== undefined) {
      world.mutateComponent(comboEntity, "Combo", (c) => {
        c.combo++;
        c.timerRemaining = (config.COMBO_TIMEOUT ?? 2000) / 1000;
        c.multiplier = Math.min(config.MAX_MULTIPLIER ?? 10, 1 + Math.floor(c.combo / 5));
        nextCombo = c.combo;
        nextMultiplier = c.multiplier;
      });
    }

    const scoreGain = points * nextMultiplier;
    let newScore = scoreGain;
    world.mutateSingleton("GameState", (state) => {
      state.score += scoreGain;
      newScore = state.score;
    });

    if (bullet !== undefined && world.hasComponent(bullet, "Bullet")) {
      const bulletComp = world.getComponent(bullet, "Bullet");
      const ownerId = bulletComp?.ownerId;
      if (ownerId) {
        const playerEntity = this.findPlayerByOwnerId(world, ownerId);
        if (playerEntity !== undefined) {
          if (!world.hasComponent(playerEntity, "PlayerScore")) {
            world.getCommandBuffer().addComponent(playerEntity, {
              type: "PlayerScore",
              score: scoreGain
            });
          } else {
            world.mutateComponent(playerEntity, "PlayerScore", (ps) => {
              ps.score = (ps.score || 0) + scoreGain;
            });
          }
        }
      }
    }

    return { newScore, scoreGain, nextMultiplier };
  }

  private spawnExplosionParticles(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    transform: { x: number; y: number },
    size: "large" | "medium" | "small" | "ship"
  ): void {
    const particlePool = world.getResource<any>("ParticlePool");
    if (!particlePool) return;

    const ax = transform.x;
    const ay = transform.y;
    const profile = size === "large" ? EXPLOSION_PROFILES["enemy"] : EXPLOSION_PROFILES["small"];
    const particleCount = profile.particleCount;
    const rng = world.gameplayRandom;
    const colors = profile.colorSequence;

    for (let i = 0; i < particleCount; i++) {
      const angle = rng.next() * Math.PI * 2;
      const speed = rng.nextRange(40, 150);
      const px = ax + (rng.next() - 0.5) * 8;
      const py = ay + (rng.next() - 0.5) * 8;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[rng.nextInt(0, colors.length)];
      const pSize = rng.nextRange(1.5, 4.5);
      const ttl = rng.nextRange(0.4, 0.9);
      createSharedParticle(world, px, py, vx, vy, color, particlePool, pSize, ttl);
    }
  }

  private maybeSpawnStoryLog(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    transform: { x: number; y: number },
    size: "large" | "medium" | "small",
    nextMultiplier: number
  ): void {
    const gameState = world.getSingleton("GameState");
    const isStory = gameState?.mode === "story";
    const level = gameState?.level ?? 1;

    if (isStory && size === "large" && world.gameplayRandom.next() < 0.1) {
      const logs = getLogsForLevel(level);
      if (logs && logs.length > 0) {
        const logIndex = world.gameplayRandom.nextInt(0, logs.length);
        const logText = logs[logIndex];
        const logColor = resolveThemeColor(world, "system", "primary") || colors.cyan;
        spawnScorePopup(world, transform.x, transform.y - 20, logText, logColor);
      }
    }

    const multiplierColor = resolveThemeColor(world, "warning", "boss") || colors.gold;
    spawnScorePopup(world, transform.x, transform.y, `x${nextMultiplier}`, multiplierColor);
  }

  private resolveBulletUfoCollision(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    bullet: number,
    ufo: number
  ): void {
    if (this.destroyedEntities.has(bullet) || this.destroyedEntities.has(ufo)) return;

    const config = world.getResource<any>("GameConfig") || {};
    const ufoComp = world.getComponent(ufo, "Ufo");
    const points = ufoComp?.size === "small"
      ? (config.UFO_SCORE_SMALL ?? 1000)
      : (config.UFO_SCORE_LARGE ?? 200);

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

  private resolveBulletAsteroidCollision(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    bullet: number,
    asteroid: number
  ): void {
    if (this.destroyedEntities.has(bullet) || this.destroyedEntities.has(asteroid)) return;

    const hasCombatSystem = world.getResource("HasCombatSystem") === true;
    if (!hasCombatSystem) {
      // Fallback for direct/headless test mode without CombatSystem
      const health = world.getComponent(asteroid, "Health");
      const isDeadPending = health && health.current <= 0;
      if (!world.hasComponent(asteroid, "Dead") && !isDeadPending) {
        this.onCombatDeath(world, { entity: asteroid, sourceEntity: bullet });
        world.getCommandBuffer().removeEntity(bullet);
        this.destroyedEntities.add(bullet);
        this.destroyedEntities.add(asteroid);
      }
    }
  }

  private resolveShipAsteroidCollision(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    ship: number,
    asteroid: number
  ): void {
    if (this.destroyedEntities.has(ship) || this.destroyedEntities.has(asteroid)) return;

    // Ignore collision if ship is invulnerable
    if (world.hasComponent(ship, "Invulnerable")) return;

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
      const comboEntities = world.query("Combo");
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo", (c) => {
          c.combo = 0;
          c.multiplier = 1;
          c.timerRemaining = 0;
        });
      }
    }

    // Spawn particle explosion for player ship impact/death
    const shipTransform = world.getComponent(ship, "Transform");
    if (shipTransform) {
      this.spawnExplosionParticles(world, shipTransform, "ship");
    }

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

  private onCombatDeath(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, event: any): void {
    const asteroid = event.entity;
    const bullet = event.sourceEntity;

    if (this.processedDeaths.has(asteroid)) {
      return;
    }
    this.processedDeaths.add(asteroid);

    if (!world.hasComponent(asteroid, "Asteroid")) {
      return;
    }

    const asteroidComp = world.getComponent(asteroid, "Asteroid");
    const size = (asteroidComp?.size || "large") as "large" | "medium" | "small";

    const { newScore, scoreGain, nextMultiplier } = this.resolveScoreAndCombo(world, size, bullet);

    const asteroidTransform = world.getComponent(asteroid, "Transform");
    if (asteroidTransform) {
      this.maybeSpawnStoryLog(world, asteroidTransform, size, nextMultiplier);
      this.spawnExplosionParticles(world, asteroidTransform, size);
    }

    // Fragment asteroid
    fragmentAsteroid(world, asteroid);

    // Remove entity
    world.getCommandBuffer().removeEntity(asteroid);

    // Emit deferred events
    const eventBus = world.getEventBus();
    if (eventBus) {
      const sfxName = size === "large" ? "explosion_large" : "explosion_small";
      eventBus.emitDeferred("PlaySFX", { name: sfxName, pitchRange: 0.06 });
      eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size });
      eventBus.emitDeferred("score:changed", { newScore, delta: scoreGain });
    }
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
        if (isBulletA && isUfoB) {
          this.resolveBulletUfoCollision(world, entityA, entityB);
          continue;
        }
        if (isBulletB && isUfoA) {
          this.resolveBulletUfoCollision(world, entityB, entityA);
          continue;
        }

        // Case 1: Bullet-Asteroid
        if (isBulletA && isAsteroidB) {
          this.resolveBulletAsteroidCollision(world, entityA, entityB);
          continue;
        }
        if (isBulletB && isAsteroidA) {
          this.resolveBulletAsteroidCollision(world, entityB, entityA);
          continue;
        }

        // Case 2: Ship-Asteroid
        if (isShipA && isAsteroidB) {
          this.resolveShipAsteroidCollision(world, entityA, entityB);
          continue;
        }
        if (isShipB && isAsteroidA) {
          this.resolveShipAsteroidCollision(world, entityB, entityA);
          continue;
        }
      }
    }
  }
  public dispose(): void {}
}
