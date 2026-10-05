import { System, World, CoreComponentRegistry, RunState } from "@tiny-aster/core";
import { spawnWeaponPickup } from "../weapons/spawnWeaponPickup";

export class HitRunPowSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const pows = world.query("PowHostage", "Transform", "CollisionEvents");
    for (let i = 0; i < pows.length; i++) {
      const powEntity = pows[i];
      const pow = world.getComponent(powEntity, "PowHostage") as {
        id: string;
        weaponDrop: string;
        ammo: number;
        rescued?: boolean;
      } | undefined;

      if (!pow || pow.rescued) continue;

      const colEvents = world.getComponent(powEntity, "CollisionEvents") as {
        activeTriggers?: number[];
        triggersEntered?: number[];
      } | undefined;

      const triggers = [
        ...(colEvents?.triggersEntered ?? []),
        ...(colEvents?.activeTriggers ?? [])
      ];

      if (triggers.length === 0) continue;

      // Check if trigger is player
      let playerTriggered = false;
      for (let t = 0; t < triggers.length; t++) {
        if (world.hasComponent(triggers[t], "PlatformerInput")) {
          playerTriggered = true;
          break;
        }
      }

      if (playerTriggered) {
        // Rescue POW!
        world.mutateComponent(powEntity, "PowHostage", (p: unknown) => {
          (p as { rescued: boolean }).rescued = true;
        });

        const tr = world.getComponent(powEntity, "Transform") as { x: number; y: number } | undefined;
        const px = tr?.x ?? 0;
        const py = tr?.y ?? 0;

        // Spawn weapon pickup drop
        spawnWeaponPickup(world, {
          x: px,
          y: py - 10,
          weaponId: pow.weaponDrop,
          ammo: pow.ammo
        });

        // Grant score in RunState
        const rs = world.getResource<RunState>("RunState");
        if (rs) {
          rs.collectedTemporalIds.push(`pow_rescued_${pow.id}_${Date.now()}`);
        }

        if (!world.isReSimulating) {
          const bus = world.getEventBus();
          if (bus) bus.emit("PlaySFX", { name: "powerup" });
        }

        world.commands.removeEntity(powEntity);
      }
    }
  }
}
