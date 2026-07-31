import { World, SystemPhase, BlueprintRegistry } from "@tiny-aster/core";
import { BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";
import { FlappyBirdGame } from "../../flappybird/FlappyBirdGame";
import { PongGame } from "../../pong/PongGame";
import { AsteroidsGame } from "../../asteroids/AsteroidsGame";

describe("Unified Combo and Beneficial Mutators Integration Tests", () => {
  describe("Beneficial Mutators Core Application Logic", () => {
    let world: World<any>;

    beforeEach(() => {
      world = new World<any>();
    });

    it("should apply 'faster_bullets' mutator correctly by scaling PLAYER_BULLET_SPEED by 10%", () => {
      const mockConfig = {
        PLAYER_BULLET_SPEED: 500,
        BULLET_SPEED: 300,
      };
      world.setResource("GameConfig", mockConfig);

      BENEFICIAL_MUTATORS["faster_bullets"].apply(world);

      const updatedConfig = world.getResource<any>("GameConfig");
      expect(updatedConfig.PLAYER_BULLET_SPEED).toBe(550);
      expect(updatedConfig.BULLET_SPEED).toBe(330);
    });

    it("should apply 'extra_life' mutator correctly by incrementing starting lives and starting health", () => {
      const mockConfig = {
        PLAYER_INITIAL_LIVES: 3,
      };
      world.setResource("GameConfig", mockConfig);

      // Create a GameState singleton
      const gameStateEntity = world.createEntity();
      world.addComponent(gameStateEntity, {
        type: "GameState",
        lives: 3,
      } as any);

      // Create player health entity
      const playerEntity = world.createEntity();
      world.addComponent(playerEntity, { type: "Player" } as any);
      world.addComponent(playerEntity, {
        type: "Health",
        current: 3,
        max: 3,
      } as any);

      BENEFICIAL_MUTATORS["extra_life"].apply(world);

      const updatedConfig = world.getResource<any>("GameConfig");
      expect(updatedConfig.PLAYER_INITIAL_LIVES).toBe(4);

      const gameState = world.getSingleton("GameState" as any) as any;
      expect(gameState.lives).toBe(4);

      const health = world.getComponent(playerEntity, "Health" as any) as any;
      expect(health.current).toBe(4);
      expect(health.max).toBe(4);
    });

    it("should apply 'combo_head_start' mutator correctly by starting combo at 5 (multiplier x2)", () => {
      // Create combo entity
      const comboEntity = world.createEntity();
      world.addComponent(comboEntity, {
        type: "Combo",
        combo: 0,
        multiplier: 1,
        timerRemaining: 0,
        timerDuration: 2.0,
      } as any);

      // Create GameState singleton
      const gameStateEntity = world.createEntity();
      world.addComponent(gameStateEntity, {
        type: "GameState",
        combo: 0,
        multiplier: 1,
        comboTimerRemaining: 0,
      } as any);

      BENEFICIAL_MUTATORS["combo_head_start"].apply(world);

      const combo = world.getComponent(comboEntity, "Combo" as any) as any;
      expect(combo.combo).toBe(5);
      expect(combo.multiplier).toBe(2);

      const gameState = world.getSingleton("GameState" as any) as any;
      expect(gameState.combo).toBe(5);
      expect(gameState.multiplier).toBe(2);
    });

    it("should apply 'shield_pulse' mutator correctly by granting 3 seconds of invulnerability at start", () => {
      // Create local player entity with health
      const playerEntity = world.createEntity();
      world.addComponent(playerEntity, { type: "LocalPlayer" } as any);
      world.addComponent(playerEntity, {
        type: "Health",
        current: 3,
        max: 3,
        invulnerableRemaining: 0,
      } as any);

      BENEFICIAL_MUTATORS["shield_pulse"].apply(world);

      const health = world.getComponent(playerEntity, "Health" as any) as any;
      expect(health.invulnerableRemaining).toBe(3000);
    });
  });

  describe("Arcade Games Game Loading and Instantiation", () => {
    it("should instantiate PongGame without throwing errors and register Combo components", () => {
      const pong = new PongGame();
      expect(pong).toBeDefined();
    });

    it("should instantiate FlappyBirdGame without throwing errors and register Combo components", () => {
      const flappy = new FlappyBirdGame();
      expect(flappy).toBeDefined();
    });

    it("should instantiate AsteroidsGame without throwing errors", () => {
      const asteroids = new AsteroidsGame();
      expect(asteroids).toBeDefined();
    });
  });
});
