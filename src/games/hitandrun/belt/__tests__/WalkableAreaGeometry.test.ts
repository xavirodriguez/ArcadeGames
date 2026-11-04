import {
  createWalkableAreaGeometry,
  DEFAULT_WALKABLE_AREA_GEOMETRY,
  getWalkableAreaGeometry,
  WALKABLE_AREA_GEOMETRY_RESOURCE
} from "../WalkableAreaGeometry";
import { DEFAULT_BELT_MOVEMENT_CONFIG } from "../BeltMovementConfig";
import type { BeltMovementConfig } from "../BeltMovementConfig";
import { BELT_MOVEMENT_CONFIG_RESOURCE } from "../BeltMovementTypes";

describe("WalkableAreaGeometry", () => {
  it("matches DEFAULT_BELT_MOVEMENT_CONFIG defaults", () => {
    expect(DEFAULT_WALKABLE_AREA_GEOMETRY.depthMin).toBe(280);
    expect(DEFAULT_WALKABLE_AREA_GEOMETRY.depthMax).toBe(520);
    expect(DEFAULT_WALKABLE_AREA_GEOMETRY.height).toBe(240);
    expect(DEFAULT_WALKABLE_AREA_GEOMETRY.midY).toBe(400);
  });

  it("derives height and midY from arbitrary limits", () => {
    const geo = createWalkableAreaGeometry({ depthMin: 100, depthMax: 300 });
    expect(geo.depthMin).toBe(100);
    expect(geo.depthMax).toBe(300);
    expect(geo.height).toBe(200);
    expect(geo.midY).toBe(200);
  });

  it("normalizes inverted depthMin/depthMax", () => {
    const geo = createWalkableAreaGeometry({ depthMin: 500, depthMax: 200 });
    expect(geo.depthMin).toBe(200);
    expect(geo.depthMax).toBe(500);
    expect(geo.height).toBe(300);
  });

  it("is immutable", () => {
    expect(Object.isFrozen(DEFAULT_WALKABLE_AREA_GEOMETRY)).toBe(true);
    expect(Object.isFrozen(createWalkableAreaGeometry({ depthMin: 10, depthMax: 20 }))).toBe(
      true
    );
  });

  describe("getWalkableAreaGeometry", () => {
    it("returns published resource when present", () => {
      const published = createWalkableAreaGeometry({ depthMin: 50, depthMax: 150 });
      const world = {
        getResource: <T>(key: string): T | undefined => {
          if (key === WALKABLE_AREA_GEOMETRY_RESOURCE) return published as T;
          return undefined;
        }
      };
      expect(getWalkableAreaGeometry(world)).toBe(published);
    });

    it("derives from BeltMovementConfig when no geometry resource is published", () => {
      const config: BeltMovementConfig = {
        ...DEFAULT_BELT_MOVEMENT_CONFIG,
        depthMin: 200,
        depthMax: 600
      };
      const world = {
        getResource: <T>(key: string): T | undefined => {
          if (key === BELT_MOVEMENT_CONFIG_RESOURCE) return config as T;
          return undefined;
        }
      };
      const geo = getWalkableAreaGeometry(world);
      expect(geo.depthMin).toBe(200);
      expect(geo.depthMax).toBe(600);
      expect(geo.height).toBe(400);
    });

    it("falls back to defaults when the world has neither resource", () => {
      const world = {
        getResource: <T>(_key: string): T | undefined => undefined
      };
      expect(getWalkableAreaGeometry(world)).toEqual(DEFAULT_WALKABLE_AREA_GEOMETRY);
    });
  });
});
