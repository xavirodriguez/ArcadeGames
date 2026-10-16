import type { BeltElevationComponent as CoreBeltElevationComponent, World, CoreComponentRegistry, Entity } from "@tiny-aster/core";

export interface BeltElevationComponent extends CoreBeltElevationComponent {
  type: "BeltElevation";
  z: number;
  vz: number;
  grounded: boolean;
  landTimer?: number;
  juggleCount?: number;
}

export function createBeltElevationComponent(
  z = 0,
  vz = 0,
  grounded = true,
  landTimer = 0,
  juggleCount = 0
): BeltElevationComponent {
  return {
    type: "BeltElevation",
    z,
    vz,
    grounded,
    landTimer,
    juggleCount
  };
}

export function applyBeltElevationKnockback(
  world: World<CoreComponentRegistry>,
  entity: Entity,
  knockY: number
): void {
  const elev = world.getMutableComponent(entity, "BeltElevation") as
    | BeltElevationComponent
    | undefined;
  if (elev) {
    const currentJuggle = elev.juggleCount ?? 0;
    if (!elev.grounded) {
      elev.juggleCount = currentJuggle + 1;
    }
    const juggleDiminish = elev.juggleCount && elev.juggleCount > 4 ? 0.3 : 1.0;
    elev.vz = Math.abs(knockY) * juggleDiminish;
    elev.grounded = false;
  }
}
