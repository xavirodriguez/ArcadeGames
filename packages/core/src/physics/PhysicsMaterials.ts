import { PhysicsMaterial } from "../ecs/CoreComponents";

/**
 * Calibratable starter materials for platformer surface authoring.
 * Values are gameplay tuning defaults, not universal physical constants.
 * @public
 */
export const PHYSICS_MATERIAL_PRESETS: Readonly<Record<"normal" | "ice" | "mud" | "elastic" | "conveyor", PhysicsMaterial>> = {
  normal: { id: "normal", staticFriction: 0.8, dynamicFriction: 0.6, restitution: 0, traction: 1 },
  ice: { id: "ice", staticFriction: 0.025, dynamicFriction: 0.015, restitution: 0, traction: 0.12 },
  mud: { id: "mud", staticFriction: 0.95, dynamicFriction: 0.8, restitution: 0, traction: 0.65 },
  elastic: { id: "elastic", staticFriction: 0.8, dynamicFriction: 0.55, restitution: 0.82, traction: 0.9 },
  conveyor: { id: "conveyor", staticFriction: 0.8, dynamicFriction: 0.6, restitution: 0, traction: 1, conveyorVelocity: { x: 120, y: 0 } }
};
