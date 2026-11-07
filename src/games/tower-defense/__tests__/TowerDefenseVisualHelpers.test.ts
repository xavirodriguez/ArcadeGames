import { World } from "@tiny-aster/core";
import {
  createPathDirectionMarkers,
  resolveEntityIsometricOffset,
  resolveTowerWeaponDrawSetup,
  resolveTransformWorldPosition,
  resolveCreepHealthBarGeometry,
  getBossContourPoints,
  resolveTdTileColors,
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

describe("Tower Defense visual helper functions", () => {
  it("resolves creep health bar geometry correctly", () => {
    const world = createWorld();
    const entity = world.createEntity();

    // No health component -> returns null
    expect(resolveCreepHealthBarGeometry(world, entity, 20)).toBeNull();

    // Health max <= 0 -> returns null
    world.addComponent(entity, { type: "Health", current: 0, max: 0 });
    expect(resolveCreepHealthBarGeometry(world, entity, 20)).toBeNull();

    // Health > 50%
    world.addComponent(entity, { type: "Health", current: 80, max: 100 });
    const barHigh = resolveCreepHealthBarGeometry(world, entity, 20);
    expect(barHigh).not.toBeNull();
    expect(barHigh?.ratio).toBeCloseTo(0.8);
    expect(barHigh?.fillColor).toBe("#65e572");

    // Health between 25% and 50%
    world.addComponent(entity, { type: "Health", current: 40, max: 100 });
    const barMid = resolveCreepHealthBarGeometry(world, entity, 20);
    expect(barMid?.fillColor).toBe("#ffce4a");

    // Health <= 25%
    world.addComponent(entity, { type: "Health", current: 15, max: 100 });
    const barLow = resolveCreepHealthBarGeometry(world, entity, 20);
    expect(barLow?.fillColor).toBe("#ff5252");
    expect(barLow?.width).toBe(25); // Math.max(20, 20 * 1.25)
  });

  it("generates boss contour points with 10 lobes", () => {
    const points = getBossContourPoints(20, 10, 100);
    expect(points).toHaveLength(101);
    expect(points[0]?.x).toBeCloseTo(20);
    expect(points[0]?.y).toBeCloseTo(0);
    expect(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("resolves tile colors for classic and paper dusk themes", () => {
    const world = createWorld();

    // Classic theme (isPaperDusk = false)
    const classicPath = resolveTdTileColors(world, "path", false);
    expect(classicPath.isBuildable).toBe(false);
    expect(classicPath.fillColor).toBeDefined();

    const classicBuildable = resolveTdTileColors(world, "buildable", false);
    expect(classicBuildable.isBuildable).toBe(true);
    expect(classicBuildable.strokeColor).toBeUndefined();

    // Paper Dusk theme (isPaperDusk = true)
    const duskPath = resolveTdTileColors(world, "path", true);
    expect(duskPath.isBuildable).toBe(false);
    expect(duskPath.strokeColor).toBeDefined();

    const duskBuildable = resolveTdTileColors(world, "buildable", true);
    expect(duskBuildable.isBuildable).toBe(true);
    expect(duskBuildable.strokeColor).toBeDefined();
  });
});
