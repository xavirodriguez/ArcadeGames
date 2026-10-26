import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerHitRunWeapons } from "../weapons/registerHitRunWeapons";
import { HitRunEnemyBulletPool } from "../weapons/HitRunEnemyBulletPool";

describe("Hit&Run enemy projectile pool registration", () => {
  it("registers a preallocated 128-slot EnemyBulletPool resource", () => {
    const world = new World<CoreComponentRegistry>();
    registerHitRunWeapons(world);

    const pool = world.getResource<HitRunEnemyBulletPool>("EnemyBulletPool");
    expect(pool).toBeInstanceOf(HitRunEnemyBulletPool);
    expect(pool?.size).toBe(128);
  });
});
