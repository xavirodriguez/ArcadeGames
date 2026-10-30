import { buildRenderPlan, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";
import { TowerDefenseIsoDepthSortSystem } from "../systems/TowerDefenseIsoDepthSortSystem";

describe("TowerDefenseIsoDepthSortSystem", () => {
  const addRenderable = (
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    type: "Tower" | "Creep" | "TowerProjectile",
    x: number,
    y: number,
    order: number
  ): number => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(entity, {
      type: "Render",
      visible: true,
      opacity: 1,
      order,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      shape: type === "Tower" ? "tower_basic" : type === "Creep" ? "creep_grunt" : "tower_projectile",
    });

    if (type === "Tower") {
      world.addComponent(entity, {
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
        targetEntity: null,
        col: 0,
        row: 0,
      });
    } else if (type === "Creep") {
      world.addComponent(entity, {
        type: "Creep",
        creepType: "grunt",
        speed: 1,
        baseSpeed: 1,
        reward: 0,
        waypointIndex: 0,
        pathProgress: 0,
        slowRemainingMs: 0,
        slowFactor: 1,
      });
    } else {
      world.addComponent(entity, {
        type: "TowerProjectile",
        targetEntity: null,
        speed: 1,
      });
    }

    return entity;
  };

  it("sorts towers, creeps and projectiles by world diagonal depth with stable ties", () => {
    const world = new World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>();
    world.setResource("GameConfig", { projection: "isometric" });

    const farTower = addRenderable(world, "Tower", 100, 200, 8);
    const nearerCreep = addRenderable(world, "Creep", 250, 100, 50);
    const sameDepthProjectile = addRenderable(world, "TowerProjectile", 200, 150, 10);
    const transformSnapshots = [farTower, nearerCreep, sameDepthProjectile].map((entity) => ({
      ...world.getComponent(entity, "Transform"),
    }));

    new TowerDefenseIsoDepthSortSystem().update(world, 1 / 60);

    const renderPlan = buildRenderPlan(world);
    expect(renderPlan.entries.map((entry) => entry.entity)).toEqual([
      farTower,
      nearerCreep,
      sameDepthProjectile,
    ]);
    expect(renderPlan.entries.map((entry) => entry.order)).toEqual([300, 350, 350]);
    expect([farTower, nearerCreep, sameDepthProjectile].map((entity) => ({
      ...world.getComponent(entity, "Transform"),
    }))).toEqual(transformSnapshots);
  });

  it("preserves the configured render layers outside isometric mode", () => {
    const world = new World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>();
    world.setResource("GameConfig", { projection: "topdown" });
    const tower = addRenderable(world, "Tower", 100, 200, 8);
    const creep = addRenderable(world, "Creep", 250, 100, 50);

    new TowerDefenseIsoDepthSortSystem().update(world, 1 / 60);

    expect(world.getComponent(tower, "Render")?.order).toBe(8);
    expect(world.getComponent(creep, "Render")?.order).toBe(50);
  });
});
