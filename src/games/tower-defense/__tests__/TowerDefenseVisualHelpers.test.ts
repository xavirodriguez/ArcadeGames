import { World } from "@tiny-aster/core";
import {
  createPathDirectionMarkers,
  resolveEntityIsometricOffset,
  resolveTowerWeaponDrawSetup,
  resolveTransformWorldPosition,
} from "../rendering/TowerDefenseVisualHelpers";
import { createIsoConfig, projectVector, worldToIso } from "../rendering/IsoProjection";
import towerDefenseConfigRaw from "../config/tower-defense.json";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";

const config = towerDefenseConfigRaw as TowerDefenseConfig;

function createWorld(projection: "topdown" | "isometric" = "isometric") {
  const world = new World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>();
  world.setResource("GameConfig", { ...config, projection });
  return world;
}

function addTransform(
  world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
  x: number,
  y: number,
  worldX = x,
  worldY = y
): number {
  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "Transform",
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX,
    worldY,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false,
  });
  return entity;
}

describe("Tower Defense path direction markers", () => {
  it("places markers along the route and points them toward the next waypoint", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];

    const markers = createPathDirectionMarkers(points, 2);

    expect(markers).toHaveLength(2);
    expect(markers[0]).toEqual({ x: 20, y: 0, angle: Math.PI / 2 });
    expect(markers[1]?.x).toBe(20);
    expect(markers[1]?.y).toBe(20);
    expect(markers[1]?.angle).toBeCloseTo(Math.PI);
  });

  it("returns no markers for short routes and skips duplicate waypoints", () => {
    expect(createPathDirectionMarkers([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual([]);

    const markers = createPathDirectionMarkers([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ], 1);

    expect(markers.some((marker) => !Number.isFinite(marker.angle))).toBe(false);
    expect(markers.every((marker) => Number.isFinite(marker.x) && Number.isFinite(marker.y))).toBe(true);
  });

  it("uses a safe interval when the requested stride is invalid", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ];

    expect(createPathDirectionMarkers(points, 0)).toHaveLength(3);
    expect(createPathDirectionMarkers(points, Number.NaN)).toHaveLength(1);
  });
});

describe("Tower Defense entity projection", () => {
  it.each([
    ["tower", 22],
    ["creep", 8],
    ["projectile", 0],
  ] as const)("projects %s from authoritative world coordinates and keeps gameplay Transform unchanged", (type, height) => {
    const world = createWorld();
    const entity = addTransform(world, 12, 24, 220, 180);
    const before = { ...world.getComponent(entity, "Transform") };
    const isoCfg = createIsoConfig({ ...config, projection: "isometric" });
    const expected = worldToIso(isoCfg, 220, 180);

    const result = resolveEntityIsometricOffset(world, entity, type);

    expect(result.worldX).toBe(220);
    expect(result.worldY).toBe(180);
    expect(result.screenX).toBeCloseTo(expected.x, 8);
    expect(result.screenY).toBeCloseTo(expected.y, 8);
    expect(result.drawY).toBeCloseTo(expected.y - height, 8);
    expect(world.getComponent(entity, "Transform")).toEqual(before);
  });

  it("keeps top-down entity coordinates unchanged", () => {
    const world = createWorld("topdown");
    const entity = addTransform(world, 40, 60, 240, 260);

    const result = resolveEntityIsometricOffset(world, entity, "tower");

    expect(result.screenX).toBe(240);
    expect(result.screenY).toBe(260);
    expect(result.drawY).toBe(260);
    expect(result.isoCfg.enabled).toBe(false);
  });

  it("uses world transforms for turret aiming and the shared vector projection", () => {
    const world = createWorld();
    const tower = addTransform(world, 10, 20, 100, 200);
    const target = addTransform(world, 900, 900, 300, 250);
    world.addComponent(tower, {
      type: "Tower",
      towerType: "basic",
      range: 100,
      damage: 1,
      fireRate: 1,
      projectileSpeed: 1,
      level: 1,
      maxLevel: 1,
      cost: 1,
      cooldownRemaining: 0,
      targetEntity: target,
      col: 0,
      row: 0,
    });

    const isoCfg = createIsoConfig({ ...config, projection: "isometric" });
    const direction = projectVector(isoCfg, 200, 50);
    const result = resolveTowerWeaponDrawSetup(world, tower, 28, "basic");

    expect(result.angle).toBeCloseTo(Math.atan2(direction.y, direction.x), 8);
  });

  it("resolves local transforms when hierarchy world coordinates are absent", () => {
    expect(resolveTransformWorldPosition({ x: 17, y: 29 })).toEqual({ x: 17, y: 29 });
    expect(resolveTransformWorldPosition(undefined)).toEqual({ x: 0, y: 0 });
  });
});
