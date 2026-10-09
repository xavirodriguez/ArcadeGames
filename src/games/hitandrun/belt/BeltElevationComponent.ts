import type { BeltElevationComponent } from "@tiny-aster/core";

export type { BeltElevationComponent };

export function createBeltElevationComponent(
  z = 0,
  vz = 0,
  grounded = true
): BeltElevationComponent {
  return {
    type: "BeltElevation",
    z,
    vz,
    grounded
  };
}
