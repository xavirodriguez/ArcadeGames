import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { CentipedeEntityFactory } from "../EntityFactory";

export class ScorpionSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  private spawnTimerMs = 6000;

  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const scorpions = world.query("Scorpion", "Transform", "GridPos");

    if (scorpions.length === 0) {
      this.spawnTimerMs -= dt * 1000;
      if (this.spawnTimerMs <= 0) {
        this.spawnTimerMs = config.SCORPION_SPAWN_INTERVAL_MS;
        const dirX = world.gameplayRandom.next() > 0.5 ? 1 : -1;
        const row = Math.floor(world.gameplayRandom.next() * (config.GRID_ROWS - config.PLAYER_ZONE_ROWS - 5)) + 3;
        CentipedeEntityFactory.createScorpion(world, row, dirX as 1 | -1);
      }
    }

    for (const entity of scorpions) {
      const scorpion = world.getMutableComponent(entity, "Scorpion");
      const transform = world.getMutableComponent(entity, "Transform");
      const gridPos = world.getMutableComponent(entity, "GridPos");

      if (!scorpion || !transform || !gridPos) continue;

      transform.x += scorpion.dirX * config.SCORPION_SPEED * dt;
      transform.dirty = true;

      const currentCol = Math.min(config.GRID_COLS - 1, Math.max(0, Math.floor(transform.x / config.CELL_SIZE)));
      gridPos.col = currentCol;

      const mushrooms = world.query("Mushroom");
      for (const mEntity of mushrooms) {
        const m = world.getMutableComponent(mEntity, "Mushroom");
        if (m && m.row === gridPos.row && m.col === gridPos.col) {
          m.isPoisoned = true;
        }
      }

      if ((scorpion.dirX === 1 && transform.x > config.worldWidth + 20) || (scorpion.dirX === -1 && transform.x < -20)) {
        world.commands.removeEntity(entity);
      }
    }
  }
}
