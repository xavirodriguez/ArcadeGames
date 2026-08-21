/**
 * Primitive geometric shape discriminators supported by the physics collision pipeline.
 * @public
 */
export enum ShapeType {
  /** Circular geometry defined by a central radius. */
  Circle,
  /** Axis-aligned or rotated box defined by width and height. */
  Box,
  /** Arbitrary convex polygon defined by ordered local-space vertices. */
  Polygon
}

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
  type: ShapeType.Circle;
  /** Radial extent of the circle. */
  radius: number;
}

/**
 * Box collision geometry.
 * @public
 */
export interface BoxShape extends BaseShape {
  /** Box discriminator type. */
  type: ShapeType.Box;
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
  type: ShapeType.Polygon;
  /** Ordered array of local vertex coordinates forming a convex hull. */
  vertices: Array<{ x: number; y: number }>;
}

/**
 * Discriminated union of all supported primitive physics collision shapes.
 * @public
 */
export type Shape = CircleShape | BoxShape | ConvexPolygonShape;
