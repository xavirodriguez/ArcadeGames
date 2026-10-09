import { touchToCellCoords, cellCenter, worldToCellCoords, isBuildable, fitContain } from "../MapUtils";
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

  describe("fitContain aspect ratio scaling", () => {
    it("returns 0x0 if container or world has non-positive dimensions", () => {
      expect(fitContain(0, 600, 800, 600)).toEqual({ width: 0, height: 0 });
      expect(fitContain(800, 0, 800, 600)).toEqual({ width: 0, height: 0 });
      expect(fitContain(800, 600, 0, 600)).toEqual({ width: 0, height: 0 });
    });

    it("fits exactly when container is 800x600 (4:3)", () => {
      expect(fitContain(800, 600, 800, 600)).toEqual({ width: 800, height: 600 });
    });

    it("letterboxes horizontally when container is wider than 4:3 (e.g. 1000x600)", () => {
      expect(fitContain(1000, 600, 800, 600)).toEqual({ width: 800, height: 600 });
    });

    it("letterboxes vertically when container is taller than 4:3 (e.g. 800x800)", () => {
      expect(fitContain(800, 800, 800, 600)).toEqual({ width: 800, height: 600 });
    });

    it("scales down maintaining 4:3 ratio for smaller containers", () => {
      expect(fitContain(400, 300, 800, 600)).toEqual({ width: 400, height: 300 });
      expect(fitContain(500, 300, 800, 600)).toEqual({ width: 400, height: 300 });
    });
  });

  it("maps touch to cell correctly with fitted canvas size", () => {
    // Cell col 2, row 2 center world: (80 + 2*40 + 20, 40 + 2*40 + 20) = (180, 140)
    // On 800x600 fitted canvas: touch at (180, 140) -> cell (2, 2)
    const cell800 = touchToCellCoords(180, 140, 800, 600, config, layout);
    expect(cell800.col).toBe(2);
    expect(cell800.row).toBe(2);

    // On 400x300 fitted canvas: touch at (90, 70) -> cell (2, 2)
    const cell400 = touchToCellCoords(90, 70, 400, 300, config, layout);
    expect(cell400.col).toBe(2);
    expect(cell400.row).toBe(2);
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
