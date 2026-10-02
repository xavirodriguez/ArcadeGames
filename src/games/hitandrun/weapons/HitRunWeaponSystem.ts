import {
  System,
  World,
  CoreComponentRegistry,
  PhysicsUtils
} from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import { getWeaponDefinition } from "./HitRunWeaponCatalog";
import type { HitRunWeaponId, HitRunWeaponState } from "./HitRunWeaponTypes";
import { fireWeapon, applyRecoil } from "./fireWeapon";

/**
 * Input mínimo esperado en el componente de input del jugador.
 * (Compatible con PlatformerInput extendido o un Aim component.)
 */
interface WeaponInputLike {
  firePressed?: boolean;
  fireHeld?: boolean;
  /** -1..1 o pixels; si no hay aim, se usa facing del Transform.scaleX */
  aimX?: number;
  aimY?: number;
}

/**
 * HitRunWeaponSystem — lee arma equipada + input y llama a fireWeapon.
 *
 * Fase: SystemPhase.Simulation (o Input, tras leer input).
 * Respeta hit-stop vía isSimulationFrozen.
 *
 * Requiere en el jugador:
 *  - HitRunWeapon (weaponId, cooldownRemaining)
 *  - Transform
 *  - PlatformerInput u otro con firePressed / aim
 */
export class HitRunWeaponSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (isSimulationFrozen(world)) return;

    const shooters = world.query("HitRunWeapon" as any, "Transform");
    const len = shooters.length;

    for (let i = 0; i < len; i++) {
      const entity = shooters[i];
      const weaponState = world.getMutableComponent(entity, "HitRunWeapon" as any) as
        | HitRunWeaponState
        | undefined;
      if (!weaponState) continue;

      // Cooldown
      if (weaponState.cooldownRemaining > 0) {
        weaponState.cooldownRemaining = PhysicsUtils.tickTimer(
          weaponState.cooldownRemaining,
          deltaTime
        );
      }

      const def = getWeaponDefinition(weaponState.weaponId as HitRunWeaponId);
      const input = this.readInput(world, entity);
      if (!input?.firePressed && !input?.fireHeld) continue;
      if (weaponState.cooldownRemaining > 0) continue;

      const transform = world.getComponent(entity, "Transform");
      if (!transform) continue;

      const ox = transform.worldX ?? transform.x;
      const oy = transform.worldY ?? transform.y;

      let dirX = input.aimX ?? 0;
      let dirY = input.aimY ?? 0;
      if (Math.abs(dirX) < 1e-4 && Math.abs(dirY) < 1e-4) {
        // Facing por scaleX (platformer)
        dirX = (transform.scaleX ?? 1) >= 0 ? 1 : -1;
        dirY = 0;
      }

      fireWeapon({
        world,
        shooterEntity: entity,
        originX: ox,
        originY: oy,
        dirX,
        dirY,
        weapon: def
      });

      applyRecoil(world, entity, dirX, dirY, def.recoilImpulse);

      weaponState.cooldownRemaining = def.cooldownDuration;

      // Consumir one-shot firePressed si existe en PlatformerInput
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
