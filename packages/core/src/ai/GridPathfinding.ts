import { RandomService } from "../utils/RandomService";

/**
 * Tile coordinate point in 2D grid space.
 * @public
 */
export interface GridPoint {
  /** Column / X index on grid. */
  x: number;
  /** Row / Y index on grid. */
  y: number;
}

/**
 * Contract defining passability and cost queries for a 2D grid.
 * @public
 */
export interface GridPassabilityMap {
  /** Total grid width in columns. */
  width: number;
  /** Total grid height in rows. */
  height: number;
  /** Returns `true` if the specified grid coordinate is walkable. */
  isWalkable(x: number, y: number): boolean;
  /** Optional movement cost for entering tile at `(x, y)` (defaults to 1). */
  getCost?(x: number, y: number): number;
}

/**
 * Options configuring pathfinding execution.
 * @public
 */
export interface PathfindingOptions {
  /** Optional seeded RandomService for deterministic tie-breaking. */
  random?: RandomService;
  /** Whether diagonal movement is enabled (defaults to false). */
  allowDiagonal?: boolean;
  /** Maximum number of node expansions before giving up (defaults to 10000). */
  maxNodes?: number;
  /** Whether to include the start point as the first element in the returned path (defaults to true). */
  includeStart?: boolean;
}

/**
 * Intersection / decision point result for corridor / maze navigation.
 * @public
 */
export interface IntersectionResult {
  /** Grid coordinate of the decision intersection point. */
  point: GridPoint;
  /** List of valid walkable direction vectors from this intersection point. */
  availableDirections: GridPoint[];
  /** Distance in tiles from current position to intersection. */
  distance: number;
}

/**
 * Cardinal directions in fixed, deterministic exploration order: Up, Right, Down, Left.
 * @public
 */
export const CARDINAL_DIRECTIONS: ReadonlyArray<GridPoint> = [
  { x: 0, y: -1 }, // Up
  { x: 1, y: 0 },  // Right
  { x: 0, y: 1 },  // Down
  { x: -1, y: 0 }, // Left
];

/**
 * Eight-way cardinal + diagonal directions in fixed exploration order.
 * @public
 */
export const EIGHT_DIRECTIONS: ReadonlyArray<GridPoint> = [
  { x: 0, y: -1 },  // Up
  { x: 1, y: -1 },  // Up-Right
  { x: 1, y: 0 },   // Right
  { x: 1, y: 1 },   // Down-Right
  { x: 0, y: 1 },   // Down
  { x: -1, y: 1 },  // Down-Left
  { x: -1, y: 0 },  // Left
  { x: -1, y: -1 }, // Up-Left
];

/**
 * Deterministic Grid Pathfinding engine implementing BFS, A*, and Pac-Man intersection targeting.
 *
 * @remarks
 * All algorithms maintain strict determinism by using a fixed neighbor exploration order
 * and deterministic tie-breaking (by heuristic score, coordinate priority, or injected `RandomService`).
 *
 * @public
 */
export class GridPathfinding {
  /**
   * Finds a shortest path on a grid using Breadth-First Search (BFS).
   *
   * @param grid - Grid map defining dimensions and walkability.
   * @param start - Starting grid coordinate.
   * @param target - Target grid coordinate.
   * @param options - Pathfinding configuration options.
   * @returns Array of grid points representing the path, or empty array if no path exists.
   */
  public static bfs(
    grid: GridPassabilityMap,
    start: GridPoint,
    target: GridPoint,
    options?: PathfindingOptions
  ): GridPoint[] {
    if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(target.x, target.y)) {
      return [];
    }

    if (start.x === target.x && start.y === target.y) {
      return options?.includeStart !== false ? [{ x: start.x, y: start.y }] : [];
    }

    const directions = options?.allowDiagonal ? EIGHT_DIRECTIONS : CARDINAL_DIRECTIONS;
    const maxNodes = options?.maxNodes ?? 10000;
    const includeStart = options?.includeStart !== false;

    const queue: GridPoint[] = [start];
    const visited = new Set<string>();
    const parentMap = new Map<string, GridPoint>();

    const startKey = `${start.x},${start.y}`;
    visited.add(startKey);

    let nodesExpanded = 0;
    let found = false;

