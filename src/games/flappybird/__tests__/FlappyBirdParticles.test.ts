import { VisualParticlePool, createParticlePool, VisualParticle } from "../../shared/rendering/VisualParticlePool";
import { processFlappyBirdParticleEvents } from "../rendering/particleEvents";
import { World } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry, BirdComponent } from "../types/FlappyBirdTypes";

describe("VisualParticlePool & FlappyBird Particle Events", () => {
  it("should spawn and update particles with custom physics", () => {
    const pool = createParticlePool(50);
    expect(pool.getActiveParticles().filter((p: VisualParticle) => p.active).length).toBe(0);

    pool.spawn(100, 100, 50, -50, 0.5, 3, "#00F3FF", { type: "spark" });
    let active = pool.getActiveParticles().filter((p: VisualParticle) => p.active);
    expect(active.length).toBe(1);
    expect(active[0].x).toBe(100);
    expect(active[0].type).toBe("spark");

    pool.update(0.1, (p: VisualParticle, dt: number) => {
      p.vx *= 0.9;
      p.vy *= 0.9;
    });

    expect(active[0].life).toBeCloseTo(0.4);
    expect(active[0].x).toBeGreaterThan(100);
  });

  it("should trigger particles on near-miss, flap, and death", () => {
    const world = new World<FlappyBirdComponentRegistry>();
    const pool = new VisualParticlePool(100);

    const birdComp: BirdComponent = {
      type: "Bird",
      velocityY: -200,
      isAlive: true,
      isGliding: false,
      nearMissTimer: 0.3,
      coyoteTimer: 0
    };

    // First call: initial state registered
    processFlappyBirdParticleEvents(world, 1, birdComp, pool, 100, 200, 15);

    // Near miss was > 0, particles spawned
    let active = pool.getActiveParticles().filter((p: VisualParticle) => p.active);
    expect(active.length).toBeGreaterThan(0);

    pool.reset();

    // Death trigger
    birdComp.isAlive = false;
    processFlappyBirdParticleEvents(world, 1, birdComp, pool, 100, 200, 15);

    const deathParticles = pool.getActiveParticles().filter((p: VisualParticle) => p.active);
    expect(deathParticles.length).toBeGreaterThan(10);
    const shards = deathParticles.filter((p: VisualParticle) => p.type === "shard");
    expect(shards.length).toBeGreaterThan(0);
  });
});
