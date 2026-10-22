/* eslint-disable @typescript-eslint/no-explicit-any */
import { World, System, resolveThemeColor, Juice } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { createAsteroid, createShip } from "../EntityFactory";
import { colors } from "../../../theme/colors";
import { getLogsForLevel } from "../story/StoryBeats";
import { spawnScorePopup } from "../../shared/rendering/ScorePopup";
import { createSharedParticle, EXPLOSION_PROFILES, spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";
import { spawnIceShardFracture } from "../mods/iceberg/IcebergFracture";

/**
 * Handles all Asteroids-specific collision reactions:
 * - Bullet vs Asteroid (score, split, particles)
 * - Bullet vs UFO
 * - Ship vs Asteroid / UFO (death, respawn)
 *
 * CombatSystem owns health mutation; this system owns game-rules side effects.
 */
export class AsteroidCollisionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private destroyedEntities = new Set<number>();

  update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, _dt: number): void {
    this.destroyedEntities.clear();

    const events = world.getComponentQueryResults
      ? null
      : null;

    // Process collision events from CollisionEvents components
    const entities = world.query("CollisionEvents");
    for (const entity of entities) {
      const collisionEvents = world.getComponent(entity, "CollisionEvents");
      if (!collisionEvents || !collisionEvents.events) continue;

      for (const event of collisionEvents.events) {
        const other = event.otherEntityId;
        if (other === undefined) continue;

        // Bullet hit asteroid
        if (world.hasComponent(entity, "Bullet") && world.hasComponent(other, "Asteroid")) {
          this.resolveBulletAsteroidCollision(world, entity, other);
        } else if (world.hasComponent(entity, "Asteroid") && world.hasComponent(other, "Bullet")) {
          this.resolveBulletAsteroidCollision(world, other, entity);
        }

        // Bullet hit UFO
        if (world.hasComponent(entity, "Bullet") && world.hasComponent(other, "Ufo")) {
          this.resolveBulletUfoCollision(world, entity, other);
        } else if (world.hasComponent(entity, "Ufo") && world.hasComponent(other, "Bullet")) {
          this.resolveBulletUfoCollision(world, other, entity);
        }

        // Ship hit asteroid
        if (world.hasComponent(entity, "Ship") && world.hasComponent(other, "Asteroid")) {
          this.resolveShipHazardCollision(world, entity, other);
        } else if (world.hasComponent(entity, "Asteroid") && world.hasComponent(other, "Ship")) {
          this.resolveShipHazardCollision(world, other, entity);
        }

        // Ship hit UFO
        if (world.hasComponent(entity, "Ship") && world.hasComponent(other, "Ufo")) {
          this.resolveShipHazardCollision(world, entity, other);
        } else if (world.hasComponent(entity, "Ufo") && world.hasComponent(other, "Ship")) {
          this.resolveShipHazardCollision(world, other, entity);
        }
      }
    }
  }

  private spawnExplosionParticles(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    transform: { x: number; y: number },
    size: "large" | "medium" | "small" | "ship"
  ): void {
    // Borealis skin: crystalline fracture instead of neon explosion
    const visualMod = world.getResource<{ particleStyle?: string }>("VisualMod");
    if (visualMod?.particleStyle === "iceShard") {
      spawnIceShardFracture(world, transform.x, transform.y, size);
      return;
    }
    const explosionType = size === "ship" ? "ship" : size === "large" ? "enemy" : "small";
    spawnLayeredExplosion(world, transform.x, transform.y, { type: explosionType });
  }

  // NOTE: Remaining methods restored from master in full file push below if this
  // truncated path is used — prefer full master content.
}
