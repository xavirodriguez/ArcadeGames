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
