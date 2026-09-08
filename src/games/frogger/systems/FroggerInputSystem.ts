import { System, World } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

export class FroggerInputSystem extends System<FroggerComponentRegistry> {
  public update(world: World<FroggerComponentRegistry>, dt: number): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const froggerEntities = world.query("Frogger", "FroggerInput", "Transform");
    if (froggerEntities.length === 0) return;

    const froggerEntity = froggerEntities[0];
    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    const input = world.getComponent(froggerEntity, "FroggerInput");
    const transform = world.getMutableComponent(froggerEntity, "Transform");
    const stateEntity = world.query("FroggerState")[0];

    if (!frogger || !input || !transform || !frogger.isAlive) return;

    if (stateEntity !== undefined) {
      const state = world.getComponent(stateEntity, "FroggerState");
      if (state && state.isGameOver) return;
    }

    if (frogger.cooldownRemaining > 0) {
      frogger.cooldownRemaining -= dt * 60; // Tick countdown based on 60fps
      if (frogger.cooldownRemaining < 0) frogger.cooldownRemaining = 0;
    }

    if (frogger.cooldownRemaining > 0) return;

    let moved = false;
    let dx = 0;
    let dy = 0;

    if (input.moveUp) {
      dy = -1;
      moved = true;
    } else if (input.moveDown) {
      dy = 1;
      moved = true;
    } else if (input.moveLeft) {
      dx = -1;
      moved = true;
    } else if (input.moveRight) {
      dx = 1;
      moved = true;
    }

    if (moved) {
      const newGridX = Math.max(0, Math.min(config.TOTAL_COLS - 1, frogger.gridX + dx));
      const newGridY = Math.max(0, Math.min(config.TOTAL_ROWS - 1, frogger.gridY + dy));

      if (newGridX !== frogger.gridX || newGridY !== frogger.gridY) {
        frogger.gridX = newGridX;
        frogger.gridY = newGridY;
        frogger.cooldownRemaining = config.INPUT_COOLDOWN_TICKS;
        frogger.isRiding = false;
        frogger.logEntity = undefined;

        transform.x = frogger.gridX * config.GRID_SIZE + config.GRID_SIZE / 2;
        transform.y = frogger.gridY * config.GRID_SIZE + config.GRID_SIZE / 2;

        // Score bonus for moving forward
        if (dy < 0 && frogger.gridY < frogger.furthestY) {
          frogger.furthestY = frogger.gridY;
          if (stateEntity !== undefined) {
            world.mutateComponent(stateEntity, "FroggerState", (s) => {
              s.score += config.STEP_POINTS;
            });
          }
        }

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:jump", { gridX: frogger.gridX, gridY: frogger.gridY });
        }
      }
    }
  }
}
