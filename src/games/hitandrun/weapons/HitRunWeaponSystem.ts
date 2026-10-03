import {
  System,
  World,
  CoreComponentRegistry,
  PhysicsUtils
} from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import { isPlayerControlLocked } from "../hurt/HitRunHurtSystem";
import { getWeaponDefinition } from "./HitRunWeaponCatalog";
import type { HitRunWeaponId, HitRunWeaponState } from "./HitRunWeaponTypes";
import { fireWeapon, applyRecoil } from "./fireWeapon";

interface WeaponInputLike {
  firePressed?: boolean;
  fireHeld?: boolean;
  aimX?: number;
  aimY?: number;
}

/**
 * HitRunWeaponSystem — fire + facing + recoil + muzzle flash + micro-shake.
 */
export class HitRunWeaponSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (isSimulationFrozen(world)) return;

    const shooters = world.query("HitRunWeapon", "Transform");
    const len = shooters.length;

    for (let i = 0; i < len; i++) {
      const entity = shooters[i];
      const weaponState = world.getMutableComponent(entity, "HitRunWeapon") as
        | HitRunWeaponState
        | undefined;
      if (!weaponState) continue;

      if (weaponState.cooldownRemaining > 0) {
        weaponState.cooldownRemaining = PhysicsUtils.tickTimer(
          weaponState.cooldownRemaining,
          deltaTime
        );
      }

      if ((weaponState.muzzleFlashRemaining ?? 0) > 0) {
        weaponState.muzzleFlashRemaining = Math.max(
          0,
          (weaponState.muzzleFlashRemaining ?? 0) - deltaTime
        );
      }

      if (isPlayerControlLocked(world, entity)) continue;

      const def = getWeaponDefinition(weaponState.weaponId as HitRunWeaponId);
      const input = this.readInput(world, entity);
      if (!input?.firePressed && !input?.fireHeld) continue;
      if (weaponState.cooldownRemaining > 0) continue;

      const transform = world.getMutableComponent(entity, "Transform");
      if (!transform) continue;

      const ox = transform.worldX ?? transform.x;
      const oy = transform.worldY ?? transform.y;

      let dirX = input.aimX ?? 0;
      let dirY = input.aimY ?? 0;
      if (Math.abs(dirX) < 1e-4 && Math.abs(dirY) < 1e-4) {
        dirX = (transform.scaleX ?? 1) >= 0 ? 1 : -1;
        dirY = 0;
      }

      // Face the shot direction (horizontal)
      if (Math.abs(dirX) > 0.01) {
        const face = dirX >= 0 ? 1 : -1;
        transform.scaleX = face;
        transform.worldScaleX = face;
      }

      const spawned = fireWeapon({
        world,
        shooterEntity: entity,
        originX: ox,
        originY: oy,
        dirX,
        dirY,
        weapon: def
      });

      if (spawned > 0) {
        applyRecoil(world, entity, dirX, dirY, def.recoilImpulse);
        weaponState.cooldownRemaining = def.cooldownDuration;
        weaponState.muzzleFlashRemaining = 0.06;

        if (!world.isReSimulating) {
          const shake = world.getResource<{ intensity: number; duration: number; elapsed: number }>(
            "HitRunScreenShake"
          );
          if (shake) {
            shake.intensity = Math.min(6, shake.intensity + (def.id === "hmg" ? 1.2 : 4));
            shake.duration = Math.max(shake.duration, def.id === "hmg" ? 0.08 : 0.2);
            shake.elapsed = 0;
          }
          const cams = world.query("Camera2D");
          for (let c = 0; c < cams.length; c++) {
            const cam = world.getComponent(cams[c], "Camera2D") as { isMain?: boolean } | undefined;
            if (!cam?.isMain) continue;
            if (!world.hasComponent(cams[c], "ScreenShake")) {
              world.addComponent(cams[c], {
                type: "ScreenShake",
                intensity: def.id === "hmg" ? 2.5 : 8,
                duration: def.id === "hmg" ? 0.06 : 0.18,
                remaining: def.id === "hmg" ? 0.06 : 0.18
              } as { type: string; [key: string]: unknown });
            } else {
              world.mutateComponent(cams[c], "ScreenShake", (s: {
                intensity: number;
                duration: number;
                remaining?: number;
                elapsed?: number;
              }) => {
                s.intensity = Math.min(10, s.intensity + (def.id === "hmg" ? 1.5 : 5));
                s.duration = Math.max(s.duration, def.id === "hmg" ? 0.06 : 0.18);
                if (s.remaining !== undefined) s.remaining = s.duration;
                if (s.elapsed !== undefined) s.elapsed = 0;
              });
            }
            break;
          }
        }
      }

      const platInput = world.getMutableComponent(entity, "PlatformerInput") as
        | WeaponInputLike
        | undefined;
      if (platInput && platInput.firePressed) {
        platInput.firePressed = false;
      }
    }
  }

  private readInput(
    world: World<CoreComponentRegistry>,
    entity: number
  ): WeaponInputLike | undefined {
    const plat = world.getComponent(entity, "PlatformerInput") as
      | WeaponInputLike
      | undefined;
    if (plat) return plat;
    const aim = world.getComponent(entity, "Aim") as
      | { aimX?: number; aimY?: number; isFiring?: boolean }
      | undefined;
    if (aim) {
      return {
        fireHeld: !!aim.isFiring,
        aimX: aim.aimX,
        aimY: aim.aimY
      };
    }
    return undefined;
  }
}
