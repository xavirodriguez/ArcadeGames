/**
 * Data structures for pure grid geometry conversions and queries.
 *
 * @packageDocumentation
 */

/** Describe la geometría de un grid: paso entre celdas y origen en mundo. */
export interface GridLayout {
  readonly stepX: number;
  readonly stepY: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface GridCoordinates {
  readonly row: number;
  readonly col: number;
}

export interface WorldPosition {
  readonly x: number;
  readonly y: number;
}

export interface GridPositionComponent {
  type: "GridPosition";
  row: number;
  col: number;
}
