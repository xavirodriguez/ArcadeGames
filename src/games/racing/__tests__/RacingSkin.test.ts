import { World } from "@tiny-aster/core";
import {
  SKIN_REGISTRY,
  getRacingSkin,
  interpretCanvas,
  defaultCarActorDrawer,
  spaceshipActorDrawer,
  bowlObstacleDrawer,
  mugObstacleDrawer,
  billiardBallObstacleDrawer,
  asteroidObstacleDrawer,
  waterZoneDrawer,
  oilZoneDrawer,
  deadlyEdgeZoneDrawer,
  lavaZoneDrawer,
  defaultWallDrawer,
  spaceWallDrawer
} from "../rendering/RacingSkin";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";

describe("RacingSkin System", () => {
  let world: World<RacingComponentRegistry, RacingEventRegistry>;

  beforeEach(() => {
    world = new World<RacingComponentRegistry, RacingEventRegistry>();
  });

  describe("SKIN_REGISTRY & getRacingSkin", () => {
    it("contains all 5 expected themes plus tabletop alias", () => {
      expect(SKIN_REGISTRY.breakfast).toBeDefined();
      expect(SKIN_REGISTRY.billiard).toBeDefined();
      expect(SKIN_REGISTRY.desk).toBeDefined();
      expect(SKIN_REGISTRY.garden).toBeDefined();
      expect(SKIN_REGISTRY.space).toBeDefined();
      expect(SKIN_REGISTRY.tabletop).toBeDefined();
    });

    it("resolves default skin when ActiveTrackSpec is missing or skin is unset", () => {
      const skin = getRacingSkin(world);
      expect(skin.id).toBe("breakfast");
    });

    it("resolves skin from ActiveTrackSpec.skin", () => {
      const trackSpec: TrackSpec = {
        id: "space_track",
        name: "Space Track",
        skin: "space",
        width: 1600,
        height: 1000,
        spawnPoints: [],
        waypoints: [],
        walls: [],
        zones: [],
        obstacles: []
      };
      world.setResource("ActiveTrackSpec", trackSpec);
      const skin = getRacingSkin(world);
      expect(skin.id).toBe("space");
    });

    it("falls back to ActiveTrackSpec.theme if skin is missing", () => {
      const trackSpec: TrackSpec = {
        id: "billiard_track",
        name: "Billiard Track",
        theme: "billiard",
        width: 1600,
        height: 1000,
        spawnPoints: [],
        waypoints: [],
        walls: [],
        zones: [],
        obstacles: []
      };
      world.setResource("ActiveTrackSpec", trackSpec);
      const skin = getRacingSkin(world);
      expect(skin.id).toBe("billiard");
    });
  });

  describe("Drawers & Primitives", () => {
    const palette = SKIN_REGISTRY.breakfast.palette;

    it("defaultCarActorDrawer generates valid primitives for player and rival", () => {
      const playerPrimitives = defaultCarActorDrawer({
        size: 16,
        isPlayer: true,
        boosting: true,
        time: 1.5,
        palette
      });
      expect(playerPrimitives.length).toBeGreaterThan(0);

      const rivalPrimitives = defaultCarActorDrawer({
        size: 16,
        isPlayer: false,
        boosting: false,
        time: 1.5,
        palette
      });
      expect(rivalPrimitives.length).toBeGreaterThan(0);
      expect(rivalPrimitives.filter((primitive) => primitive.type === "circle").length).toBeGreaterThanOrEqual(6);
      expect(rivalPrimitives.some((primitive) => primitive.type === "roundRect" && primitive.x < -15)).toBe(true);
    });

    it("spaceshipActorDrawer generates valid primitives", () => {
      const shipPrimitives = spaceshipActorDrawer({
        size: 20,
        isPlayer: true,
        boosting: true,
        time: 2.0,
        palette: SKIN_REGISTRY.space.palette
      });
      expect(shipPrimitives.length).toBeGreaterThan(0);
    });

    it("obstacle drawers generate detailed tabletop silhouettes", () => {
      const bowl = bowlObstacleDrawer({ radius: 30, id: "bowl_1", time: 0, palette });
      const mug = mugObstacleDrawer({ radius: 30, id: "mug_1", time: 0, palette });
      expect(bowl.length).toBeGreaterThanOrEqual(10);
      expect(bowl.filter((primitive) => primitive.type === "ellipse").length).toBeGreaterThanOrEqual(3);
      expect(mug.length).toBeGreaterThan(8);
      expect(mug.filter((primitive) => primitive.type === "ellipse").length).toBeGreaterThanOrEqual(2);
      expect(billiardBallObstacleDrawer({ radius: 30, id: "ball_8", time: 0, palette }).length).toBeGreaterThan(0);
      expect(asteroidObstacleDrawer({ radius: 30, id: "ast_1", time: 0, palette }).length).toBeGreaterThan(0);
    });

    it("zone drawers generate valid primitives", () => {
      expect(waterZoneDrawer({ width: 100, height: 100, palette }).length).toBeGreaterThan(0);
      expect(oilZoneDrawer({ width: 100, height: 100, palette }).length).toBeGreaterThan(0);
      expect(deadlyEdgeZoneDrawer({ width: 100, height: 100, palette }).length).toBeGreaterThan(0);
      expect(lavaZoneDrawer({ width: 100, height: 100, palette }).length).toBeGreaterThan(0);
    });

    it("wall drawers generate valid primitives", () => {
      expect(defaultWallDrawer({ width: 200, height: 20, palette }).length).toBeGreaterThan(0);
      expect(spaceWallDrawer({ width: 200, height: 20, palette: SKIN_REGISTRY.space.palette }).length).toBeGreaterThan(0);
    });
  });

  describe("interpretCanvas", () => {
    it("executes without errors on canvas mock context", () => {
      const dummyCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn()
      };

      const primitives = spaceshipActorDrawer({
        size: 16,
        isPlayer: true,
        boosting: true,
        time: 1.0,
        palette: SKIN_REGISTRY.space.palette
      });

      expect(() => interpretCanvas(dummyCtx as CanvasRenderingContext2D, primitives)).not.toThrow();
      expect(dummyCtx.save).toHaveBeenCalled();
      expect(dummyCtx.restore).toHaveBeenCalled();
    });
  });
});
