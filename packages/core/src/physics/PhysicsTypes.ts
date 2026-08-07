import { Shape } from "./shapes/Shapes";

/** @public */
export interface PhysicsTransformLike {
  x: number;
  y: number;
  worldX?: number;
  worldY?: number;
  rotation?: number;
  worldRotation?: number;
}

/** @public */
export interface ColliderLike {
  shape: Shape;
  enabled: boolean;
  offsetX?: number;
  offsetY?: number;
}
