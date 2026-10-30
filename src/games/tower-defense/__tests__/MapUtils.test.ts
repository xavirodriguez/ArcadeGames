import { touchToCellCoords, cellCenter, worldToCellCoords, isBuildable, fitContain } from "../MapUtils";
import { createIsoConfig, worldToIso } from "../rendering/IsoProjection";
import towerDefenseConfigRaw from "../config/tower-defense.json";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

describe("MapUtils touch to cell conversion", () => {
  const config = towerDefenseConfigRaw as TowerDefenseConfig;
  const layout = {
    stepX: config.CELL_SIZE,
    stepY: config.CELL_SIZE,
    offsetX: config.GRID_OFFSET_X,
    offsetY: config.GRID_OFFSET_Y,
  };

  const projectedCellCenter = (col: number, row: number) => {
    const center = cellCenter(col, row, layout);
    return worldToIso(createIsoConfig(config), center.x, center.y);
  };

  it("converts the projected center of cell (1, 2) at native viewport size", () => {
    const touch = projectedCellCenter(1, 2);
    const cell = touchToCellCoords(touch.x, touch.y, 800, 600, config, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("converts touch correctly when the isometric canvas is scaled 2x", () => {
    const touch = projectedCellCenter(1, 2);
    const cell = touchToCellCoords(touch.x * 2, touch.y * 2, 1600, 1200, config, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("does not reinterpret touches outside the isometric grid as top-down cells", () => {
    const outsideWorldPoint = worldToIso(createIsoConfig(config), 40, 240);
    expect(worldToCellCoords(outsideWorldPoint.x, outsideWorldPoint.y, layout).col).toBeGreaterThanOrEqual(0);
    expect(worldToCellCoords(outsideWorldPoint.x, outsideWorldPoint.y, layout).row).toBeGreaterThanOrEqual(0);

    const cell = touchToCellCoords(outsideWorldPoint.x, outsideWorldPoint.y, 800, 600, config, layout);
    expect(cell).toEqual({ row: -1, col: -1 });
  });

  it("preserves top-down touch mapping when projection is disabled", () => {
    const topdownConfig: TowerDefenseConfig = { ...config, projection: "topdown" };
    const cell = touchToCellCoords(140, 140, 800, 600, topdownConfig, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
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

  it("maps touch to cell correctly with fitted isometric canvas size", () => {
    const touch = projectedCellCenter(2, 2);
    const cell800 = touchToCellCoords(touch.x, touch.y, 800, 600, config, layout);
    expect(cell800).toEqual({ col: 2, row: 2 });

    const cell400 = touchToCellCoords(touch.x * 0.5, touch.y * 0.5, 400, 300, config, layout);
    expect(cell400).toEqual({ col: 2, row: 2 });
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