    while (queue.length > 0 && nodesExpanded < maxNodes) {
      const current = queue.shift()!;
      nodesExpanded++;

      if (current.x === target.x && current.y === target.y) {
        found = true;
        break;
      }

      for (let i = 0; i < directions.length; i++) {
        const dir = directions[i];
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;

        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) {
          continue;
        }

        if (!grid.isWalkable(nx, ny)) {
          continue;
        }

        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          parentMap.set(key, current);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    if (!found) {
      return [];
    }

    return reconstructPath(parentMap, start, target, includeStart);
  }

  /**
   * Finds an optimal path on a grid using A* search with Manhattan heuristic.
   *
   * @param grid - Grid map defining dimensions and walkability.
   * @param start - Starting grid coordinate.
   * @param target - Target grid coordinate.
   * @param options - Pathfinding configuration options.
   * @returns Array of grid points representing the path, or empty array if no path exists.
   */
  public static aStar(
    grid: GridPassabilityMap,
    start: GridPoint,
    target: GridPoint,
    options?: PathfindingOptions
  ): GridPoint[] {
    if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(target.x, target.y)) {
      return [];
    }

    if (start.x === target.x && start.y === target.y) {
      return options?.includeStart !== false ? [{ x: start.x, y: start.y }] : [];
    }

    const directions = options?.allowDiagonal ? EIGHT_DIRECTIONS : CARDINAL_DIRECTIONS;
    const maxNodes = options?.maxNodes ?? 10000;
    const includeStart = options?.includeStart !== false;
    const random = options?.random;

    interface ANode {
      point: GridPoint;
      g: number;
      h: number;
      f: number;
      tieRandom: number;
    }

    const openSet: ANode[] = [];
    const gScoreMap = new Map<string, number>();
    const parentMap = new Map<string, GridPoint>();

    const startKey = `${start.x},${start.y}`;
    const startH = manhattanDistance(start, target);
    const startNode: ANode = {
      point: start,
      g: 0,
      h: startH,
      f: startH,
      tieRandom: random ? random.next() : 0,
    };

    openSet.push(startNode);
    gScoreMap.set(startKey, 0);

    let nodesExpanded = 0;
    let found = false;

    while (openSet.length > 0 && nodesExpanded < maxNodes) {
      // Find node with minimum f, with deterministic tie-breaking
      let bestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        const a = openSet[i];
        const b = openSet[bestIdx];

        if (a.f < b.f) {
          bestIdx = i;
        } else if (Math.abs(a.f - b.f) < 1e-9) {
          // Primary tie-breaker: lower heuristic h
          if (a.h < b.h) {
            bestIdx = i;
          } else if (Math.abs(a.h - b.h) < 1e-9) {
            if (random) {
              if (a.tieRandom < b.tieRandom) {
                bestIdx = i;
              }
            } else {
              // Secondary tie-breaker: coordinate ordering (lower Y, then lower X)
              if (a.point.y < b.point.y || (a.point.y === b.point.y && a.point.x < b.point.x)) {
                bestIdx = i;
              }
            }
          }
        }
      }

      const current = openSet.splice(bestIdx, 1)[0];
      nodesExpanded++;

      if (current.point.x === target.x && current.point.y === target.y) {
        found = true;
        break;
      }

      for (let i = 0; i < directions.length; i++) {
        const dir = directions[i];
        const nx = current.point.x + dir.x;
        const ny = current.point.y + dir.y;

        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) {
          continue;
        }

        if (!grid.isWalkable(nx, ny)) {
          continue;
        }

        const stepCost = grid.getCost ? grid.getCost(nx, ny) : 1;
        const tentativeG = current.g + stepCost;
        const nKey = `${nx},${ny}`;

