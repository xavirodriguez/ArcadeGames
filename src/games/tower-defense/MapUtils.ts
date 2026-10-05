import type { GridLayout, WorldPosition, GridCoordinates } from "../shared/grid/GridTypes";
import { cellToWorld, cellCenterToWorld, worldToCell } from "../shared/grid/GridGeometry";
import type { TileType, TileGrid, WaypointList } from "./types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "./types/TowerDefenseConfigSchema";

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

export function touchToCellCoords(
  touchX: number,
  touchY: number,
  canvasWidth: number,
  canvasHeight: number,
  config: TowerDefenseConfig,
  layout: GridLayout
): GridCoordinates {
  const scaleX = canvasWidth > 0 ? canvasWidth / config.worldWidth : 1;
  const scaleY = canvasHeight > 0 ? canvasHeight / config.worldHeight : 1;
  const worldX = touchX / scaleX;
  const worldY = touchY / scaleY;
  return worldToCellCoords(worldX, worldY, layout);
}

export function isBuildable(tileGrid: TileGrid, col: number, row: number): boolean {
  if (!tileGrid?.tiles) return false;
  if (typeof row !== "number" || typeof col !== "number" || isNaN(row) || isNaN(col)) return false;
  if (row < 0 || row >= tileGrid.rows || col < 0 || col >= tileGrid.cols) return false;
  return tileGrid.tiles[row]?.[col] === "buildable";
}
