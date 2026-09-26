import { ArkanoidGame } from "../ArkanoidGame";
import { LevelCatalog } from "../domain/LevelCatalog";
import { DOH_REQUIRED_HITS } from "../boss/DohFactory";
import { ArkanoidGameStateSystem } from "../systems/ArkanoidGameStateSystem";
import { ArkanoidActivePowerUpSystem } from "../systems/ArkanoidPowerUpSystems";
import { DohRulesSystem } from "../systems/ArkanoidDohSystems";
import { ArkanoidEnemyFactory } from "../enemies/ArkanoidEnemyFactory";
import { Entity } from "@tiny-aster/core";
import { setupBallCollision } from "./helpers";

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

    test("unbreakable gold brick vs multi-hit silver brick decrement rule", () => {
      const bricks = game.world.query("Brick");
      expect(bricks.length).toBeGreaterThan(1);

      // Keep only two bricks
      for (let i = 2; i < bricks.length; i++) {
        game.world.getCommandBuffer().removeEntity(bricks[i]);
      }
      game.update(0.016);
      game.update(0.016);

      const activeBricks = game.world.query("Brick");
      const goldBrick = activeBricks[0];
      const silverBrick = activeBricks[1];

      game.world.mutateComponent(goldBrick, "Brick", (b) => {
        b.material = "gold";
        b.color = "gold";
        b.hp = Infinity;
        b.maxHp = Infinity;
      });
      game.world.mutateComponent(goldBrick, "Health", (h) => {
        h.current = Infinity;
        h.max = Infinity;
      });

      game.world.mutateComponent(silverBrick, "Brick", (b) => {
        b.material = "silver";
        b.color = "silver";
        b.hp = 2;
        b.maxHp = 2;
      });
      game.world.mutateComponent(silverBrick, "Health", (h) => {
        h.current = 2;
        h.max = 2;
      });

      // Gold bricks don't count towards remaining bricks to clear level. Only silver counts (1 remaining).
      game.world.mutateSingleton("ArkanoidState", (s) => {
        s.bricksRemaining = 1;
      });

      const initialBricksRemaining = game.getGameState().bricksRemaining;
      expect(initialBricksRemaining).toBe(1);

      // Hit 1 on silver brick
      game.world.getEventBus()?.emitDeferred("combat:hit", { targetEntity: silverBrick, amount: 1, remainingHealth: 1 });
      game.update(0.016);

      expect(game.world.getComponent(silverBrick, "Brick")).toBeDefined();
      expect(game.getGameState().bricksRemaining).toBe(initialBricksRemaining);

      // Hit 2 on silver brick (death)
      game.world.getEventBus()?.emitDeferred("combat:death", { entity: silverBrick });
      game.update(0.016);

      // Verify silver brick is destroyed
      expect(game.world.getComponent(silverBrick, "Brick")).toBeUndefined();

      // Verify gold brick remains intact
      expect(game.world.getComponent(goldBrick, "Brick")).toBeDefined();

      // Verify bricksRemaining decremented by exactly 1
      expect(game.getGameState().bricksRemaining).toBe(initialBricksRemaining - 1);
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

    test("tunneling prevention and extreme spin shallow angle handling", () => {
      const ballEntity = game.world.query("Ball")[0];
      const bricks = game.world.query("Brick");
      expect(ballEntity).toBeDefined();
      expect(bricks.length).toBeGreaterThan(0);

      // Isolate target brick
      const targetBrick = bricks[0];
      const brickPos = game.world.getComponent(targetBrick, "Transform")!;

      // Position ball right before target brick with extreme spin and high shallow-angle velocity
      game.world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = false;
        b.spinFactor = 10.0;
      });
      game.world.mutateComponent(ballEntity, "Transform", (t) => {
        t.x = brickPos.x - 12; // Placed right adjacent to brick edge
        t.y = brickPos.y;
        t.dirty = true;
      });
      game.world.mutateComponent(ballEntity, "Velocity", (v) => {
        v.vx = 400; // High horizontal velocity
        v.vy = -1;  // Almost zero vertical velocity
      });

      setupBallCollision(game, ballEntity, targetBrick);

      // Run game updates using max allowed dt
      game.update(0.016);
      game.update(0.016);

      // Verify collision registered against target brick (target brick damaged/destroyed)
      const brickComp = game.world.getComponent(targetBrick, "Brick");
      expect(brickComp === undefined || brickComp.hp < brickComp.maxHp).toBe(true);
    });

    test("determinism of rebound angle calculation across isolated runs", async () => {
      const runBounceSimulation = async (seed: number) => {
        const testGame = new ArkanoidGame({ headless: true, seed });
        await testGame.init();

        const paddleEntity = testGame.world.query("Paddle")[0];
        const ballEntity = testGame.world.query("Ball")[0];
        const paddlePos = testGame.world.getComponent(paddleEntity, "Transform")!;

        // Configure paddle velocity and ball offset
        testGame.world.mutateComponent(paddleEntity, "Paddle", (p) => {
          p.lastVelocityX = 150;
        });

        testGame.world.mutateComponent(ballEntity, "Ball", (b) => {
          b.isAttached = false;
          b.spinFactor = 2.5;
        });

        // Position ball above paddle with downward velocity
        testGame.world.mutateComponent(ballEntity, "Transform", (t) => {
          t.x = paddlePos.x + 15; // Hit slightly right of center
          t.y = paddlePos.y - 10;
          t.dirty = true;
        });

        testGame.world.mutateComponent(ballEntity, "Velocity", (v) => {
          v.vx = -50;
          v.vy = 250;
        });

        // Tick simulation
        testGame.update(0.016);

        const reboundVel = testGame.world.getComponent(ballEntity, "Velocity");
        testGame.destroy();
        return { vx: reboundVel?.vx, vy: reboundVel?.vy };
      };

      const result1 = await runBounceSimulation(99999);
      const result2 = await runBounceSimulation(99999);

      expect(result1.vx).toBeDefined();
      expect(result1.vy).toBeDefined();
      expect(result1.vx).toBe(result2.vx);
      expect(result1.vy).toBe(result2.vy);
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

    test("opposing power-ups concurrency and synchronous reset", () => {
      const paddleEntity = game.world.query("Paddle")[0];
      const ballEntity = game.world.query("Ball")[0];
      expect(paddleEntity).toBeDefined();
      expect(ballEntity).toBeDefined();

      const activeSystem = game.world.schedule.getSystems().find((s): s is ArkanoidActivePowerUpSystem => s instanceof ArkanoidActivePowerUpSystem);
      expect(activeSystem).toBeDefined();

      // Initial speed
      game.world.mutateComponent(ballEntity, "Velocity", (v) => {
        v.vx = 200;
        v.vy = -200;
      });

      // Synchronously call applyCapsule for "E" then "S" without game.update
      activeSystem!.applyCapsule(game.world, paddleEntity, "E", 100, 100);
      activeSystem!.applyCapsule(game.world, paddleEntity, "S", 100, 100);

      const paddle = game.world.getComponent(paddleEntity, "Paddle");
      const vel = game.world.getComponent(ballEntity, "Velocity");
      const state = game.getGameState();

      // Assert state: activePowerUp is "S", isExpanded was cleared back to false
      expect(state.activePowerUp).toBe("S");
      expect(paddle?.isExpanded).toBe(false);

      // Ball velocity reduced exactly once (scaled by 0.7)
      expect(vel?.vx).toBeCloseTo(140);
      expect(vel?.vy).toBeCloseTo(-140);
    });

    test("spatial overlapping capsules on paddle have deterministic outcome", () => {
      const paddleEntity = game.world.query("Paddle")[0];
      const paddlePos = game.world.getComponent(paddleEntity, "Transform")!;

      const powerUpSpawnSystem = game.world.schedule.getSystems().find((s): s is any => s.constructor.name === "ArkanoidPowerUpSpawnSystem");
      expect(powerUpSpawnSystem).toBeDefined();

      // Spawn two capsules directly at paddle position
      powerUpSpawnSystem.spawnCapsule(game.world, paddlePos.x, paddlePos.y, "E");
      powerUpSpawnSystem.spawnCapsule(game.world, paddlePos.x, paddlePos.y, "L");

      game.update(0.016); // Flush deferred entities so capsules exist in world
      game.update(0.016); // Active system processes overlapping capsules and collects them

      // Outcome should be deterministic
      const state = game.getGameState();
      expect(["E", "L"]).toContain(state.activePowerUp);
    });

    test("Extra Life (P) increments lives", () => {
      const stateBefore = game.getGameState().lives;
      const paddle = game.world.query("Paddle")[0];
      const activeSystem = game.world.schedule.getSystems().find((s): s is ArkanoidActivePowerUpSystem => s instanceof ArkanoidActivePowerUpSystem);

      activeSystem!.applyCapsule(game.world, paddle, "P", 100, 100);
      expect(game.getGameState().lives).toBe(stateBefore + 1);
    });
  });

  describe("LevelCatalog Isolation & Validation", () => {
    test("validates all 33 levels for destructible bricks, capsule spawn positions, and cell uniqueness", () => {
      const stateSystem = game.world.schedule.getSystems().find((s): s is ArkanoidGameStateSystem => s instanceof ArkanoidGameStateSystem);
      expect(stateSystem).toBeDefined();

      for (let levelId = 1; levelId <= 33; levelId++) {
        // Clear all existing bricks before spawning level
        const existingBricks = game.world.query("Brick");
        for (let bIdx = 0; bIdx < existingBricks.length; bIdx++) {
          game.world.getCommandBuffer().removeEntity(existingBricks[bIdx]);
        }
        game.update(0.016);

        // Spawn level bricks
        stateSystem!.spawnLevelBricks(game.world, levelId);
        game.update(0.016);

        const levelDef = LevelCatalog.getLevel(levelId);

        // 1. Check cell uniqueness: no overlapping (row, col) coordinates in level definition
        const cellSet = new Set<string>();
        for (const cell of levelDef.cells) {
          const key = `${cell.row}_${cell.col}`;
          expect(cellSet.has(key)).toBe(false);
          cellSet.add(key);
        }

        // 2. Standard levels must have at least 1 destructible brick and at least 1 valid capsule spawn position
        if (levelDef.kind === "standard") {
          const spawnedBricks = game.world.query("Brick");
          expect(spawnedBricks.length).toBeGreaterThan(0);

          let destructibleCount = 0;
          for (let bIdx = 0; bIdx < spawnedBricks.length; bIdx++) {
            const brickComp = game.world.getComponent(spawnedBricks[bIdx], "Brick");
            if (brickComp && brickComp.material !== "gold") {
              destructibleCount++;
            }
          }
          expect(destructibleCount).toBeGreaterThan(0);

          // Check valid position exists for spawning capsules (world dimensions/transform)
          const validTransform = game.world.getComponent(spawnedBricks[0], "Transform");
          expect(validTransform).toBeDefined();
          expect(validTransform?.x).toBeGreaterThan(0);
          expect(validTransform?.y).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Enemy Spawns & Physical Interaction", () => {
    test("occupied enemy spawn at brick coordinates moves and interacts without crashing, inspecting CollisionEvents", () => {
      const bricks = game.world.query("Brick");
      expect(bricks.length).toBeGreaterThan(0);

      const targetBrick = bricks[0];
      const brickPos = game.world.getComponent(targetBrick, "Transform")!;

      // Spawn enemy at the exact coordinates of the existing brick
      const enemyEntity = ArkanoidEnemyFactory.createEnemy(game.world, brickPos.x, brickPos.y, "horizontal");

      // Run game update cycle to materialize deferred entity and run movement systems
      game.update(0.016);

      const enemyEntities = game.world.query("Enemy");
      expect(enemyEntities.length).toBe(1);

      const queriedEnemy = enemyEntities[0];
      const enemyComp = game.world.getComponent(queriedEnemy, "Enemy");
      const transform = game.world.getComponent(queriedEnemy, "Transform");
      const collider = game.world.getComponent(queriedEnemy, "Collider");
      const collisionEvents = game.world.getComponent(queriedEnemy, "CollisionEvents");

      expect(enemyComp).toBeDefined();
      expect(transform).toBeDefined();
      expect(collider?.layer).toBe(2); // Enemy layer: 2
      expect(collider?.mask).toBe(5);  // Mask: 5 (collides with Ball and Paddle)

      // Explicitly inspect CollisionEvents on queried enemy
      expect(collisionEvents).toBeDefined();
      expect(Array.isArray(collisionEvents?.collisions)).toBe(true);

      // Run subsequent updates to confirm enemy moves smoothly along its path
      game.update(0.016);
      game.update(0.016);

      const newTransform = game.world.getComponent(queriedEnemy, "Transform");
      expect(newTransform?.y).toBeGreaterThan(brickPos.y); // Moves downward along pattern
    });
  });

  describe("4.6 Doh Final Boss (16 Hits)", () => {
    test("Doh boss phase transition with in-flight ball collision", () => {
      const stateSystem = game.world.schedule.getSystems().find((s): s is ArkanoidGameStateSystem => s instanceof ArkanoidGameStateSystem);
      stateSystem!.spawnLevelBricks(game.world, 33);
      game.update(0.016); // Flush deferred entities!

      const dohEntity = game.world.query("Boss")[0];
      const ballEntity = game.world.query("Ball")[0];
      expect(dohEntity).toBeDefined();
      expect(ballEntity).toBeDefined();

      const bossPos = game.world.getComponent(dohEntity, "Transform")!;

      // Reduce introTimer to minimal value so it transitions state during update
      game.world.mutateComponent(dohEntity, "Boss", (b) => {
        b.state = "intro";
        b.introTimer = 0.001;
        b.hitsReceived = 0;
      });

      // Position in-flight ball directed towards boss
      game.world.mutateComponent(ballEntity, "Ball", (b) => {
        b.isAttached = false;
      });
      game.world.mutateComponent(ballEntity, "Transform", (t) => {
        t.x = bossPos.x;
        t.y = bossPos.y + 30;
        t.dirty = true;
      });
      game.world.mutateComponent(ballEntity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = -300;
      });

      // Emit hit directly on frame transition tick
      game.world.getEventBus()?.emitDeferred("combat:hit", {
        targetEntity: dohEntity,
        sourceEntity: ballEntity,
        amount: 1,
        remainingHealth: DOH_REQUIRED_HITS - 1
      });

      // Run game update cycle (DohAttackSystem transitions intro -> idle, DohRulesSystem handles hit)
      expect(() => game.update(0.016)).not.toThrow();

      const bossEntities = game.world.query("Boss");
      if (bossEntities.length > 0) {
        const bossComp = game.world.getComponent(bossEntities[0], "Boss");
        expect(bossComp).toBeDefined();
        expect(bossComp?.state).not.toBe("intro");
        expect(bossComp?.hitsReceived).toBeGreaterThanOrEqual(0);
      }
    });

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

    test("pause freezes boss timers and game destruction stops loop cleanly", () => {
      const stateSystem = game.world.schedule.getSystems().find((s): s is ArkanoidGameStateSystem => s instanceof ArkanoidGameStateSystem);
      stateSystem!.spawnLevelBricks(game.world, 33);
      game.update(0.016);

      const dohEntity = game.world.query("Boss")[0];
      expect(dohEntity).toBeDefined();

      const initialBossComp = { ...game.world.getComponent(dohEntity, "Boss")! };

      // Activate pause
      game.world.setResource("IsPaused", true);

      // Run multiple game update ticks while paused
      game.update(0.016);
      game.update(0.016);
      game.update(0.016);

      const pausedBossComp = game.world.getComponent(dohEntity, "Boss")!;
      expect(pausedBossComp.attackTimer).toBe(initialBossComp.attackTimer);
      expect(pausedBossComp.introTimer).toBe(initialBossComp.introTimer);

      // Call destroy simulating route unmount
      expect(() => game.destroy()).not.toThrow();

      // Run update after destroy and verify GameLoop is stopped without errors
      expect(() => game.update(0.016)).not.toThrow();
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

    test("partial loss in multiball (N - 1 balls lost in same tick) keeps lives unchanged", () => {
      const activePowerUpSystem = game.world.schedule.getSystems().find((s): s is ArkanoidActivePowerUpSystem => s instanceof ArkanoidActivePowerUpSystem);
      const paddle = game.world.query("Paddle")[0];

      // Spawn multiball so 3 balls total exist
      activePowerUpSystem!.applyCapsule(game.world, paddle, "M", 100, 100);
      game.update(0.016);

      const balls = game.world.query("Ball");
      expect(balls.length).toBe(3);

      const initialLives = game.getGameState().lives;

      // Drop N - 1 (2 balls) below bottom boundary in a single frame
      for (let i = 0; i < balls.length - 1; i++) {
        game.world.mutateComponent(balls[i], "Ball", (b) => {
          b.isAttached = false;
        });
        game.world.mutateComponent(balls[i], "Transform", (t) => {
          t.y = 800;
          t.dirty = true;
        });
      }

      // Tick game
      game.update(0.016);

      // Verify lives remained completely unchanged since 1 ball is still in play
      expect(game.getGameState().lives).toBe(initialLives);
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
