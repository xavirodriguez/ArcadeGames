import { BoundarySystem, EventBus, World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { AsteroidCollisionSystem } from "../systems/AsteroidCollisionSystem";

describe("Asteroids ricochet VFX integration", () => {
  it("emits a ricochet cue when a bouncing player projectile reflects from a world boundary", () => {
    const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    const eventBus = new EventBus<AsteroidsEventRegistry>();
    world.setResource("EventBus", eventBus);

    const bullet = world.createEntity();
    world.addComponent(bullet, {
      type: "Transform", x: 101, y: 50, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 101, worldY: 50, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: true
    });
    world.addComponent(bullet, { type: "Velocity", vx: 120, vy: 0, angularVelocity: 0 });
    world.addComponent(bullet, { type: "Boundary", width: 100, height: 100, mode: "bounce" });
    world.addComponent(bullet, { type: "Bullet", ownerId: "local" });

    const collisionSystem = new AsteroidCollisionSystem();
    collisionSystem.onRegister(world);
    new BoundarySystem().update(world, 1 / 60);
    eventBus.flushDeferred();

    expect(world.getComponent(bullet, "Transform")?.x).toBe(100);
    expect(world.getComponent(bullet, "Velocity")?.vx).toBe(-120);
    const effect = world.query("Render", "TTL").find((entity) =>
      world.getComponent(entity, "Render")?.shape === "pixelfx_ricochet"
    );
    expect(effect).toBeDefined();
    expect(world.getComponent(effect!, "TTL")?.remaining).toBeGreaterThan(0);
  });
});