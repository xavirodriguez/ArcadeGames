import type { GridLayout, WorldPosition, GridCoordinates } from "../shared/grid/GridTypes";
import { cellToWorld, cellCenterToWorld, worldToCell } from "../shared/grid/GridGeometry";
import type { TileType, TileGrid, WaypointList } from "./types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "./types/TowerDefenseConfigSchema";
import { createIsoConfig, worldToIso } from "./rendering/IsoProjection";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "./presentation/TowerDefenseVisualTokens";

const CHAR_TO_TILE: Record<string, TileType> = {
  P: "path",
  B: "buildable",
  X: "blocked",
  S: "spawn",
  E: "base",
  " ": "blocked",
};

/**
 * Parse LEVEL_LAYOUT strings into a TileGrid.
 * Spawn (S) and base (E) are also treated as path for movement.
 */
export function parseLevelLayout(layout: string[], cols: number, rows: number): TileGrid {
  const tiles: TileType[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowStr = layout[r] ?? "".padEnd(cols, "X");
    const row: TileType[] = [];
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c] ?? "X";
      row.push(CHAR_TO_TILE[ch] ?? "blocked");
    }
    tiles.push(row);
  }
  return { cols, rows, tiles };
}

export function createGridLayout(config: TowerDefenseConfig): GridLayout {
  return {
    stepX: config.CELL_SIZE,
    stepY: config.CELL_SIZE,
    offsetX: config.GRID_OFFSET_X,
    offsetY: config.GRID_OFFSET_Y,
  };
}

/**
 * Extract ordered waypoints by walking the path from spawn to base.
 * Uses BFS along path/spawn/base tiles.
 * Assumes a single contiguous path without branches (classic TD).
 */
export function extractWaypoints(
  tileGrid: TileGrid,
  gridLayout: GridLayout
): WaypointList {
  let spawn: GridCoordinates | null = null;
  let base: GridCoordinates | null = null;

  for (let r = 0; r < tileGrid.rows; r++) {
    for (let c = 0; c < tileGrid.cols; c++) {
      const t = tileGrid.tiles[r][c];
      if (t === "spawn") spawn = { row: r, col: c };
      if (t === "base") base = { row: r, col: c };
    }
  }

  if (!spawn || !base) {
    throw new Error("[TD] Level layout missing spawn (S) or base (E)");
  }

  const isWalkable = (r: number, c: number) => {
    if (r < 0 || r >= tileGrid.rows || c < 0 || c >= tileGrid.cols) return false;
    const t = tileGrid.tiles[r][c];
    return t === "path" || t === "spawn" || t === "base";
  };

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const queue: GridCoordinates[] = [spawn];
  visited.add(key(spawn.row, spawn.col));

  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
  ];

  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.row === base.row && cur.col === base.col) {
      found = true;
      break;
    }
    for (const d of dirs) {
      const nr = cur.row + d.dr;
      const nc = cur.col + d.dc;
      const k = key(nr, nc);
      if (!visited.has(k) && isWalkable(nr, nc)) {
        visited.add(k);
        parent.set(k, key(cur.row, cur.col));
        queue.push({ row: nr, col: nc });
      }
    }
  }

  if (!found) {
    throw new Error("[TD] Invalid map layout: No walkable path from spawn (S) to base (E)");
  }

  const pathCells: GridCoordinates[] = [];
  let curKey = key(base.row, base.col);
  while (curKey) {
    const [r, c] = curKey.split(",").map(Number);
    pathCells.push({ row: r, col: c });
    const p = parent.get(curKey);
    if (!p) break;
    curKey = p;
  }
  pathCells.reverse();

  const points = pathCells.map((cell) => cellCenterToWorld(gridLayout, cell));

  return { points };
}

export function cellCenter(col: number, row: number, layout: GridLayout): WorldPosition {
  return cellCenterToWorld(layout, { row, col });
}

export function worldToCellCoords(x: number, y: number, layout: GridLayout): GridCoordinates {
  return worldToCell(layout, { x, y });
}

