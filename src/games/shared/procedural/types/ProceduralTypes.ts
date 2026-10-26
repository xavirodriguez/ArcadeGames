/**
 * Procedural Scene Data Contracts and Primitives
 * Platform-agnostic, renderer-decoupled vector primitives and generation options.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface PolygonPrimitive {
  type: "polygon";
  points: Point2D[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
}

export interface PolylinePrimitive {
  type: "polyline";
  points: Point2D[];
  stroke: string;
  strokeWidth?: number;
  alpha?: number;
}

export interface EllipsePrimitive {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
}

export interface LinePrimitive {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
  alpha?: number;
}

export interface PathPrimitive {
  type: "path";
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
}

export type ScenePrimitive =
  | PolygonPrimitive
  | PolylinePrimitive
  | EllipsePrimitive
  | LinePrimitive
  | PathPrimitive;

export interface ProceduralScene {
  primitives: ScenePrimitive[];
  width: number;
  height: number;
  seed: number;
  layer?: string;
  depth?: number;
}

export interface GeneratorOptions {
  seed?: number;
  x?: number;
  y?: number;
  scale?: number;
  width?: number;
  height?: number;
  color?: string;
  palette?: Record<string, string>;
  detail?: number;
  density?: number;
  args?: Record<string, string | number | boolean>;
}
