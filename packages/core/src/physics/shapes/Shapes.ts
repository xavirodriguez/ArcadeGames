export const ShapeType = {
  /** Circular geometry defined by a central radius. */
  Circle: 0,
  /** Axis-aligned or rotated box defined by width and height. */
  Box: 1,
  /** Arbitrary convex polygon defined by ordered local-space vertices. */
  Polygon: 2,
  0: "Circle",
  1: "Box",
  2: "Polygon"
} as const;

/**
 * Primitive geometric shape discriminators supported by the physics collision pipeline.
 * @public
 */
export type ShapeType =
  | typeof ShapeType.Circle
  | typeof ShapeType.Box
  | typeof ShapeType.Polygon;

/**
 * Base primitive shape contract containing the shape discriminator.
 * @public
 */
export interface BaseShape {
  /** The concrete shape discriminator type. */
  type: ShapeType;
}

/**
 * Circle collision geometry.
 * @public
 */
export interface CircleShape extends BaseShape {
  /** Circle discriminator type. */
  type: typeof ShapeType.Circle;
  /** Radial extent of the circle. */
  radius: number;
}

/**
 * Box collision geometry.
 * @public
 */
export interface BoxShape extends BaseShape {
  /** Box discriminator type. */
  type: typeof ShapeType.Box;
  /** Total horizontal width. */
  width: number;
  /** Total vertical height. */
  height: number;
}

/**
 * Convex polygon collision geometry.
 * @public
 */
export interface ConvexPolygonShape extends BaseShape {
  /** Polygon discriminator type. */
  type: typeof ShapeType.Polygon;
  /** Ordered array of local vertex coordinates forming a convex hull. */
  vertices: Array<{ x: number; y: number }>;
}

/**
 * Discriminated union of all supported primitive physics collision shapes.
 * @public
 */
export type Shape = CircleShape | BoxShape | ConvexPolygonShape;
