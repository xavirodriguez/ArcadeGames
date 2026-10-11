/**
 * Parametric entity geometry profiles for data-driven reskins and Concept Packs.
 * @public
 */

/**
 * Normalized 2D coordinate offset.
 * @public
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Individual path element within a parametric entity geometry profile.
 * @public
 */
export interface GeometrySubPath {
  /** Array of normalized points relative to entity center (1.0 = base size radius). */
  points: Point2D[];
  /** Whether the path should be closed when drawn. Default true. */
  closed?: boolean;
  /** Fill color override or theme token key. If omitted, uses base entity color. */
  fillColor?: string;
  /** Stroke color override or theme token key. */
  strokeColor?: string;
  /** Stroke line width multiplier relative to base line width (1.0). */
  lineWidth?: number;
  /** Primary geometry primitive type. Default "polyline". */
  type?: "polyline" | "ellipse" | "arc";
  /** Radial dimensions for ellipse primitive types. */
  ellipseRadiusX?: number;
  ellipseRadiusY?: number;
  /** Parameters for arc primitive types. */
  arcRadius?: number;
  startAngle?: number;
  endAngle?: number;
  /** Opacity override for this subpath (0.0 to 1.0). */
  alpha?: number;
}

/**
 * Complete parametric geometry specification for an entity type.
 * @public
 */
export interface EntityGeometryProfile {
  /** Ordered layer list of drawing subpaths. */
  subPaths: GeometrySubPath[];
  /** Forward direction vector normalized ({x:1, y:0} means right/forward). */
  forwardAxis?: Point2D;
  /** Anchor coordinate for projectile/muzzle flare spawning relative to center. */
  muzzleOffset?: Point2D;
  /** Anchor coordinate for thruster/exhaust trail spawning relative to center. */
  exhaustOffset?: Point2D;
  /** Motion secondary effect type generated when entity is moving or thrusting. */
  motionEffect?: "flame" | "exhaust_smoke" | "dust_trail" | "none";
  /** Optional overall scale multiplier applied during drawing. */
  scaleMultiplier?: number;
}
