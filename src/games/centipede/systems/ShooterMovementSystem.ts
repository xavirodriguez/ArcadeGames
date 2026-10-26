import { System, World, TouchInputState, IInputSystem } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry, CentipedeInput } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";

export class ShooterMovementSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const inputState = world.getResource<CentipedeInput>("InputState");
    const inputSys = world.getResource<IInputSystem>("InputSystem");
    const touchState = world.getResource<TouchInputState>("TouchInputState");

    const shooters = world.query("Shooter", "Transform", "Velocity");
    if (shooters.length === 0) return;

    let dx = 0;
    let dy = 0;

    if (inputSys) {
      if (inputSys.getAction("p1Left") || inputSys.getAction("left")) dx -= 1;
      if (inputSys.getAction("p1Right") || inputSys.getAction("right")) dx += 1;
      if (inputSys.getAction("p1Up") || inputSys.getAction("up")) dy -= 1;
      if (inputSys.getAction("p1Down") || inputSys.getAction("down")) dy += 1;
    }

    if (inputState) {
      if (inputState.left || inputState.p1Left) dx -= 1;
      if (inputState.right || inputState.p1Right) dx += 1;
      if (inputState.up || inputState.p1Up) dy -= 1;
      if (inputState.down || inputState.p1Down) dy += 1;
    }

    if (touchState) {
      if (touchState.moveX !== 0 || touchState.moveY !== 0) {
        dx = touchState.moveX;
        dy = touchState.moveY;
      }
    }

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    const minX = config.CELL_SIZE / 2;
    const maxX = config.worldWidth - config.CELL_SIZE / 2;
    const playerZoneMinY = (config.GRID_ROWS - config.PLAYER_ZONE_ROWS) * config.CELL_SIZE + config.CELL_SIZE / 2;
    const maxY = config.worldHeight - config.CELL_SIZE / 2;

    for (const entity of shooters) {
      const transform = world.getMutableComponent(entity, "Transform");
      const velocity = world.getMutableComponent(entity, "Velocity");
      const gridPos = world.getMutableComponent(entity, "GridPos");

      if (!transform || !velocity) continue;

      velocity.vx = dx * config.PLAYER_SPEED;
      velocity.vy = dy * config.PLAYER_SPEED;

      let newX = transform.x + velocity.vx * dt;
      let newY = transform.y + velocity.vy * dt;

      if (newX < minX) newX = minX;
      if (newX > maxX) newX = maxX;
      if (newY < playerZoneMinY) newY = playerZoneMinY;
      if (newY > maxY) newY = maxY;

      if (newX !== transform.x || newY !== transform.y) {
        transform.x = newX;
        transform.y = newY;
        transform.dirty = true;
      }

      if (gridPos) {
        gridPos.col = Math.min(config.GRID_COLS - 1, Math.max(0, Math.floor(newX / config.CELL_SIZE)));
        gridPos.row = Math.min(config.GRID_ROWS - 1, Math.max(0, Math.floor(newY / config.CELL_SIZE)));
      }
    }
  }
}
