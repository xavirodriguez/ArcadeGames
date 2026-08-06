import { System, World, TransformComponent } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { GWBulletPool } from "../EntityPool";
import { GeometryWarsEntityFactory } from "../entities/GeometryWarsEntities";

/**
 * WeaponSystem handles weapon cooldowns, aiming deadzones, direction normalization,
 * and shooting bullets from the pre-allocated GWBulletPool (or fallback factory).
 * @public
 */
export class WeaponSystem extends System<GeometryWarsComponentRegistry> {
  private config?: GeometryWarsConfig;

  public update(world: World<GeometryWarsComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
      this.config = world.getResource<GeometryWarsConfig>("GameConfig")!;
    }

    const bulletSpeed = this.config?.BULLET_SPEED ?? 500;
    const bulletTTL = this.config?.BULLET_TTL ?? 1.2;
    const deadzone = 0.2; // 20% deadzone

    const pool = world.getResource<GWBulletPool>("GWBulletPool");

    const shooters = world.query("Weapon", "Aim", "Transform");
    for (const entity of shooters) {
      const weapon = world.getComponent(entity, "Weapon");
      const aim = world.getComponent(entity, "Aim");
      const transform = world.getComponent(entity, "Transform");

      if (!weapon || !aim || !transform) continue;

      // 1. Decrement cooldown
      let nextCooldown = weapon.cooldownRemaining;
      if (nextCooldown > 0) {
        nextCooldown -= deltaTime;
        if (nextCooldown < 0) nextCooldown = 0;

        world.mutateComponent(entity, "Weapon", (w) => {
          w.cooldownRemaining = nextCooldown;
        });
      }

      // 2. Read pointing direction
      const aimX = aim.aimX;
      const aimY = aim.aimY;
      const len = Math.sqrt(aimX * aimX + aimY * aimY);

      // Apply rotation to player ship transform if they are actively aiming
      if (len > deadzone) {
        const aimAngle = Math.atan2(aimY, aimX);
        world.mutateComponent(entity, "Transform", (t) => {
          t.rotation = aimAngle;
          t.worldRotation = aimAngle;
          t.dirty = true;
        });
      }

      // 3. Process shooting
      if (aim.isFiring && len >= deadzone && nextCooldown <= 0) {
        const dirX = aimX / len;
        const dirY = aimY / len;

        const vx = dirX * bulletSpeed;
        const vy = dirY * bulletSpeed;

        const px = transform.worldX ?? transform.x;
        const py = transform.worldY ?? transform.y;

        // Spawn bullet offset by player radius to prevent immediate overlap inside shooter
        const offset = 12;
        const bx = px + dirX * offset;
        const by = py + dirY * offset;
        const rotation = Math.atan2(dirY, dirX);

        if (pool) {
          pool.acquireBullet(world, bx, by, vx, vy, 4, "#ffff00", bulletTTL, rotation);
        } else {
          GeometryWarsEntityFactory.createBullet(world, bx, by, vx, vy, rotation);
        }

        // Reset cooldown
        world.mutateComponent(entity, "Weapon", (w) => {
          w.cooldownRemaining = weapon.cooldownDuration;
        });
      }
    }
  }
}
