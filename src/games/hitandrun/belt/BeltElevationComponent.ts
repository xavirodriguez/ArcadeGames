import type { BeltElevationComponent as CoreBeltElevationComponent } from "@tiny-aster/core";

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
