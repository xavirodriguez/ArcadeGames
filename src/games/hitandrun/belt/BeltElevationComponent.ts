import type { Component } from "@tiny-aster/core";

/**
 * Component tracking vertical elevation above the belt-scroll ground plane.
 *
 * Design Decision:
 * "Transform.y = línea de pies sobre el plano del suelo.
 *  elevation.z = altura sobre el suelo (salto, hop, knockback).
 *  El sprite se dibuja hacia ARRIBA desde los pies; la sombra se dibuja
 *  SIEMPRE en el plano del suelo, sin elevation."
 */
export interface BeltElevationComponent extends Component {
  type: "BeltElevation";
  /** Height above ground plane in pixels (z >= 0). */
  z: number;
  /** Vertical speed along the z axis (positive upwards). */
  vz: number;
  /** Whether the entity is currently touching the ground plane. */
  grounded: boolean;
}

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
