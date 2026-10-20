import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { CentipedeEntityFactory } from "../EntityFactory";

export class SpiderSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  private spawnTimerMs = 4000;

  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const spiders = world.query("Spider", "Transform", "Velocity");

    if (spiders.length === 0) {
      this.spawnTimerMs -= dt * 1000;
      if (this.spawnTimerMs <= 0) {
        const side = world.gameplayRandom.next() > 0.5 ? "left" : "right";
        const startX = side === "left" ? 10 : config.worldWidth - 10;
        const startY = (config.GRID_ROWS - Math.floor(config.PLAYER_ZONE_ROWS / 2)) * config.CELL_SIZE;
        CentipedeEntityFactory.createSpider(world, startX, startY);
        this.spawnTimerMs = config.SPIDER_SPAWN_INTERVAL_MS;
      }
    }

    const playerZoneMinY = (config.GRID_ROWS - config.PLAYER_ZONE_ROWS) * config.CELL_SIZE;
    const playerZoneMaxY = config.worldHeight;

    for (const entity of spiders) {
      const spider = world.getMutableComponent(entity, "Spider");
      const transform = world.getMutableComponent(entity, "Transform");
      const velocity = world.getMutableComponent(entity, "Velocity");

      if (!spider || !transform || !velocity) continue;

      spider.changeTimer += dt;
      if (spider.changeTimer > 1.2) {
        spider.changeTimer = 0;
        spider.dirY = world.gameplayRandom.next() > 0.5 ? 1 : -1;
      }

      if (transform.y <= playerZoneMinY) {
        spider.dirY = 1;
      } else if (transform.y >= playerZoneMaxY) {
        spider.dirY = -1;
      }

      if (transform.x <= 0 || transform.x >= config.worldWidth) {
        spider.dirX = -spider.dirX;
      }

      velocity.vx = spider.dirX * config.SPIDER_SPEED * 0.7;
      velocity.vy = spider.dirY * config.SPIDER_SPEED * 0.7;

      transform.x += velocity.vx * dt;
      transform.y += velocity.vy * dt;
      transform.dirty = true;
    }
  }
}
