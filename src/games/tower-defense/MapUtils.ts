import type { GridLayout, WorldPosition, GridCoordinates } from "../shared/grid/GridTypes";
import { cellToWorld, cellCenterToWorld, worldToCell } from "../shared/grid/GridGeometry";
import type { TileType, TileGrid, WaypointList } from "./types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "./types/TowerDefenseConfigSchema";
import { createIsoConfig, worldToIso } from "./rendering/IsoProjection";

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
  const screenX = touchX / scaleX;
  const screenY = touchY / scaleY;

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
  if (!tileGrid?.tiles) return false;
  if (typeof row !== "number" || typeof col !== "number" || isNaN(row) || isNaN(col)) return false;
  if (row < 0 || row >= tileGrid.rows || col < 0 || col >= tileGrid.cols) return false;
  return tileGrid.tiles[row]?.[col] === "buildable";
}

/** Resolves standard background fill color for TD grid tile types. */
export function getTileTypeColor(tile: TileType | undefined): string {
  if (tile === "path") return "#2a2a4a";
  if (tile === "buildable") return "#16213e";
  if (tile === "spawn") return "#3d1a1a";
  if (tile === "base") return "#1a3d1a";
  if (tile === "blocked") return "#0a0a12";
  return "#0f0f1a";
}
