import { BoundarySystem, EventBus, World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { AsteroidCollisionSystem } from "../systems/AsteroidCollisionSystem";

describe("Asteroids ricochet VFX integration", () => {
  it("renders each real boundary reflection and reclaims the projectile after three bounces", () => {
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
    const boundarySystem = new BoundarySystem();

    boundarySystem.update(world, 1 / 60);
    eventBus.flushDeferred();
    expect(world.getComponent(bullet, "Transform")?.x).toBe(100);
    expect(world.getComponent(bullet, "Velocity")?.vx).toBe(-120);
    expect(world.getComponent(bullet, "Bullet")?.bouncesRemaining).toBe(2);

    world.mutateComponent(bullet, "Transform", (transform) => { transform.x = -1; transform.dirty = true; });
    boundarySystem.update(world, 1 / 60);
    eventBus.flushDeferred();
    expect(world.getComponent(bullet, "Transform")?.x).toBe(0);
    expect(world.getComponent(bullet, "Velocity")?.vx).toBe(120);
    expect(world.getComponent(bullet, "Bullet")?.bouncesRemaining).toBe(1);

    world.mutateComponent(bullet, "Transform", (transform) => { transform.x = 101; transform.dirty = true; });
    boundarySystem.update(world, 1 / 60);
    eventBus.flushDeferred();

    expect(world.hasEntity(bullet)).toBe(false);
    const ricochetEffects = world.query("Render", "TTL").filter((entity) =>
      world.getComponent(entity, "Render")?.shape === "pixelfx_ricochet"
    );
    expect(ricochetEffects).toHaveLength(3);
  });
});