import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { SharedParticlePool } from "@tiny-aster/gameplay-kit";

export class SegmentDeathFxSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const deathVisuals = world.query("SegmentDeathVisual");
    const particlePool = world.getResource<SharedParticlePool>("ParticlePool");

    for (const entity of deathVisuals) {
      const vis = world.getMutableComponent(entity, "SegmentDeathVisual");
      if (!vis) continue;

      const prevTimer = vis.timerMs;
      vis.timerMs += dt * 1000;

      if (prevTimer < 120 && vis.timerMs >= 120 && particlePool) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const speed = 30 + world.renderRandom.next() * 20;
          const colorName = i % 3 === 0 ? "mushroomA" : i % 3 === 1 ? "mushroomB" : "amber";
          particlePool.acquireParticle(
            world,
            vis.x,
            vis.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            2.5,
            colorName,
            0.35
          );
        }
      }

      if (vis.timerMs >= 700) {
        world.commands.removeEntity(entity);
      }
    }

    const scoreVisuals = world.query("FloatingScoreVisual");
    for (const entity of scoreVisuals) {
      const scoreVis = world.getMutableComponent(entity, "FloatingScoreVisual");
      if (!scoreVis) continue;

      scoreVis.timerMs += dt * 1000;
      scoreVis.offsetY -= 16 * dt;
      if (scoreVis.timerMs >= scoreVis.maxTimerMs) {
        world.commands.removeEntity(entity);
      }
    }
  }
}
