import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";

export class AmbientFxSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  private particlesInitialized = false;

  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    if (config.visual.quality === "low") return;

    let ambientEntity = world.query("AmbientParticleVisual")[0];
    if (ambientEntity === undefined) {
      ambientEntity = world.reserveEntityId();
      world.commands.createEntity(ambientEntity);
      world.commands.addComponent(ambientEntity, {
        type: "AmbientParticleVisual",
        particles: [],
      });
      return;
    }

    const vis = world.getMutableComponent(ambientEntity, "AmbientParticleVisual");
    if (!vis) return;

    if (!this.particlesInitialized) {
      this.particlesInitialized = true;
      const count = 20;
      for (let i = 0; i < count; i++) {
        vis.particles.push({
          x: world.renderRandom.next() * config.worldWidth,
          y: world.renderRandom.next() * config.worldHeight,
          vx: (world.renderRandom.next() - 0.5) * 6,
          vy: (world.renderRandom.next() - 0.5) * 6,
          radius: 1 + world.renderRandom.next() * 1.5,
          alpha: 0.15 + world.renderRandom.next() * 0.2,
        });
      }
    }

    for (const p of vis.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) p.x += config.worldWidth;
      if (p.x > config.worldWidth) p.x -= config.worldWidth;
      if (p.y < 0) p.y += config.worldHeight;
      if (p.y > config.worldHeight) p.y -= config.worldHeight;
    }
  }
}
