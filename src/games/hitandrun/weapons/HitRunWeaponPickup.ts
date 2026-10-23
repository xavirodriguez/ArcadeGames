import {
  System,
  World,
  CoreComponentRegistry,
  Entity,
  BlueprintDefinition,
  SystemPhase
} from "@tiny-aster/core";
import { getWeaponDefinition } from "./HitRunWeaponCatalog";
import type { HitRunWeaponId, HitRunWeaponState } from "./HitRunWeaponTypes";

export interface WeaponPickupComponent {
  type: "WeaponPickup";
  weaponId: HitRunWeaponId;
  ammoGrant?: number;
}

export const WEAPON_PICKUP_LAYER = 1 << 5;

export interface WeaponPickupSpawnArgs {
  x: number;
  y: number;
  z?: number;
  weaponId: HitRunWeaponId;
  ammoGrant?: number;
}

export function createWeaponPickupBlueprint(): BlueprintDefinition<
  CoreComponentRegistry,
  import("@tiny-aster/core").EventRegistry,
  WeaponPickupSpawnArgs
> {
  return {
    spawn(world, entity, args) {
      const def = getWeaponDefinition(args.weaponId);
      const isUpdating = world.isUpdating;
      const cmd = world.getCommandBuffer();

      const transformComp = {
        type: "Transform",
        x: args.x,
        y: args.y,
        worldX: args.x,
        worldY: args.y,
        rotation: 0,
        worldRotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      } as const;

      const elevComp = {
        type: "BeltElevation",
        z: args.z ?? 0,
        vz: 0,
        grounded: true
      } as const;

      const colliderComp = {
        type: "Collider2D",
        shape: { type: "circle", radius: 14 },
        layer: WEAPON_PICKUP_LAYER,
        mask: 0xffff,
        offsetX: 0,
        offsetY: 0,
        isTrigger: true,
        enabled: true
      } as const;

      const pickupComp: WeaponPickupComponent = {
        type: "WeaponPickup",
        weaponId: args.weaponId,
        ammoGrant: args.ammoGrant ?? def.ammoMax
      };

      const renderComp = {
        type: "Render",
        shape: "pickup_weapon",
        size: 14,
        color: def.projectileColor,
        visible: true,
        opacity: 1,
        order: 3,
        depthSort: true,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as const;

      if (isUpdating) {
        cmd.addComponent(entity, transformComp as never);
        cmd.addComponent(entity, elevComp as never);
        cmd.addComponent(entity, colliderComp as never);
        cmd.addComponent(entity, pickupComp as never);
        cmd.addComponent(entity, renderComp as never);
      } else {
        world.addComponent(entity, transformComp as never);
        world.addComponent(entity, elevComp as never);
        world.addComponent(entity, colliderComp as never);
        world.addComponent(entity, pickupComp as never);
        world.addComponent(entity, renderComp as never);
      }
    }
  };
}

export class HitRunWeaponPickupSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    const pickups = world.query("WeaponPickup", "Transform");
    if (pickups.length === 0) return;

    let players = world.query("BeltInput", "HitRunWeapon", "Transform");
    if (players.length === 0) {
      players = world.query("PlatformerInput", "HitRunWeapon", "Transform");
    }
    if (players.length === 0) return;

    for (let p = 0; p < players.length; p++) {
      const playerEntity = players[p];
      const pTr = world.getComponent(playerEntity, "Transform");
      const pElev = world.getComponent(playerEntity, "BeltElevation");
      const pWeapon = world.getMutableComponent(playerEntity, "HitRunWeapon") as
        | HitRunWeaponState
        | undefined;
      if (!pTr || !pWeapon) continue;

      const px = pTr.worldX ?? pTr.x;
      const py = pTr.worldY ?? pTr.y;
      const pz = pElev?.z ?? 0;

      for (let i = 0; i < pickups.length; i++) {
        const pickupEntity = pickups[i];
        if (world.hasComponent(pickupEntity, "Dead")) continue;

        const pickup = world.getComponent(pickupEntity, "WeaponPickup") as
          | WeaponPickupComponent
          | undefined;
        const pickupTr = world.getComponent(pickupEntity, "Transform");
        const pickupElev = world.getComponent(pickupEntity, "BeltElevation");
        if (!pickup || !pickupTr) continue;

        const kx = pickupTr.worldX ?? pickupTr.x;
        const ky = pickupTr.worldY ?? pickupTr.y;
        const kz = pickupElev?.z ?? 0;

        const dx = kx - px;
        const dy = ky - py;
        const dz = kz - pz;

        // Collision radius check (24px 2D + 30px Z elevation)
        if (dx * dx + dy * dy <= 24 * 24 && Math.abs(dz) <= 30) {
          const def = getWeaponDefinition(pickup.weaponId);
          const maxAmmo = def.ammoMax ?? Number.POSITIVE_INFINITY;
          const ammoGrant = pickup.ammoGrant ?? maxAmmo;

          if (pWeapon.weaponId === pickup.weaponId) {
            pWeapon.ammoCurrent = Math.min(
              maxAmmo,
              (pWeapon.ammoCurrent ?? 0) + ammoGrant
            );
          } else {
            pWeapon.weaponId = pickup.weaponId;
            pWeapon.ammoMax = maxAmmo;
            pWeapon.ammoCurrent = ammoGrant;
          }

          if (!world.isReSimulating) {
            world.getEventBus()?.emit("PlaySFX", { name: "item_pickup" });
          }

          world.getCommandBuffer().addComponent(pickupEntity, { type: "Dead" });
        }
      }
    }
  }
}

export function registerHitRunWeaponPickups(world: World<CoreComponentRegistry>): void {
  world.addSystem(new HitRunWeaponPickupSystem(), {
    phase: SystemPhase.Simulation,
    priority: 15
  });
}
