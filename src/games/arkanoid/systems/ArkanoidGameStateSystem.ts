import { System, World, WorldUtils } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry, BrickKind } from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";
import { ArkanoidEntityFactory } from "../EntityFactory";

export class ArkanoidGameStateSystem extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry> {
  private config?: ArkanoidConfig;

  public override update(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    this.config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

    const state = world.getSingleton("ArkanoidState");
    if (!state || state.isGameOver) return;

    if (state.bricksRemaining <= 0) {
      const activeBricks = world.query("Brick");
      if (activeBricks.length === 0) {
        const nextLevel = state.level + 1;
        world.mutateSingleton("ArkanoidState", (s) => {
          s.level = nextLevel;
          s.isVictory = true;
        });

        const balls = world.query("Ball");
        for (let i = 0; i < balls.length; i++) {
          const ball = balls[i];
          if (WorldUtils.isEntityActive(world, ball)) {
            world.mutateComponent(ball, "Ball", (b) => {
              b.isAttached = true;
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
  }

  public spawnLevelBricks(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>, level: number): void {
    const config = this.config || DEFAULT_ARKANOID_CONFIG;
    const rawGrid = world.getResource<string[][]>("LevelGrid");

    let brickCount = 0;
    if (rawGrid && rawGrid.length > 0) {
      const rows = rawGrid.length;
      for (let r = 0; r < rows; r++) {
        const row = rawGrid[r];
        for (let c = 0; c < row.length; c++) {
          const kindStr = row[c];
          if (kindStr && kindStr !== "none" && kindStr !== "empty") {
            const x = config.BRICK_OFFSET_LEFT + c * (config.BRICK_WIDTH + config.BRICK_PADDING) + config.BRICK_WIDTH / 2;
            const y = config.BRICK_OFFSET_TOP + r * (config.BRICK_HEIGHT + config.BRICK_PADDING) + config.BRICK_HEIGHT / 2;
            ArkanoidEntityFactory.createBrick(world, x, y, kindStr as BrickKind);
            brickCount++;
          }
        }
      }
    } else {
      const rows = Math.min(8, config.BRICK_ROWS + Math.floor(level / 2));
      const cols = config.BRICK_COLS;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = config.BRICK_OFFSET_LEFT + c * (config.BRICK_WIDTH + config.BRICK_PADDING) + config.BRICK_WIDTH / 2;
          const y = config.BRICK_OFFSET_TOP + r * (config.BRICK_HEIGHT + config.BRICK_PADDING) + config.BRICK_HEIGHT / 2;

          let kind: any = "standard";
          if (r === 0 && (c === 0 || c === cols - 1)) kind = "explosive";
          else if (r === 1 && c % 3 === 0) kind = "regenerable";
          else if (r === 2 && c % 4 === 2) kind = "gravitational";

          ArkanoidEntityFactory.createBrick(world, x, y, kind);
          brickCount++;
        }
      }
    }

    world.mutateSingleton("ArkanoidState", (s) => {
      s.bricksRemaining = brickCount;
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
    });
  }
}
