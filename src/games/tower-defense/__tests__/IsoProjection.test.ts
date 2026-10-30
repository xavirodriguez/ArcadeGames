import {
  createIsoConfig,
  worldToIso,
  isoToWorld,
  depthOf,
  projectCircleRadii,
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

  it("projects the complete grid bounding box inside and centered in the viewport", () => {
    const left = mockConfig.GRID_OFFSET_X;
    const top = mockConfig.GRID_OFFSET_Y;
    const right = left + mockConfig.GRID_COLS * mockConfig.CELL_SIZE;
    const bottom = top + mockConfig.GRID_ROWS * mockConfig.CELL_SIZE;
    const corners = [
      worldToIso(isoCfg, left, top),
      worldToIso(isoCfg, right, top),
      worldToIso(isoCfg, left, bottom),
      worldToIso(isoCfg, right, bottom),
    ];

    const minX = Math.min(...corners.map((point) => point.x));
    const maxX = Math.max(...corners.map((point) => point.x));
    const minY = Math.min(...corners.map((point) => point.y));
    const maxY = Math.max(...corners.map((point) => point.y));

    expect(minX).toBeCloseTo(0, 5);
    expect(maxX).toBeCloseTo(mockConfig.worldWidth, 5);
    expect((minX + maxX) / 2).toBeCloseTo(mockConfig.worldWidth / 2, 5);
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(maxY).toBeLessThanOrEqual(mockConfig.worldHeight);
    expect((minY + maxY) / 2).toBeCloseTo(mockConfig.worldHeight / 2, 5);

    const topLeftIso = worldToIso(isoCfg, left, top);
    expect(topLeftIso.x).toBeCloseTo(isoCfg.originX, 5);
    expect(topLeftIso.y).toBeCloseTo(isoCfg.originY, 5);
  });

  it("fits different grid ratios and viewport sizes without clipping", () => {
    const variants = [
      { ...mockConfig, ISO_TILE_RATIO: 1, worldWidth: 900, worldHeight: 700 },
      { ...mockConfig, ISO_TILE_RATIO: 3, worldWidth: 640, worldHeight: 480 },
      { ...mockConfig, ISO_TILE_RATIO: 1.5, worldWidth: 1024, worldHeight: 768 },
    ];

    for (const config of variants) {
      const cfg = createIsoConfig(config);
      const left = config.GRID_OFFSET_X;
      const top = config.GRID_OFFSET_Y;
      const right = left + config.GRID_COLS * config.CELL_SIZE;
      const bottom = top + config.GRID_ROWS * config.CELL_SIZE;
      const corners = [
        worldToIso(cfg, left, top),
        worldToIso(cfg, right, top),
        worldToIso(cfg, left, bottom),
        worldToIso(cfg, right, bottom),
      ];
      const minX = Math.min(...corners.map((point) => point.x));
      const maxX = Math.max(...corners.map((point) => point.x));
      const minY = Math.min(...corners.map((point) => point.y));
      const maxY = Math.max(...corners.map((point) => point.y));

      expect(minX).toBeGreaterThanOrEqual(-1e-8);
      expect(maxX).toBeLessThanOrEqual(config.worldWidth + 1e-8);
      expect(minY).toBeGreaterThanOrEqual(-1e-8);
      expect(maxY).toBeLessThanOrEqual(config.worldHeight + 1e-8);
      expect((minX + maxX) / 2).toBeCloseTo(config.worldWidth / 2, 5);
      expect((minY + maxY) / 2).toBeCloseTo(config.worldHeight / 2, 5);
    }
  });

  it("projects world-space circular ranges into exact isometric ellipse radii", () => {
    const radii = projectCircleRadii(isoCfg, 100);
    const fitScale = isoCfg.tileWidthHalf / isoCfg.cellSize;
    expect(radii.rx).toBeCloseTo(Math.SQRT2 * 100 * fitScale, 5);
    expect(radii.ry).toBeCloseTo(Math.SQRT2 * 50 * fitScale, 5);

    const topdown = createIsoConfig({ ...mockConfig, projection: "topdown" });
    expect(projectCircleRadii(topdown, 100)).toEqual({ rx: 100, ry: 100 });
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
    // This exact vertex is shared by the target diamond and its diagonal neighbors.
    // The input resolver must choose the upper/left tile consistently.
    const touchY = bottomScreen.y;

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
