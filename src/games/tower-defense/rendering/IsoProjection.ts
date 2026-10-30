import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

export interface IsoBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface IsoConfig {
  tileWidthHalf: number;
  tileHeightHalf: number;
  originX: number;
  originY: number;
  cellSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  enabled: boolean;
  bounds: IsoBounds;
}

export interface Point2D {
  x: number;
  y: number;
}

function positiveFiniteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createIsoConfig(config: Partial<TowerDefenseConfig>): IsoConfig {
  const enabled = config.projection === "isometric";
  const cellSize = positiveFiniteOr(config.CELL_SIZE, 40);
  const ratio = positiveFiniteOr(config.ISO_TILE_RATIO, 2);
  const gridOffsetX = Number.isFinite(config.GRID_OFFSET_X) ? (config.GRID_OFFSET_X as number) : 80;
  const gridOffsetY = Number.isFinite(config.GRID_OFFSET_Y) ? (config.GRID_OFFSET_Y as number) : 40;
  const cols = Number.isFinite(config.GRID_COLS) && (config.GRID_COLS as number) > 0 ? (config.GRID_COLS as number) : 16;
  const rows = Number.isFinite(config.GRID_ROWS) && (config.GRID_ROWS as number) > 0 ? (config.GRID_ROWS as number) : 12;

  const worldWidth = Number.isFinite(config.worldWidth) && (config.worldWidth as number) > 0
    ? (config.worldWidth as number)
    : 800;
  const worldHeight = Number.isFinite(config.worldHeight) && (config.worldHeight as number) > 0
    ? (config.worldHeight as number)
    : 600;

  const gridSpan = cols + rows;
  const maxTileWidthByViewport = worldWidth / gridSpan;
  const maxTileWidthByViewportHeight = (worldHeight * ratio) / gridSpan;
  const tileWidthHalf = Math.min(maxTileWidthByViewport, maxTileWidthByViewportHeight);
  const tileHeightHalf = tileWidthHalf / ratio;

  if (!enabled) {
    const minX = gridOffsetX;
    const maxX = gridOffsetX + cols * cellSize;
    const minY = gridOffsetY;
    const maxY = gridOffsetY + rows * cellSize;

    return {
      tileWidthHalf: cellSize,
      tileHeightHalf: cellSize / ratio,
      originX: gridOffsetX,
      originY: gridOffsetY,
      cellSize,
      gridOffsetX,
      gridOffsetY,
      enabled: false,
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  }

  // Center the projected four-corner bounding box without changing its aspect ratio.
  const originX = worldWidth / 2 - ((cols - rows) * tileWidthHalf) / 2;
  const originY = (worldHeight - gridSpan * tileHeightHalf) / 2;

  const minX = originX - rows * tileWidthHalf;
  const maxX = originX + cols * tileWidthHalf;
  const minY = originY;
  const maxY = originY + (cols + rows) * tileHeightHalf;

  return {
    tileWidthHalf,
    tileHeightHalf,
    originX,
    originY,
    cellSize,
    gridOffsetX,
    gridOffsetY,
    enabled: true,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

/** Converts world coordinates (wx, wy) to screen coordinates (sx, sy). */
export function worldToIso(cfg: IsoConfig, wx: number, wy: number): Point2D {
  if (!cfg.enabled) {
    return { x: wx, y: wy };
  }

  const relX = wx - cfg.gridOffsetX;
  const relY = wy - cfg.gridOffsetY;

  const scaleX = cfg.tileWidthHalf / cfg.cellSize;
  const scaleY = cfg.tileHeightHalf / cfg.cellSize;

  const u = (relX - relY) * scaleX;
  const v = (relX + relY) * scaleY;

  return {
    x: cfg.originX + u,
    y: cfg.originY + v,
  };
}

/** Converts screen coordinates (sx, sy) back to world coordinates (wx, wy). */
export function isoToWorld(cfg: IsoConfig, sx: number, sy: number): Point2D {
  if (!cfg.enabled) {
    return { x: sx, y: sy };
  }

  const u = sx - cfg.originX;
  const v = sy - cfg.originY;

  const scaleX = cfg.tileWidthHalf / cfg.cellSize;
  const scaleY = cfg.tileHeightHalf / cfg.cellSize;

  const unscaledU = u / scaleX;
  const unscaledV = v / scaleY;

  const relX = (unscaledU + unscaledV) / 2;
  const relY = (unscaledV - unscaledU) / 2;

  return {
    x: relX + cfg.gridOffsetX,
    y: relY + cfg.gridOffsetY,
  };
}

/** Projects a direction vector (vx, vy) into isometric screen space. */
export function projectVector(cfg: IsoConfig, vx: number, vy: number): Point2D {
  if (!cfg.enabled) {
    return { x: vx, y: vy };
  }

  const scaleX = cfg.tileWidthHalf / cfg.cellSize;
  const scaleY = cfg.tileHeightHalf / cfg.cellSize;

  return {
    x: (vx - vy) * scaleX,
    y: (vx + vy) * scaleY,
  };
}

/**
 * Projects a world-space circle into its exact screen-space ellipse radii.
 * This is the singular-value transform of the isometric projection matrix.
 */
export function projectCircleRadii(cfg: IsoConfig, radius: number): { rx: number; ry: number } {
  if (!cfg.enabled) {
    return { rx: radius, ry: radius };
  }

  const scaleX = cfg.tileWidthHalf / cfg.cellSize;
  const scaleY = cfg.tileHeightHalf / cfg.cellSize;
  const diagonalScale = Math.SQRT2 * radius;

  return {
    rx: diagonalScale * scaleX,
    ry: diagonalScale * scaleY,
  };
}

/** Spatial depth key for Painter's Algorithm depth sorting. */
export function depthOf(wx: number, wy: number): number {
  return wx + wy;
}