/** Returns whether grid coordinates address an existing cell. */
export function isCellInBounds(
  tileGrid: TileGrid,
  col: number,
  row: number
): boolean {
  return Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= 0 &&
    row >= 0 &&
    col < tileGrid.cols &&
    row < tileGrid.rows;
}

export function touchToCellCoords(
  touchX: number,
  touchY: number,
  canvasWidth: number,
  canvasHeight: number,
  config: TowerDefenseConfig,
  layout: GridLayout
): GridCoordinates {
  if (
    !Number.isFinite(touchX) ||
    !Number.isFinite(touchY) ||
    !Number.isFinite(canvasWidth) ||
    !Number.isFinite(canvasHeight) ||
    !Number.isFinite(config.worldWidth) ||
    !Number.isFinite(config.worldHeight) ||
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    config.worldWidth <= 0 ||
    config.worldHeight <= 0
  ) {
    return { row: -1, col: -1 };
  }

  const scaleX = canvasWidth / config.worldWidth;
  const scaleY = canvasHeight / config.worldHeight;
  const screenX = touchX / scaleX;
  const screenY = touchY / scaleY;
  if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
    return { row: -1, col: -1 };
  }

  const isoCfg = createIsoConfig(config);
  if (isoCfg.enabled) {
    const cols = config.GRID_COLS ?? 16;
    const rows = config.GRID_ROWS ?? 12;
    const candidates: GridCoordinates[] = [];
    const tolerance = 1e-9;

    // Check the projected diamond for each tile instead of flooring the
    // inverse-projected point. This makes shared-edge/vertex selection explicit.
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const center = cellCenter(col, row, layout);
        const projectedCenter = worldToIso(isoCfg, center.x, center.y);
        const normalizedDistance =
          Math.abs(screenX - projectedCenter.x) / isoCfg.tileWidthHalf +
          Math.abs(screenY - projectedCenter.y) / isoCfg.tileHeightHalf;
        if (normalizedDistance <= 1 + tolerance) {
          candidates.push({ row, col });
        }
      }
    }

    if (candidates.length === 0) {
      return { row: -1, col: -1 };
    }

    // At shared vertices, prefer the upper/left tile deterministically.
    candidates.sort((a, b) =>
      (a.row + a.col) - (b.row + b.col)
      || a.row - b.row
      || a.col - b.col
    );
    return candidates[0];
  }

  return worldToCellCoords(screenX, screenY, layout);
}

export function fitContain(
  containerWidth: number,
  containerHeight: number,
  worldWidth: number,
  worldHeight: number
): { width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || worldWidth <= 0 || worldHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const targetAspect = worldWidth / worldHeight;
  const containerAspect = containerWidth / containerHeight;

  if (containerAspect > targetAspect) {
    // Container is wider than aspect ratio -> height is constraint
    const height = containerHeight;
    const width = height * targetAspect;
    return { width, height };
  } else {
    // Container is taller/equal -> width is constraint
    const width = containerWidth;
    const height = width / targetAspect;
    return { width, height };
  }
}

export function isBuildable(tileGrid: TileGrid, col: number, row: number): boolean {
  if (!tileGrid?.tiles || !isCellInBounds(tileGrid, col, row)) return false;
  return tileGrid.tiles[row]?.[col] === "buildable";
}

/** Resolves standard background fill color for TD grid tile types. */
export function getTileTypeColor(tile: TileType | undefined): string {
  if (tile === "path") return TOWER_DEFENSE_VISUAL_TOKENS.tiles.path;
  if (tile === "buildable") return TOWER_DEFENSE_VISUAL_TOKENS.tiles.buildable;
  if (tile === "spawn") return TOWER_DEFENSE_VISUAL_TOKENS.tiles.spawn;
  if (tile === "base") return TOWER_DEFENSE_VISUAL_TOKENS.tiles.base;
  if (tile === "blocked") return TOWER_DEFENSE_VISUAL_TOKENS.tiles.blocked;
  return TOWER_DEFENSE_VISUAL_TOKENS.tiles.default;
}
