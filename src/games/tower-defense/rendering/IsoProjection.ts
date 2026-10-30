import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

export interface IsoConfig {
  tileWidthHalf: number;
  tileHeightHalf: number;
  originX: number;
  originY: number;
  cellSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  enabled: boolean;
}

export interface Point2D {
  x: number;
  y: number;
}

export function createIsoConfig(config: TowerDefenseConfig): IsoConfig {
  const enabled = config.projection === "isometric";
  const cellSize = config.CELL_SIZE ?? 40;
  const ratio = config.ISO_TILE_RATIO ?? 2;
  const gridOffsetX = config.GRID_OFFSET_X ?? 80;
  const gridOffsetY = config.GRID_OFFSET_Y ?? 40;

  const tileWidthHalf = cellSize;
  const tileHeightHalf = cellSize / ratio;

  const originX = config.worldWidth / 2;
  const originY = gridOffsetY + 20;

  return {
    tileWidthHalf,
    tileHeightHalf,
    originX,
    originY,
    cellSize,
    gridOffsetX,
    gridOffsetY,
    enabled,
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

/** Spatial depth key for Painter's Algorithm depth sorting. */
export function depthOf(wx: number, wy: number): number {
  return wx + wy;
}
