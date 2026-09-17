import { System, World, IInputSystem } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import { GridLayout, cellCenterToWorld } from "../../shared/grid";

export class FroggerInputSystem extends System<FroggerComponentRegistry> {
  public update(world: World<FroggerComponentRegistry>, dt: number): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const froggerEntities = world.query("Frogger", "FroggerInput", "Transform", "GridPosition");
    if (froggerEntities.length === 0) return;

    const froggerEntity = froggerEntities[0];
    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    const input = world.getMutableComponent(froggerEntity, "FroggerInput");
    const transform = world.getMutableComponent(froggerEntity, "Transform");
    const gridPos = world.getMutableComponent(froggerEntity, "GridPosition");
    const stateEntity = world.query("FroggerState")[0];

    if (!frogger || !input || !transform || !gridPos || !frogger.isAlive) return;

    if (stateEntity !== undefined) {
      const state = world.getComponent(stateEntity, "FroggerState");
      if (state && state.isGameOver) return;
    }

    const unifiedInput = world.getResource<IInputSystem>("InputSystem");

    const moveUp = input.moveUp || (unifiedInput ? unifiedInput.getAction("moveUp") : false);
    const moveDown = input.moveDown || (unifiedInput ? unifiedInput.getAction("moveDown") : false);
    const moveLeft = input.moveLeft || (unifiedInput ? unifiedInput.getAction("moveLeft") : false);
    const moveRight = input.moveRight || (unifiedInput ? unifiedInput.getAction("moveRight") : false);

    // Discrete rising edge evaluation: hop only on newly pressed state
    const isUpPressed = moveUp && !input.prevMoveUp;
    const isDownPressed = moveDown && !input.prevMoveDown;
    const isLeftPressed = moveLeft && !input.prevMoveLeft;
    const isRightPressed = moveRight && !input.prevMoveRight;

    // Save current frame inputs as previous
    input.prevMoveUp = moveUp;
    input.prevMoveDown = moveDown;
    input.prevMoveLeft = moveLeft;
    input.prevMoveRight = moveRight;

    if (frogger.cooldownRemaining > 0) {
      frogger.cooldownRemaining -= dt * 60; // Tick countdown based on 60fps
      if (frogger.cooldownRemaining < 0) frogger.cooldownRemaining = 0;
    }

    if (frogger.cooldownRemaining > 0) return;

    let moved = false;
    let dx = 0;
    let dy = 0;

    if (isUpPressed) {
      dy = -1;
      moved = true;
    } else if (isDownPressed) {
      dy = 1;
      moved = true;
    } else if (isLeftPressed) {
      dx = -1;
      moved = true;
    } else if (isRightPressed) {
      dx = 1;
      moved = true;
    }

    if (moved) {
      const newGridX = Math.max(0, Math.min(config.TOTAL_COLS - 1, gridPos.col + dx));
      const newGridY = Math.max(0, Math.min(config.TOTAL_ROWS - 1, gridPos.row + dy));

      if (newGridX !== gridPos.col || newGridY !== gridPos.row) {
        gridPos.col = newGridX;
        gridPos.row = newGridY;
        frogger.cooldownRemaining = config.INPUT_COOLDOWN_TICKS;
        frogger.isRiding = false;
        frogger.logEntity = undefined;

        // Update continuous position centered on target cell using cellCenterToWorld
        const layout: GridLayout = { stepX: config.GRID_SIZE, stepY: config.GRID_SIZE, offsetX: 0, offsetY: 0 };
        const center = cellCenterToWorld(layout, { row: gridPos.row, col: gridPos.col });
        transform.x = center.x;
        transform.y = center.y;

        // Score bonus for moving forward
        if (dy < 0 && gridPos.row < frogger.furthestY) {
          frogger.furthestY = gridPos.row;
          if (stateEntity !== undefined) {
            world.mutateComponent(stateEntity, "FroggerState", (s) => {
              s.score += config.STEP_POINTS;
            });
          }
        }

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:jump", { gridX: gridPos.col, gridY: gridPos.row });
        }
      }
    }
  }
}
