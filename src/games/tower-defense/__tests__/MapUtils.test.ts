import { touchToCellCoords, cellCenter, worldToCellCoords, isBuildable, isCellInBounds, fitContain } from "../MapUtils";
import { createIsoConfig, worldToIso } from "../rendering/IsoProjection";
import towerDefenseConfigRaw from "../config/tower-defense.json";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import type { TileGrid } from "../types/TowerDefenseTypes";

describe("MapUtils touch to cell conversion", () => {
  const topdownConfig: TowerDefenseConfig = {
    ...(towerDefenseConfigRaw as TowerDefenseConfig),
    projection: "topdown",
  };
  const isoConfig: TowerDefenseConfig = {
    ...(towerDefenseConfigRaw as TowerDefenseConfig),
    projection: "isometric",
  };
  const config = isoConfig;
  const layout = {
    stepX: config.CELL_SIZE,
    stepY: config.CELL_SIZE,
    offsetX: config.GRID_OFFSET_X,
    offsetY: config.GRID_OFFSET_Y,
  };

  const projectedCellCenter = (col: number, row: number) => {
    const center = cellCenter(col, row, layout);
    return worldToIso(createIsoConfig(isoConfig), center.x, center.y);
  };

  it("converts touch at center of cell (1, 2) in top-down projection", () => {
    const cell = touchToCellCoords(140, 140, 800, 600, topdownConfig, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("converts touch correctly when the top-down canvas is scaled 2x", () => {
    const cell = touchToCellCoords(280, 280, 1600, 1200, topdownConfig, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("converts the projected center of cell (1, 2) at native viewport size", () => {
    const touch = projectedCellCenter(1, 2);
    const cell = touchToCellCoords(touch.x, touch.y, 800, 600, isoConfig, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("converts touch correctly when the isometric canvas is scaled 2x", () => {
    const touch = projectedCellCenter(1, 2);
    const cell = touchToCellCoords(touch.x * 2, touch.y * 2, 1600, 1200, isoConfig, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("does not reinterpret touches outside the isometric grid as top-down cells", () => {
    const outsideWorldPoint = worldToIso(createIsoConfig(isoConfig), 40, 240);
    expect(worldToCellCoords(outsideWorldPoint.x, outsideWorldPoint.y, layout).col).toBeGreaterThanOrEqual(0);
    expect(worldToCellCoords(outsideWorldPoint.x, outsideWorldPoint.y, layout).row).toBeGreaterThanOrEqual(0);

    const cell = touchToCellCoords(outsideWorldPoint.x, outsideWorldPoint.y, 800, 600, isoConfig, layout);
    expect(cell).toEqual({ row: -1, col: -1 });
  });

  it("preserves top-down touch mapping when projection is disabled", () => {
    const cell = touchToCellCoords(140, 140, 800, 600, topdownConfig, layout);
    expect(cell).toEqual({ col: 1, row: 2 });
  });

  it("rejects invalid touch coordinates and unusable viewport dimensions", () => {
    expect(touchToCellCoords(Number.NaN, 140, 800, 600, isoConfig, layout)).toEqual({ row: -1, col: -1 });
    expect(touchToCellCoords(140, Number.POSITIVE_INFINITY, 800, 600, isoConfig, layout)).toEqual({ row: -1, col: -1 });
    expect(touchToCellCoords(140, 140, 0, 600, isoConfig, layout)).toEqual({ row: -1, col: -1 });
    expect(touchToCellCoords(140, 140, 800, 600, { ...isoConfig, worldWidth: 0 }, layout)).toEqual({ row: -1, col: -1 });
  });

  it("validates grid coordinates as finite integer cells", () => {
    const tileGrid: TileGrid = {
      cols: 2,
      rows: 2,
      tiles: [
        ["buildable", "path"],
        ["blocked", "buildable"],
      ],
    };

    expect(isCellInBounds(tileGrid, 0, 0)).toBe(true);
    expect(isCellInBounds(tileGrid, 1, 1)).toBe(true);
    expect(isCellInBounds(tileGrid, -1, 0)).toBe(false);
    expect(isCellInBounds(tileGrid, 2, 0)).toBe(false);
    expect(isCellInBounds(tileGrid, 0.5, 0)).toBe(false);
    expect(isCellInBounds(tileGrid, Number.NaN, 0)).toBe(false);
    expect(isCellInBounds(tileGrid, 0, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("computes cell center world position", () => {
    const pos = cellCenter(3, 4, layout);
    expect(pos).toEqual({ x: 220, y: 220 });
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

  it("maps touch to cell correctly with fitted canvas size in top-down projection", () => {
    const cell800 = touchToCellCoords(180, 140, 800, 600, topdownConfig, layout);
    expect(cell800).toEqual({ col: 2, row: 2 });

    const cell400 = touchToCellCoords(90, 70, 400, 300, topdownConfig, layout);
    expect(cell400).toEqual({ col: 2, row: 2 });
  });

  it("maps touch to cell correctly with fitted isometric canvas size", () => {
    const touch = projectedCellCenter(2, 2);
    const cell800 = touchToCellCoords(touch.x, touch.y, 800, 600, isoConfig, layout);
    expect(cell800).toEqual({ col: 2, row: 2 });

    const cell400 = touchToCellCoords(touch.x * 0.5, touch.y * 0.5, 400, 300, isoConfig, layout);
    expect(cell400).toEqual({ col: 2, row: 2 });
  });

  it("safely handles out-of-bounds and NaN coordinates in isBuildable", () => {
    const tiles: TileGrid["tiles"] = Array.from({ length: 12 }, () =>
      Array.from({ length: 16 }, () => "buildable" as TileGrid["tiles"][number][number])
    );
    const mockTileGrid: TileGrid = { cols: 16, rows: 12, tiles };

    expect(isBuildable(mockTileGrid, 0, 0)).toBe(true);
    expect(isBuildable(mockTileGrid, -1, 0)).toBe(false);
    expect(isBuildable(mockTileGrid, 0, -1)).toBe(false);
    expect(isBuildable(mockTileGrid, 100, 0)).toBe(false);
    expect(isBuildable(mockTileGrid, 0, 100)).toBe(false);
    expect(isBuildable(mockTileGrid, NaN, 0)).toBe(false);
    expect(isBuildable(mockTileGrid, 0, NaN)).toBe(false);
  });
});
