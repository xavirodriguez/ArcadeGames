import { Collider2DComponent, ColliderComponent } from "../../ecs/CoreComponents";
import { ShapeType } from "../shapes/Shapes";

/**
 * Converts a 2D collider component definition into a normalized narrow-phase collision shape.
 *
 * @remarks
 * Unifies the shape conversion logic between `Collider2DComponent` and narrow-phase `ColliderComponent` shape format,
 * mapping `circle` -\> `ShapeType.Circle` and `aabb` -\> `ShapeType.Box` (with width/height calculated from halfWidth/halfHeight).
 *
 * @param collider2D - The 2D collider component instance to convert.
 * @returns The converted narrow-phase shape definition.
 * @public
 */
export function toShapeDefinition(
  collider2D: Readonly<Collider2DComponent>
): ColliderComponent["shape"] {
  if (collider2D.shape.type === "circle") {
    return { type: ShapeType.Circle, radius: collider2D.shape.radius };
  }
  return {
    type: ShapeType.Box,
    width: collider2D.shape.halfWidth * 2,
    height: collider2D.shape.halfHeight * 2
  };
}
