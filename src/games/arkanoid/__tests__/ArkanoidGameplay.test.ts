import { ArkanoidGame } from "../ArkanoidGame";
import { LevelCatalog } from "../domain/LevelCatalog";
import { DOH_REQUIRED_HITS } from "../boss/DohFactory";
import { ArkanoidGameStateSystem } from "../systems/ArkanoidGameStateSystem";
import { ArkanoidActivePowerUpSystem } from "../systems/ArkanoidPowerUpSystems";
import { DohRulesSystem } from "../systems/ArkanoidDohSystems";
import { Entity } from "@tiny-aster/core";

describe("Arkanoid Arcade Gameplay & Requirements", () => {
  let game: ArkanoidGame;

  beforeEach(async () => {
    game = new ArkanoidGame({ headless: true, seed: 12345 });
    await game.init();
  });

  afterEach(() => {
    if (game) {
      game.destroy();
    }
  });

  describe("4.1 System of Levels 1-33", () => {
    test("catalog has 33 valid levels", () => {
      LevelCatalog.initialize();
      const levels = LevelCatalog.getAllLevels();
      expect(levels.length).toBe(33);

      for (let i = 1; i <= 33; i++) {
        const lvl = LevelCatalog.getLevel(i);
        expect(lvl.id).toBe(i);
        expect(lvl.rows).toBeGreaterThan(0);
        expect(lvl.columns).toBeGreaterThan(0);
        if (i === 33) {
          expect(lvl.kind).toBe("boss");
        } else {
          expect(lvl.kind).toBe("standard");
        }
      }
    });

    test("level 33 activates Doh boss encounter", () => {
      const stateSystem = game.world.schedule.getSystems().find((s): s is ArkanoidGameStateSystem => s instanceof ArkanoidGameStateSystem);
      expect(stateSystem).toBeDefined();

      stateSystem!.spawnLevelBricks(game.world, 33);

      const bossQuery = game.world.query("Boss");
      expect(bossQuery.length).toBe(1);

      const bossComp = game.world.getComponent(bossQuery[0], "Boss");
      expect(bossComp).toBeDefined();
      expect(bossComp?.maxHp).toBe(DOH_REQUIRED_HITS);
    });
  });

  describe("4.2 Bricks and Resistance", () => {
    function setupBallCollision(gameInstance: ArkanoidGame, ballEntity: Entity, brickEntity: Entity): void {
      const brickPos = gameInstance.world.getComponent(brickEntity, "Transform")!;
      gameInstance.world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = false;
      });
      gameInstance.world.mutateComponent(ballEntity, "Transform", (t) => {
        t.x = brickPos.x;
        t.y = brickPos.y;
        t.dirty = true;
      });
      gameInstance.world.mutateComponent(ballEntity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = -100;
      });
    }

    test("silver brick requires multiple hits", () => {
      const bricks = game.world.query("Brick");
      expect(bricks.length).toBeGreaterThan(0);
      const brick = bricks[0];

      game.world.mutateComponent(brick, "Brick", (b) => {
        b.material = "silver";
        b.color = "silver";
        b.hp = 2;
        b.maxHp = 2;
        b.isDestroyed = false;
      });
      game.world.mutateComponent(brick, "Health", (h) => {
        h.current = 2;
        h.max = 2;
      });

      // Hit 1
      game.world.getEventBus()?.emitDeferred("combat:hit", { targetEntity: brick, amount: 1, remainingHealth: 1 });
      game.update(0.016);
      expect(game.world.getComponent(brick, "Brick")?.isDestroyed).toBeFalsy();

      // Hit 2 - reduces hp to 0 and emit death
      game.world.getEventBus()?.emitDeferred("combat:death", { entity: brick });
      game.update(0.016);
      expect(game.world.getComponent(brick, "Brick")).toBeUndefined(); // removed on death!
    });

    test("gold brick is indestructible by ball and laser", () => {
      const brick = game.world.query("Brick")[0];
      game.world.mutateComponent(brick, "Brick", (b) => {
        b.material = "gold";
        b.color = "gold";
        b.hp = Infinity;
        b.maxHp = Infinity;
      });

      // Try death
      game.world.getEventBus()?.emitDeferred("combat:death", { entity: brick });
      game.update(0.016);
      expect(game.world.getComponent(brick, "Brick")?.isDestroyed).toBeFalsy();
    });

    test("standard brick with 1 HP is destroyed on collision with ball, updating bricksRemaining, score, and combo", () => {
      const ballEntity = game.world.query("Ball")[0];
      const bricks = game.world.query("Brick");
      expect(ballEntity).toBeDefined();
      expect(bricks.length).toBeGreaterThan(1);

      // Keep bricks[0] and bricks[10], remove all remaining bricks to isolate collision
      for (let i = 0; i < bricks.length; i++) {
        if (i !== 0 && i !== 10) {
          game.world.getCommandBuffer().removeEntity(bricks[i]);
        }
      }
      game.update(0.016);
      game.update(0.016);

      const targetBrick = game.world.query("Brick")[0];
      const otherBrick = game.world.query("Brick")[1];
      expect(targetBrick).toBeDefined();
      expect(otherBrick).toBeDefined();

      // Configure target brick as standard 1 HP
      game.world.mutateComponent(targetBrick, "Brick", (b) => {
        b.kind = "standard";
        b.material = "standard";
        b.hp = 1;
        b.maxHp = 1;
      });
      game.world.mutateComponent(targetBrick, "Health", (h) => {
        h.current = 1;
        h.max = 1;
      });

      // Move other brick far away so ball won't touch it
      game.world.mutateComponent(otherBrick, "Transform", (t) => {
        t.x = 750;
        t.y = 500;
        t.dirty = true;
      });

      const initialBricksRemaining = game.getGameState().bricksRemaining;
      const initialScore = game.getGameState().score;
      expect(initialBricksRemaining).toBe(2);

      setupBallCollision(game, ballEntity, targetBrick);

      // Run game update cycle so CollisionSystem2D detects overlap, ArkanoidCollisionSystem processes collision, and onCombatDeath runs
      game.update(0.016);
      game.update(0.016); // Reconcile bricksRemaining state

      // Verify target brick is destroyed (removed from world)
      expect(game.world.getComponent(targetBrick, "Brick")).toBeUndefined();

      // Verify bricksRemaining decrements by 1
      expect(game.getGameState().bricksRemaining).toBe(initialBricksRemaining - 1);

      // Verify score increases
      expect(game.getGameState().score).toBeGreaterThan(initialScore);
    });

    test("gold brick is indestructible on collision with ball", () => {
      const ballEntity = game.world.query("Ball")[0];
      const brick = game.world.query("Brick")[0];
      expect(ballEntity).toBeDefined();
      expect(brick).toBeDefined();

      game.world.mutateComponent(brick, "Brick", (b) => {
        b.material = "gold";
        b.color = "gold";
        b.hp = Infinity;
        b.maxHp = Infinity;
      });
      game.world.mutateComponent(brick, "Health", (h) => {
        h.current = 999;
        h.max = 999;
      });

      setupBallCollision(game, ballEntity, brick);

      game.update(0.016);

      // Verify gold brick is NOT destroyed
      expect(game.world.getComponent(brick, "Brick")).toBeDefined();
      expect(game.world.getComponent(brick, "Health")?.current).toBe(999);
    });
  });

  describe("4.3 Ball & Vaus Physics", () => {
    test("ball launches on p1Launch input", () => {
      const ballEntity = game.world.query("Ball")[0];
      expect(ballEntity).toBeDefined();

      // Ensure ball is initially attached
      game.world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = true;
      });

      // Set input via game.setInputState
      game.setInputState({ p1Launch: true });
      game.update(0.016);

      const ball = game.world.getComponent(ballEntity, "Ball");
      expect(ball?.isAttached).toBe(false);

      const vel = game.world.getComponent(ballEntity, "Velocity");
      expect(vel?.vy).toBeLessThan(0); // directed upward
    });

    test("emits arkanoid:ball_lost with remainingLives === 0 when losing the last life (game over)", () => {
      const ballLostEvents: Array<{ entity: Entity; remainingLives: number }> = [];
      game.world.getEventBus()?.on("arkanoid:ball_lost", (payload) => {
        ballLostEvents.push(payload);
      });

      // Set lives to 1 so losing this ball causes Game Over
      game.world.mutateSingleton("ArkanoidState", (s) => {
        s.lives = 1;
        s.isGameOver = false;
      });

      const ballEntity = game.world.query("Ball")[0];
      const ball = game.world.getComponent(ballEntity, "Ball");
      expect(ball).toBeDefined();

      // Unattach ball and move below paddle
      game.world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = false;
      });
      game.world.mutateComponent(ballEntity, "Transform", (t) => {
        t.y = 800; // far below paddle Y
        t.dirty = true;
      });

      // Run game tick
      game.update(0.016);

      expect(game.getGameState().isGameOver).toBe(true);
      expect(game.getGameState().lives).toBe(0);
      expect(ballLostEvents.length).toBe(1);
      expect(ballLostEvents[0].remainingLives).toBe(0);
    });
  });

  describe("4.4 Power-Ups (E, L, C, S, M, B, P)", () => {
    test("single active persistent power-up replacement rule", () => {
      const paddleEntity = game.world.query("Paddle")[0];
      expect(paddleEntity).toBeDefined();

      const activeSystem = game.world.schedule.getSystems().find((s): s is ArkanoidActivePowerUpSystem => s instanceof ArkanoidActivePowerUpSystem);
      expect(activeSystem).toBeDefined();

      // Apply Expand
      activeSystem!.applyCapsule(game.world, paddleEntity, "E", 100, 100);

      let paddle = game.world.getComponent(paddleEntity, "Paddle");
      expect(paddle?.isExpanded).toBe(true);
      expect(paddle?.isLaserActive).toBe(false);

      // Apply Laser (replaces Expand)
      activeSystem!.applyCapsule(game.world, paddleEntity, "L", 100, 100);

      paddle = game.world.getComponent(paddleEntity, "Paddle");
      expect(paddle?.isExpanded).toBe(false);
      expect(paddle?.isLaserActive).toBe(true);
    });

    test("Extra Life (P) increments lives", () => {
      const stateBefore = game.getGameState().lives;
      const paddle = game.world.query("Paddle")[0];
      const activeSystem = game.world.schedule.getSystems().find((s): s is ArkanoidActivePowerUpSystem => s instanceof ArkanoidActivePowerUpSystem);

      activeSystem!.applyCapsule(game.world, paddle, "P", 100, 100);
      expect(game.getGameState().lives).toBe(stateBefore + 1);
    });
  });

  describe("4.6 Doh Final Boss (16 Hits)", () => {
    test("Doh takes exactly 16 valid hits to defeat", () => {
      const stateSystem = game.world.schedule.getSystems().find((s): s is ArkanoidGameStateSystem => s instanceof ArkanoidGameStateSystem);
      stateSystem!.spawnLevelBricks(game.world, 33);
      game.update(0.016); // Flush deferred entities!

      const dohEntity = game.world.query("Boss")[0];
      expect(dohEntity).toBeDefined();

      const dohRules = game.world.schedule.getSystems().find((s): s is DohRulesSystem => s instanceof DohRulesSystem);
      expect(dohRules).toBeDefined();

      // Set boss to idle state so it accepts hits
      game.world.mutateComponent(dohEntity, "Boss", (b) => {
        b.state = "idle";
        b.damagedTimer = 0;
      });

      const ballEntity = game.world.query("Ball")[0];

      // Deliver 15 hits
      for (let i = 0; i < 15; i++) {
        game.world.mutateComponent(dohEntity, "Boss", (b) => {
          b.state = "idle";
          b.damagedTimer = 0;
        });
        dohRules!.handleDohHit(game.world, dohEntity, ballEntity);
      }

      let bossComp = game.world.getComponent(dohEntity, "Boss");
      expect(bossComp?.hitsReceived).toBe(15);
      expect(game.getGameState().isVictory).toBe(false);

      // 16th hit delivers victory
      game.world.mutateComponent(dohEntity, "Boss", (b) => {
        b.state = "idle";
        b.damagedTimer = 0;
      });
      dohRules!.handleDohHit(game.world, dohEntity, ballEntity);

      expect(game.getGameState().isVictory).toBe(true);
    });
  });

  describe("Game State Propagation & Subscription", () => {
    test("subscriber receives isGameOver = true immediately when last ball is lost", () => {
      let lastReceivedState: any = null;
      const unsubscribe = game.subscribe((state) => {
        lastReceivedState = state;
      });

      // Set lives to 1
      game.world.mutateSingleton("ArkanoidState", (s) => {
        s.lives = 1;
        s.isGameOver = false;
      });

      const ballEntity = game.world.query("Ball")[0];
      game.world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = false;
      });
      game.world.mutateComponent(ballEntity, "Transform", (t) => {
        t.y = 800;
        t.dirty = true;
      });

      // Tick the game loop
      const initialTime = performance.now();
      game.getGameLoop().tick(initialTime);
      game.getGameLoop().tick(initialTime + 17);

      expect(lastReceivedState).not.toBeNull();
      expect(lastReceivedState.isGameOver).toBe(true);
      expect(game.isGameOver()).toBe(true);

      unsubscribe();
    });

    test("multi-ball loss in same tick correctly updates remaining ball count and decrements lives when last ball is lost", () => {
      // Spawn extra ball to create multi-ball scenario (2 balls total)
      const activePowerUpSystem = game.world.schedule.getSystems().find((s): s is ArkanoidActivePowerUpSystem => s instanceof ArkanoidActivePowerUpSystem);
      const paddle = game.world.query("Paddle")[0];

      activePowerUpSystem!.applyCapsule(game.world, paddle, "M", 100, 100);
      game.update(0.016); // flush command buffer to materialize spawned balls

      const balls = game.world.query("Ball");
      expect(balls.length).toBeGreaterThanOrEqual(2);

      // Unattach all balls and move them below paddle boundary in the SAME tick
      for (let i = 0; i < balls.length; i++) {
        game.world.mutateComponent(balls[i], "Ball", (b) => {
          b.isAttached = false;
        });
        game.world.mutateComponent(balls[i], "Transform", (t) => {
          t.y = 800;
          t.dirty = true;
        });
      }

      const initialLives = game.getGameState().lives;

      // Tick the game
      game.update(0.016);

      // Verify lives decremented by 1 (since the last ball lost should trigger life lost)
      expect(game.getGameState().lives).toBe(initialLives - 1);

      // Verify there is still 1 active ball reset to the paddle (not 0 balls)
      const remainingBalls = game.world.query("Ball");
      expect(remainingBalls.length).toBe(1);
    });
  });
});
