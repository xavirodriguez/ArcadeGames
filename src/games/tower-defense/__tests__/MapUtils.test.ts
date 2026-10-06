import { touchToCellCoords, cellCenter, worldToCellCoords, isBuildable } from "../MapUtils";
import towerDefenseConfigRaw from "../config/tower-defense.json";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

describe("MapUtils touch to cell conversion", () => {
  const config = towerDefenseConfigRaw as TowerDefenseConfig;
  const layout = {
    stepX: config.CELL_SIZE, // 40
    stepY: config.CELL_SIZE, // 40
    offsetX: config.GRID_OFFSET_X, // 80
    offsetY: config.GRID_OFFSET_Y, // 40
  };

  it("converts touch at center of cell (1, 2) when canvas matches world dimensions (800x600)", () => {
    // Cell (col 1, row 2) center:
    // worldX = 80 + 1 * 40 + 20 = 140
    // worldY = 40 + 2 * 40 + 20 = 140
    const cell = touchToCellCoords(140, 140, 800, 600, config, layout);
    expect(cell.col).toBe(1);
    expect(cell.row).toBe(2);
  });

  it("converts touch correctly when canvas is scaled 2x (1600x1200)", () => {
    // Canvas scaled 2x -> touch at (280, 280) corresponds to world (140, 140) -> cell (col 1, row 2)
    const cell = touchToCellCoords(280, 280, 1600, 1200, config, layout);
    expect(cell.col).toBe(1);
    expect(cell.row).toBe(2);
  });

  it("computes cell center world position", () => {
    const pos = cellCenter(3, 4, layout);
    // col 3: 80 + 3 * 40 + 20 = 220
    // row 4: 40 + 4 * 40 + 20 = 220
    expect(pos.x).toBe(220);
    expect(pos.y).toBe(220);
  });

  it("safely handles out-of-bounds and NaN coordinates in isBuildable", () => {
    const mockTileGrid: any = {
      cols: 16,
      rows: 12,
      tiles: Array.from({ length: 12 }, () => Array(16).fill("buildable")),
    };

    expect(isBuildable(mockTileGrid, 0, 0)).toBe(true);
    expect(isBuildable(mockTileGrid, -1, 0)).toBe(false);
    expect(isBuildable(mockTileGrid, 0, -1)).toBe(false);
    expect(isBuildable(mockTileGrid, 100, 0)).toBe(false);
    expect(isBuildable(mockTileGrid, 0, 100)).toBe(false);
    expect(isBuildable(mockTileGrid, NaN, 0)).toBe(false);
    expect(isBuildable(mockTileGrid, 0, NaN)).toBe(false);
  });
});
