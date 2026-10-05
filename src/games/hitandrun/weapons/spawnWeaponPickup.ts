import {
  World,
  Entity,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { ArcadeEntityBuilder } from "@tiny-aster/gameplay-kit";

export interface WeaponPickupArgs {
  x: number;
  y: number;
  weaponId: string;
  ammo?: number;
}

export function spawnWeaponPickup(
  world: World<CoreComponentRegistry>,
  args: WeaponPickupArgs
): Entity {
  const entity = world.createEntity();

  ArcadeEntityBuilder.fromEntity(world, entity)
    .withTransform({ x: args.x, y: args.y })
    .withCollider2D({
      shape: { type: "aabb", halfWidth: 12, halfHeight: 12 },
      isTrigger: true,
      layer: 1 << 6,
      mask: 1 // Player mask
    })
    .withCollisionEvents()
    .withRender({ shape: `pickup_${args.weaponId}`, size: 20, order: 3 });

  world.addComponent(entity, {
    type: "WeaponPickup",
    weaponId: args.weaponId,
    ammo: args.ammo
  } as { type: string; [key: string]: unknown });

  world.addComponent(entity, {
    type: "Tag",
    tags: ["WeaponPickup"]
  });

  return entity;
}
