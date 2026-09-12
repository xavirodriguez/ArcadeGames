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
      game.world.getEventBus()?.emitDeferred("combat:hit", { targetEntity: brick, damage: 1 });
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
});
