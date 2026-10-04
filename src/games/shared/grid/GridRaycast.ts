import { GridCoordinates } from "./GridTypes";
import { isInBounds } from "./GridQueries";

/**
 * Detailed result of a grid raycast operation.
 * @public
 */
export interface GridRaycastHit {
  /** Coordinate where the ray stopped or hit a blocking tile. */
  coordinates: GridCoordinates;
  /** `true` if ray was stopped by a blocking tile; `false` if it reached maxDistance or grid bounds. */
  hit: boolean;
  /** Sequence of all tile coordinates traversed by the ray (including start and hit tile). */
  traversed: GridCoordinates[];
}

/**
 * Propagates a ray across a tile grid cell-by-cell in direction `(dRow, dCol)`.
 *
 * @remarks
 * Evaluates passability at each grid step up to `maxDistance`. Useful for Bomberman explosion propagation,
 * maze line-of-sight, or grid projectile tracing.
 *
 * @param rows - Total grid row height.
 * @param cols - Total grid column width.
 * @param start - Starting grid coordinate.
 * @param direction - Direction vector in grid steps `{ dRow, dCol }`.
 * @param maxDistance - Maximum step distance in tiles.
 * @param isBlocking - Optional predicate returning `true` if a coordinate blocks the ray.
 * @returns `GridRaycastHit` detailing traversed coordinates and hit status.
 * @public
 */
export function gridRaycast(
  rows: number,
  cols: number,
  start: GridCoordinates,
  direction: { dRow: number; dCol: number },
  maxDistance: number,
  isBlocking?: (coords: GridCoordinates) => boolean
): GridRaycastHit {
  const traversed: GridCoordinates[] = [];

  if (!isInBounds(rows, cols, start)) {
    return { coordinates: start, hit: false, traversed: [] };
  }

  traversed.push({ row: start.row, col: start.col });

  if (isBlocking && isBlocking(start)) {
    return { coordinates: { row: start.row, col: start.col }, hit: true, traversed };
  }

  // Normalize discrete cardinal step direction if integer
  const stepRow = Math.sign(direction.dRow);
  const stepCol = Math.sign(direction.dCol);

  if (stepRow === 0 && stepCol === 0) {
    return { coordinates: { row: start.row, col: start.col }, hit: false, traversed };
  }

  let currRow = start.row;
  let currCol = start.col;
  let dist = 0;

  while (dist < maxDistance) {
    const nextRow = currRow + stepRow;
    const nextCol = currCol + stepCol;
    const nextCoords: GridCoordinates = { row: nextRow, col: nextCol };

    if (!isInBounds(rows, cols, nextCoords)) {
      break;
    }

    dist++;
    currRow = nextRow;
    currCol = nextCol;
    traversed.push(nextCoords);

    if (isBlocking && isBlocking(nextCoords)) {
      return { coordinates: nextCoords, hit: true, traversed };
    }
  }

  return {
    coordinates: { row: currRow, col: currCol },
    hit: false,
    traversed,
  };
}
