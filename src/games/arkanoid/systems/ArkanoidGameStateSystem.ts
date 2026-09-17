import { System, World, WorldUtils } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";
import { ArkanoidEntityFactory } from "../EntityFactory";
import { LevelCatalog } from "../domain/LevelCatalog";
import { DohFactory } from "../boss/DohFactory";
import { GridLayout, cellToWorld } from "../../shared/grid";

export class ArkanoidGameStateSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  private config?: ArkanoidConfig;

  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    this.config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

    const state = world.getSingleton("ArkanoidState");
    if (!state || state.isGameOver) return;

    if (state.level === 33) return;

    const activeBricks = world.query("Brick");
    let destructibleCount = 0;
    for (let i = 0; i < activeBricks.length; i++) {
      const bComp = world.getComponent(activeBricks[i], "Brick");
      const health = world.getComponent(activeBricks[i], "Health");
      if (bComp && bComp.material !== "gold" && !bComp.isDestroyed && (!health || health.current > 0)) {
        destructibleCount++;
      }
    }

    if (state.bricksRemaining !== destructibleCount && !state.portalActive) {
      world.mutateSingleton("ArkanoidState", (s) => {
        s.bricksRemaining = destructibleCount;
      });
    }

    if (destructibleCount === 0 || state.portalActive) {
        const nextLevel = Math.min(33, state.level + 1);
        world.mutateSingleton("ArkanoidState", (s) => {
          s.level = nextLevel;
          s.isVictory = true;
          s.portalActive = false;
          s.activePowerUp = null;
        });

        const balls = world.query("Ball");
        for (let i = 0; i < balls.length; i++) {
          const ball = balls[i];
          if (WorldUtils.isEntityActive(world, ball)) {
            world.mutateComponent(ball, "Ball", (b) => {
              b.isAttached = true;
              b.attachedOffsetX = 0;
            });
            world.mutateComponent(ball, "Velocity", (v) => {
              v.vx = 0;
              v.vy = 0;
            });
          }
        }

        this.spawnLevelBricks(world, nextLevel);

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emitDeferred("arkanoid:level_complete", { level: nextLevel });
          if (!world.isReSimulating) {
            eventBus.emitDeferred("PlaySFX", { name: "level_up" });
          }
        }
      }
  }

  public spawnLevelBricks(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, level: number): void {
    const config = this.config || DEFAULT_ARKANOID_CONFIG;

    const existingBricks = world.query("Brick");
    for (const e of existingBricks) world.getCommandBuffer().removeEntity(e);

    const existingCapsules = world.query("Capsule");
    for (const e of existingCapsules) world.getCommandBuffer().removeEntity(e);

    const existingLasers = world.query("LaserProjectile");
    for (const e of existingLasers) world.getCommandBuffer().removeEntity(e);

    const existingEnemies = world.query("Enemy");
    for (const e of existingEnemies) world.getCommandBuffer().removeEntity(e);

    const existingBoss = world.query("Boss");
    for (const e of existingBoss) world.getCommandBuffer().removeEntity(e);

    if (level === 33) {
      DohFactory.createDoh(world, config.SCREEN_CENTER_X, 120);
      world.mutateSingleton("ArkanoidState", (s) => {
        s.bricksRemaining = 999;
        s.isVictory = false;
      });
      return;
    }

    LevelCatalog.initialize();
    let levelDef;
    try {
      levelDef = LevelCatalog.getLevel(level);
    } catch {
      levelDef = LevelCatalog.getLevel(1);
    }

    let breakableCount = 0;
    const layout: GridLayout = {
      stepX: config.BRICK_WIDTH + config.BRICK_PADDING,
      stepY: config.BRICK_HEIGHT + config.BRICK_PADDING,
      offsetX: config.BRICK_OFFSET_LEFT || 60,
      offsetY: config.BRICK_OFFSET_TOP || 80,
    };

    for (const cell of levelDef.cells) {
      const origin = cellToWorld(layout, { row: cell.row, col: cell.col });
      const x = origin.x + config.BRICK_WIDTH / 2;
      const y = origin.y + config.BRICK_HEIGHT / 2;

      ArkanoidEntityFactory.createBrick(world, x, y, cell.material, cell.color, cell.hp, cell.points, cell.powerUp);

      if (cell.material !== "gold") {
        breakableCount++;
      }
    }

    world.mutateSingleton("ArkanoidState", (s) => {
      s.bricksRemaining = breakableCount;
      s.isVictory = false;
    });
  }

  public resetGameOverState(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>): void {
    world.mutateSingleton("ArkanoidState", (s) => {
      s.score = 0;
      s.lives = this.config?.PLAYER_INITIAL_LIVES ?? 3;
      s.level = 1;
      s.isGameOver = false;
      s.isVictory = false;
      s.bricksRemaining = 0;
      s.activePowerUp = null;
      s.portalActive = false;
    });
  }
}
