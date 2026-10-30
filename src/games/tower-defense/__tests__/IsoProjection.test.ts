import {
  createIsoConfig,
  worldToIso,
  isoToWorld,
  depthOf,
} from "../rendering/IsoProjection";
import { touchToCellCoords } from "../MapUtils";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

describe("IsoProjection", () => {
  const mockConfig: TowerDefenseConfig = {
    worldWidth: 800,
    worldHeight: 600,
    aspectRatio: 1.333,
    projection: "isometric",
    ISO_TILE_RATIO: 2,
    GRID_COLS: 16,
    GRID_ROWS: 12,
    CELL_SIZE: 40,
    GRID_OFFSET_X: 80,
    GRID_OFFSET_Y: 40,
    KEYS: { PAUSE: "KeyP", RESTART: "KeyR", BUILD: "KeyB", SELL: "KeyX", UPGRADE: "KeyU" },
    STARTING_GOLD: 150,
    STARTING_LIVES: 20,
    GOLD_PER_KILL_MULTIPLIER: 1,
    LEVEL_LAYOUT: [],
    TOWERS: [],
    CREEPS: [],
    WAVES: [],
    PROJECTILE_SIZE: 4,
    PROJECTILE_TTL: 3000,
    MAX_DELTA_TIME: 100,
    INTERMISSION_DURATION: 5,
  };

  const isoCfg = createIsoConfig(mockConfig);

  it("validates exact round-trip isoToWorld(worldToIso(p)) ≈ p", () => {
    const points = [
      { x: 80, y: 40 },
      { x: 200, y: 350 },
      { x: 700, y: 500 },
      { x: 123.45, y: 267.89 },
    ];

    for (const p of points) {
      const iso = worldToIso(isoCfg, p.x, p.y);
      const world = isoToWorld(isoCfg, iso.x, iso.y);

      expect(world.x).toBeCloseTo(p.x, 5);
      expect(world.y).toBeCloseTo(p.y, 5);
    }
  });

  it("projects known grid cell corners correctly", () => {
    const topLeftIso = worldToIso(isoCfg, 80, 40);
    expect(topLeftIso.x).toBeCloseTo(isoCfg.originX, 5);
    expect(topLeftIso.y).toBeCloseTo(isoCfg.originY, 5);

    const bottomRightIso = worldToIso(isoCfg, 120, 80);
    expect(bottomRightIso.x).toBeCloseTo(isoCfg.originX, 5);
    expect(bottomRightIso.y).toBeCloseTo(isoCfg.originY + isoCfg.tileHeightHalf * 2, 5);
  });

  it("calculates accurate 4-vertex bounding box and centers grid horizontally", () => {
    // Top-Left corner: (col 0, row 0) -> world (80, 40) -> screen (originX, originY)
    const topLeft = worldToIso(isoCfg, 80, 40);
    // Top-Right corner: (col 16, row 0) -> world (80 + 16*40, 40) = (720, 40)
    const topRight = worldToIso(isoCfg, 720, 40);
    // Bottom-Left corner: (col 0, row 12) -> world (80, 40 + 12*40) = (80, 520)
    const bottomLeft = worldToIso(isoCfg, 80, 520);
    // Bottom-Right corner: (col 16, row 12) -> world (720, 520)
    const bottomRight = worldToIso(isoCfg, 720, 520);

    expect(isoCfg.bounds.minX).toBeCloseTo(bottomLeft.x, 5);
    expect(isoCfg.bounds.maxX).toBeCloseTo(topRight.x, 5);
    expect(isoCfg.bounds.minY).toBeCloseTo(topLeft.y, 5);
    expect(isoCfg.bounds.maxY).toBeCloseTo(bottomRight.y, 5);

    // Verify horizontal symmetry: distance from worldWidth/2 to minX equals distance to maxX
    const midX = mockConfig.worldWidth / 2;
    const distMin = midX - isoCfg.bounds.minX;
    const distMax = isoCfg.bounds.maxX - midX;
    expect(distMin).toBeCloseTo(distMax, 5);
  });

  it("handles non-square grids (e.g. 20 cols x 10 rows) with symmetric centering", () => {
    const rectConfig: TowerDefenseConfig = {
      ...mockConfig,
      GRID_COLS: 20,
      GRID_ROWS: 10,
    };
    const rectIso = createIsoConfig(rectConfig);

    const midX = mockConfig.worldWidth / 2;
    const distMin = midX - rectIso.bounds.minX;
    const distMax = rectIso.bounds.maxX - midX;
    expect(distMin).toBeCloseTo(distMax, 5);
    expect(rectIso.bounds.width).toBeCloseTo((20 + 10) * rectIso.tileWidthHalf, 5);
    expect(rectIso.bounds.height).toBeCloseTo((20 + 10) * rectIso.tileHeightHalf, 5);
  });

  it("sanitizes missing or invalid config parameters gracefully", () => {
    const partialIso = createIsoConfig({
      projection: "isometric",
      CELL_SIZE: NaN,
      ISO_TILE_RATIO: 0,
    });

    expect(partialIso.cellSize).toBe(40);
    expect(partialIso.tileHeightHalf).toBe(20);
    expect(partialIso.bounds.width).toBeGreaterThan(0);
    expect(partialIso.bounds.height).toBeGreaterThan(0);
  });

  it("ensures depthOf is monotonic with respect to row + col", () => {
    const depth00 = depthOf(80, 40);
    const depth01 = depthOf(120, 40);
    const depth10 = depthOf(80, 80);
    const depth11 = depthOf(120, 80);

    expect(depth01).toBeGreaterThan(depth00);
    expect(depth10).toBeGreaterThan(depth00);
    expect(depth11).toBeGreaterThan(depth01);
    expect(depth11).toBeGreaterThan(depth10);
  });

  it("selects exact cell when touching bottom visible corner of a rhombus", () => {
    const layout = {
      stepX: mockConfig.CELL_SIZE,
      stepY: mockConfig.CELL_SIZE,
      offsetX: mockConfig.GRID_OFFSET_X,
      offsetY: mockConfig.GRID_OFFSET_Y,
    };

    const targetRow = 3;
    const targetCol = 5;

    const bottomWorldX = (targetCol + 1) * mockConfig.CELL_SIZE + mockConfig.GRID_OFFSET_X;
    const bottomWorldY = (targetRow + 1) * mockConfig.CELL_SIZE + mockConfig.GRID_OFFSET_Y;

    const bottomScreen = worldToIso(isoCfg, bottomWorldX, bottomWorldY);

    const touchX = bottomScreen.x;
    const touchY = bottomScreen.y - 1;

    const coords = touchToCellCoords(touchX, touchY, 800, 600, mockConfig, layout);
    expect(coords).toEqual({ row: targetRow, col: targetCol });
  });

  it("falls back to top-down when projection config is topdown", () => {
    const topdownConfig: TowerDefenseConfig = {
      ...mockConfig,
      projection: "topdown",
    };
    const topdownIsoCfg = createIsoConfig(topdownConfig);

    const worldP = { x: 150, y: 200 };
    const isoP = worldToIso(topdownIsoCfg, worldP.x, worldP.y);
    expect(isoP).toEqual(worldP);

    const backP = isoToWorld(topdownIsoCfg, isoP.x, isoP.y);
    expect(backP).toEqual(worldP);
  });
});
