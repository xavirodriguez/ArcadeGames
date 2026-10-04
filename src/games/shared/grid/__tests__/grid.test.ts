import { World, CoreComponentRegistry, EventBus } from "@tiny-aster/core";
import {
  GridLayout,
  GridCoordinates,
  cellToWorld,
  cellCenterToWorld,
  worldToCell,
  isInBounds,
  clampCoordinates,
  assertValidGridLayout,
  gridRaycast,
  stepTileGravity,
  FallingTileSystem,
  destroyTile,
} from "../index";

describe("Grid Shared Library Layer 0", () => {
  const sampleLayout: GridLayout = {
    stepX: 20,
    stepY: 30,
    offsetX: 10,
    offsetY: 15,
  };

  describe("GridGeometry", () => {
    test("cellToWorld returns {x: offsetX, y: offsetY} for {row: 0, col: 0}", () => {
      const pos = cellToWorld(sampleLayout, { row: 0, col: 0 });
      expect(pos).toEqual({ x: 10, y: 15 });
    });

    test("cellToWorld scales correctly with arbitrary row/col (col -> X, row -> Y)", () => {
      const pos = cellToWorld(sampleLayout, { row: 3, col: 5 });
      // x = 10 + 5 * 20 = 110
      // y = 15 + 3 * 30 = 105
      expect(pos).toEqual({ x: 110, y: 105 });
    });

    test("cellCenterToWorld equals cellToWorld + (stepX/2, stepY/2) exactly", () => {
      const origin = cellToWorld(sampleLayout, { row: 2, col: 4 });
      const center = cellCenterToWorld(sampleLayout, { row: 2, col: 4 });
      expect(center).toEqual({
        x: origin.x + sampleLayout.stepX / 2,
        y: origin.y + sampleLayout.stepY / 2,
      });
    });

    test("worldToCell is exact inverse of cellToWorld for grid-aligned positions", () => {
      const coords: GridCoordinates = { row: 4, col: 7 };
      const worldPos = cellToWorld(sampleLayout, coords);
      const cellCoords = worldToCell(sampleLayout, worldPos);
      expect(cellCoords).toEqual(coords);
    });

    test("worldToCell with out-of-range position returns negative or excessive coordinates without clamping or throwing", () => {
      const outOfRangeNegative = worldToCell(sampleLayout, { x: -50, y: -50 });
      expect(outOfRangeNegative.col).toBeLessThan(0);
      expect(outOfRangeNegative.row).toBeLessThan(0);
      expect(outOfRangeNegative).toEqual({ row: -3, col: -3 });

      const outOfRangePositive = worldToCell(sampleLayout, { x: 1000, y: 1000 });
      expect(outOfRangePositive.col).toBeGreaterThanOrEqual(10);
      expect(outOfRangePositive.row).toBeGreaterThanOrEqual(10);
      expect(outOfRangePositive).toEqual({ row: 32, col: 49 });
    });
  });

  describe("GridQueries", () => {
    test("isInBounds rejects row < 0, row >= rows, col < 0, col >= cols independently", () => {
      const rows = 10;
      const cols = 8;

      expect(isInBounds(rows, cols, { row: 0, col: 0 })).toBe(true);
      expect(isInBounds(rows, cols, { row: 9, col: 7 })).toBe(true);

      expect(isInBounds(rows, cols, { row: -1, col: 0 })).toBe(false);
      expect(isInBounds(rows, cols, { row: 10, col: 0 })).toBe(false);
      expect(isInBounds(rows, cols, { row: 0, col: -1 })).toBe(false);
      expect(isInBounds(rows, cols, { row: 0, col: 8 })).toBe(false);
    });

    test("clampCoordinates clamps both axes independently and does not mutate input", () => {
      const rows = 10;
      const cols = 8;
      const input: GridCoordinates = { row: -5, col: 20 };

      const result = clampCoordinates(rows, cols, input);
      expect(result).toEqual({ row: 0, col: 7 });

      // Ensure non-mutation
      expect(input).toEqual({ row: -5, col: 20 });
      expect(result).not.toBe(input);
    });

    test("assertValidGridLayout throws for stepX <= 0, stepY <= 0, or non-finite parameters", () => {
      expect(() => assertValidGridLayout({ stepX: 0, stepY: 10, offsetX: 0, offsetY: 0 })).toThrow("Invalid grid stepX");
      expect(() => assertValidGridLayout({ stepX: -5, stepY: 10, offsetX: 0, offsetY: 0 })).toThrow("Invalid grid stepX");
      expect(() => assertValidGridLayout({ stepX: 10, stepY: 0, offsetX: 0, offsetY: 0 })).toThrow("Invalid grid stepY");
      expect(() => assertValidGridLayout({ stepX: 10, stepY: -1, offsetX: 0, offsetY: 0 })).toThrow("Invalid grid stepY");

      expect(() => assertValidGridLayout({ stepX: NaN, stepY: 10, offsetX: 0, offsetY: 0 })).toThrow("Invalid grid stepX");
      expect(() => assertValidGridLayout({ stepX: 10, stepY: Infinity, offsetX: 0, offsetY: 0 })).toThrow("Invalid grid stepY");
      expect(() => assertValidGridLayout({ stepX: 10, stepY: 10, offsetX: NaN, offsetY: 0 })).toThrow("Invalid grid offsetX");
      expect(() => assertValidGridLayout({ stepX: 10, stepY: 10, offsetX: 0, offsetY: -Infinity })).toThrow("Invalid grid offsetY");

      expect(() => assertValidGridLayout({ stepX: 10, stepY: 10, offsetX: 0, offsetY: 0 })).not.toThrow();
    });
  });

  describe("Consumer Regression Tests (Section 5)", () => {
    test("Frogger: cellCenterToWorld matches existing frogger input formula exactly", () => {
      // Frogger config: GRID_SIZE = 40
      const froggerLayout: GridLayout = { stepX: 40, stepY: 40, offsetX: 0, offsetY: 0 };
      const gridX = 3;
      const gridY = 5;

      const pos = cellCenterToWorld(froggerLayout, { row: gridY, col: gridX });

      // Existing Frogger formula:
      const expectedX = gridX * 40 + 40 / 2;
      const expectedY = gridY * 40 + 40 / 2;

      expect(pos.x).toEqual(expectedX);
      expect(pos.y).toEqual(expectedY);
    });

    test("Space Invaders (Invaders): cellToWorld matches EntityFactory.spawnInvaderWave formula exactly", () => {
      // Space Invaders config: INVADER_SPACING_X = 50, INVADER_SPACING_Y = 40, INVADER_START_X = 100, INVADER_START_Y = 100
      const invaderLayout: GridLayout = { stepX: 50, stepY: 40, offsetX: 100, offsetY: 100 };
      const row = 2;
      const col = 4;

      const pos = cellToWorld(invaderLayout, { row, col });

      // Existing Space Invaders formula:
      const expectedX = 100 + col * 50;
      const expectedY = 100 + row * 40;

      expect(pos.x).toEqual(expectedX);
      expect(pos.y).toEqual(expectedY);
    });

    test("Space Invaders (Shields): cellToWorld matches EntityFactory.spawnShields formula per bunker", () => {
      // Space Invaders config: SHIELD_SEGMENT_SIZE = 15, SHIELD_START_X = 100, SHIELD_SPACING = 150, SHIELD_START_Y = 480
      const bunkerIndex = 1;
      const shieldLayout: GridLayout = {
        stepX: 15,
        stepY: 15,
        offsetX: 100 + bunkerIndex * 150,
        offsetY: 480,
      };
      const row = 1;
      const col = 3;

      const pos = cellToWorld(shieldLayout, { row, col });

      // Existing Shield formula:
      const bunkerX = 100 + bunkerIndex * 150;
      const expectedX = bunkerX + col * 15;
      const expectedY = 480 + row * 15;

      expect(pos.x).toEqual(expectedX);
      expect(pos.y).toEqual(expectedY);
    });

    test("Arkanoid: compares cellCenterToWorld vs exact formula and documents PADDING/2 offset difference", () => {
      // Arkanoid config: BRICK_WIDTH = 70, BRICK_HEIGHT = 20 (standard), BRICK_PADDING = 6, BRICK_OFFSET_LEFT = 25, BRICK_OFFSET_TOP = 60
      // stepX = BRICK_WIDTH + BRICK_PADDING = 76, stepY = BRICK_HEIGHT + BRICK_PADDING = 26
      const colWidth = 70 + 6; // 76
      const rowHeight = 20 + 6; // 26
      const startX = 25;
      const startY = 60;
      const row = 3;
      const col = 4;

      // Actual Arkanoid formula: x = startX + col * colWidth + BRICK_WIDTH / 2
      const actualX = startX + col * colWidth + 70 / 2; // 25 + 304 + 35 = 364
      const actualY = startY + row * rowHeight + 20 / 2; // 60 + 78 + 10 = 148

      // Equivalent GridLayout:
      const arkanoidLayout: GridLayout = { stepX: 76, stepY: 26, offsetX: 25, offsetY: 60 };

      // cellCenterToWorld uses stepX / 2 (38) and stepY / 2 (13):
      const cellCenter = cellCenterToWorld(arkanoidLayout, { row, col });
      // cellCenter.x = 25 + 304 + 38 = 367 (+3 difference due to PADDING / 2)
      // cellCenter.y = 60 + 78 + 13 = 151 (+3 difference due to PADDING / 2)

      expect(cellCenter.x - actualX).toBe(3); // BRICK_PADDING / 2 = 6 / 2 = 3
      expect(cellCenter.y - actualY).toBe(3);

      // Exact matching via cellToWorld + half visual brick size:
      const origin = cellToWorld(arkanoidLayout, { row, col });
      const exactX = origin.x + 70 / 2;
      const exactY = origin.y + 20 / 2;

      expect(exactX).toBe(actualX);
      expect(exactY).toBe(actualY);
    });
  });

  describe("GridRaycast", () => {
    test("gridRaycast propagates along ray direction until blocking tile or maxDistance", () => {
      // 5x5 grid with obstacle at (0, 3)
      const isBlocking = (coords: GridCoordinates) => coords.row === 0 && coords.col === 3;

      const res = gridRaycast(5, 5, { row: 0, col: 0 }, { dRow: 0, dCol: 1 }, 10, isBlocking);
      expect(res.hit).toBe(true);
      expect(res.coordinates).toEqual({ row: 0, col: 3 });
      expect(res.traversed).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    test("gridRaycast stops at maxDistance when no obstacle is hit", () => {
      const res = gridRaycast(10, 10, { row: 0, col: 0 }, { dRow: 1, dCol: 0 }, 2);
      expect(res.hit).toBe(false);
      expect(res.coordinates).toEqual({ row: 2, col: 0 });
      expect(res.traversed.length).toBe(3); // (0,0), (1,0), (2,0)
    });
  });

  describe("FallingTileSystem & stepTileGravity", () => {
    test("stepTileGravity drops floating tiles in strict bottom-to-top order", () => {
      // 3x3 matrix:
      // Row 0: [1, 0, 0]  <- Floating tile 1
      // Row 1: [2, 0, 0]  <- Floating tile 2
      // Row 2: [0, 0, 0]  <- Empty bottom row
      const matrix = [
        [1, 0, 0],
        [2, 0, 0],
        [0, 0, 0],
      ];

      // Step 1: Bottom-most floating tile 2 at row 1 drops to row 2
      const events1 = stepTileGravity(matrix, 0);
      expect(events1).toEqual([
        { fromRow: 1, fromCol: 0, toRow: 2, toCol: 0, tileId: 2 },
      ]);
      expect(matrix[2][0]).toBe(2);
      expect(matrix[1][0]).toBe(0);

      // Step 2: Floating tile 1 at row 0 drops to row 1
      const events2 = stepTileGravity(matrix, 0);
      expect(events2).toEqual([
        { fromRow: 0, fromCol: 0, toRow: 1, toCol: 0, tileId: 1 },
      ]);
      expect(matrix[1][0]).toBe(1);
      expect(matrix[0][0]).toBe(0);
    });

    test("FallingTileSystem updates tilemap entity and emits tile:fallen events", () => {
      const world = new World<CoreComponentRegistry>();
      const eventBus = new EventBus();
      world.setResource("EventBus", eventBus);

      const system = new FallingTileSystem();

      const tilemapEntity = world.createEntity();
      world.addComponent(tilemapEntity, {
        type: "Tilemap",
        data: [
          [1, 0],
          [0, 0],
        ],
        tileSize: 16,
      });

      let emitted = false;
      eventBus.on("tile:fallen" as any, () => {
        emitted = true;
      });

      system.update(world, 0.016);

      const tilemap = world.getComponent(tilemapEntity, "Tilemap")!;
      expect(tilemap.data[1][0]).toBe(1);
      expect(tilemap.data[0][0]).toBe(0);
      expect(emitted).toBe(true);
    });
  });

  describe("DestructibleTileHelpers", () => {
    test("destroyTile mutates tilemap matrix and emits tile:destroyed event", () => {
      const world = new World<CoreComponentRegistry>();
      const eventBus = new EventBus();
      world.setResource("EventBus", eventBus);

      const tilemapEntity = world.createEntity();
      world.addComponent(tilemapEntity, {
        type: "Tilemap",
        data: [
          [5, 3],
          [0, 1],
        ],
        tileSize: 16,
      });

      let destroyedPayload: any = null;
      eventBus.on("tile:destroyed" as any, (payload) => {
        destroyedPayload = payload;
      });

      const success = destroyTile(world, tilemapEntity, 0, 1, 0);
      expect(success).toBe(true);

      const tilemap = world.getComponent(tilemapEntity, "Tilemap")!;
      expect(tilemap.data[0][1]).toBe(0); // Mutated to 0
      expect(destroyedPayload).toEqual({
        entity: tilemapEntity,
        row: 0,
        col: 1,
        destroyedTileId: 3,
        replacementTileId: 0,
      });
    });
  });
});
