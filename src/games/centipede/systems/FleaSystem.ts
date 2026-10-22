import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { CentipedeEntityFactory } from "../EntityFactory";

export class FleaSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  private checkTimerMs = 0;

  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const fleas = world.query("Flea", "Transform", "GridPos");

    if (fleas.length === 0) {
      this.checkTimerMs += dt * 1000;
      if (this.checkTimerMs > 3000) {
        this.checkTimerMs = 0;

        let playerZoneMushrooms = 0;
        const mushrooms = world.query("Mushroom");
        for (const mEntity of mushrooms) {
          const mushroom = world.getComponent(mEntity, "Mushroom")!;
          if (mushroom.row >= config.GRID_ROWS - config.PLAYER_ZONE_ROWS) {
            playerZoneMushrooms++;
          }
        }

        if (playerZoneMushrooms < config.FLEA_MUSHROOM_THRESHOLD) {
          const col = Math.floor(world.gameplayRandom.next() * config.GRID_COLS);
          CentipedeEntityFactory.createFlea(world, col);
        }
      }
    }

    for (const entity of fleas) {
      const flea = world.getMutableComponent(entity, "Flea");
      const transform = world.getMutableComponent(entity, "Transform");
      const gridPos = world.getMutableComponent(entity, "GridPos");

      if (!flea || !transform || !gridPos) continue;

      transform.y += config.FLEA_SPEED * dt;
      transform.dirty = true;

      const currentRow = Math.floor(transform.y / config.CELL_SIZE);
      gridPos.row = currentRow;

      if (currentRow > flea.lastMushroomRow && currentRow < config.GRID_ROWS - 1) {
        flea.lastMushroomRow = currentRow;
        if (world.gameplayRandom.next() < 0.25) {
          let cellEmpty = true;
          const mushrooms = world.query("Mushroom");
          for (const mEntity of mushrooms) {
            const m = world.getComponent(mEntity, "Mushroom")!;
            if (m.row === currentRow && m.col === gridPos.col) {
              cellEmpty = false;
              break;
            }
          }
          if (cellEmpty) {
            CentipedeEntityFactory.createMushroom(world, currentRow, gridPos.col);
          }
        }
      }

      if (transform.y >= config.worldHeight) {
        world.commands.removeEntity(entity);
      }
    }
  }
}