        const existingG = gScoreMap.get(nKey);
        if (existingG === undefined || tentativeG < existingG) {
          gScoreMap.set(nKey, tentativeG);
          parentMap.set(nKey, current.point);

          const h = manhattanDistance({ x: nx, y: ny }, target);
          const newNode: ANode = {
            point: { x: nx, y: ny },
            g: tentativeG,
            h,
            f: tentativeG + h,
            tieRandom: random ? random.next() : 0,
          };

          const existingOpenIdx = openSet.findIndex((n) => n.point.x === nx && n.point.y === ny);
          if (existingOpenIdx !== -1) {
            openSet[existingOpenIdx] = newNode;
          } else {
            openSet.push(newNode);
          }
        }
      }
    }

    if (!found) {
      return [];
    }

    return reconstructPath(parentMap, start, target, includeStart);
  }

  /**
   * Calculates the next intersection / decision point along a corridor in Pac-Man style games.
   *
   * @remarks
   * Walks forward from `current` along `direction` until reaching a tile where multiple forward/side
   * paths are available (junction), or where the path turns or dead-ends.
   *
   * @param grid - Grid map defining dimensions and walkability.
   * @param current - Current starting tile coordinate.
   * @param direction - Current direction vector (e.g., `{ x: 1, y: 0 }`).
   * @returns `IntersectionResult` containing the target coordinate, available directions, and distance.
   */
  public static getNextIntersectionTarget(
    grid: GridPassabilityMap,
    current: GridPoint,
    direction: GridPoint
  ): IntersectionResult {
    let currX = current.x;
    let currY = current.y;
    let dirX = direction.x;
    let dirY = direction.y;
    let distance = 0;

    while (true) {
      const nextX = currX + dirX;
      const nextY = currY + dirY;

      // Check available non-reverse directions at current tile
      const available = getAvailableDirections(grid, currX, currY, dirX, dirY);

      if (distance > 0) {
        // At the start tile (distance == 0), we move forward.
        // On subsequent tiles:
        // If there are multiple choices (junction) OR zero choices (dead end) OR forward path is blocked:
        const forwardIsWalkable =
          nextX >= 0 && nextX < grid.width && nextY >= 0 && nextY < grid.height && grid.isWalkable(nextX, nextY);

        if (available.length > 1 || available.length === 0 || !forwardIsWalkable) {
          // Reached intersection / decision point / corner
          const allValidDirs = getWalkableDirections(grid, currX, currY);
          return {
            point: { x: currX, y: currY },
            availableDirections: allValidDirs,
            distance,
          };
        }
      }

      // Continue moving along the single available direction
      if (available.length === 1) {
        dirX = available[0].x;
        dirY = available[0].y;
        currX += dirX;
        currY += dirY;
        distance++;
      } else if (available.length === 0) {
        // Dead end at start
        return {
          point: { x: currX, y: currY },
          availableDirections: getWalkableDirections(grid, currX, currY),
          distance,
        };
      } else {
        // Multiple choices right at start position
        return {
          point: { x: currX, y: currY },
          availableDirections: getWalkableDirections(grid, currX, currY),
          distance: 0,
        };
      }
    }
  }
}

/**
 * Reconstructs a path array from parentMap back to start.
 */
function reconstructPath(
  parentMap: Map<string, GridPoint>,
  start: GridPoint,
  target: GridPoint,
  includeStart: boolean
): GridPoint[] {
  const path: GridPoint[] = [];
  let current: GridPoint | undefined = target;

  while (current) {
    path.push(current);
    if (current.x === start.x && current.y === start.y) {
      break;
    }
    const key = `${current.x},${current.y}`;
    current = parentMap.get(key);
  }

  path.reverse();

  if (!includeStart && path.length > 0 && path[0].x === start.x && path[0].y === start.y) {
    path.shift();
  }

  return path;
}

/**
 * Calculates Manhattan distance between two grid points.
 */
function manhattanDistance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Returns walkable directions from (x, y) excluding the reverse of (dirX, dirY).
 */
function getAvailableDirections(
  grid: GridPassabilityMap,
  x: number,
  y: number,
  dirX: number,
  dirY: number
): GridPoint[] {
  const result: GridPoint[] = [];
  const reverseX = -dirX;
  const reverseY = -dirY;

  for (let i = 0; i < CARDINAL_DIRECTIONS.length; i++) {
    const d = CARDINAL_DIRECTIONS[i];
    // Exclude reverse direction
    if (d.x === reverseX && d.y === reverseY) {
      continue;
    }

    const nx = x + d.x;
    const ny = y + d.y;
    if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height && grid.isWalkable(nx, ny)) {
      result.push(d);
    }
  }

  return result;
}

/**
 * Returns all walkable cardinal directions from (x, y).
 */
function getWalkableDirections(grid: GridPassabilityMap, x: number, y: number): GridPoint[] {
  const result: GridPoint[] = [];
  for (let i = 0; i < CARDINAL_DIRECTIONS.length; i++) {
    const d = CARDINAL_DIRECTIONS[i];
    const nx = x + d.x;
    const ny = y + d.y;
    if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height && grid.isWalkable(nx, ny)) {
      result.push(d);
    }
  }
  return result;
}
