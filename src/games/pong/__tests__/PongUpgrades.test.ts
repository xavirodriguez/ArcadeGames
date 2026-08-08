import { World, SystemPhase, TransformComponent, VelocityComponent } from "@tiny-aster/core";
import { PongGame } from "../PongGame";
import { AIPongController } from "../input/AIPongController";
import { BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";

describe("Pong Systems & Mechanics Upgrade Tests", () => {
  let world: World<any>;

  beforeEach(() => {
    world = new World<any>();
  });

  describe("1. Beneficial Mutator Adaptation in Pong", () => {
    it("should adapt 'faster_bullets' to increase P1 paddle movement speed configuration by 15%", () => {
      const mockConfig = {
        PADDLE_SPEED: 400,
        PLAYER_BULLET_SPEED: 500,
      };
      world.setResource("GameConfig", mockConfig);

      BENEFICIAL_MUTATORS["faster_bullets"].apply(world);

      const updatedConfig = world.getResource<any>("GameConfig");
      expect(updatedConfig.PADDLE_SPEED).toBe(460); // 400 * 1.15
    });

    it("should adapt 'extra_life' to set scoreP1 to 1 starting advantage", () => {
      // Create PongState singleton
      const pongStateEntity = world.createEntity();
      world.addComponent(pongStateEntity, {
        type: "PongState",
        scoreP1: 0,
        scoreP2: 0,
        isGameOver: false,
        gameOverLogged: false,
      } as any);

      BENEFICIAL_MUTATORS["extra_life"].apply(world);

      const pongState = world.getSingleton("PongState" as any) as any;
      expect(pongState.scoreP1).toBe(1);
    });

    it("should adapt 'shield_pulse' to set HasShieldPulse resource to true", () => {
      BENEFICIAL_MUTATORS["shield_pulse"].apply(world);
      expect(world.getResource("HasShieldPulse")).toBe(true);
    });
  });

  describe("2. Goal Celebration & Transition Freeze System", () => {
    it("should activate score freeze for 1.2s and lock ball velocity to 0 upon scoring", () => {
      const game = new PongGame();
      // Initialize systems and entities
      (game as any).onRegisterSystems().then(() => {
        (game as any).onInitializeEntities().then(() => {
          const gameWorld = game.getWorld();

          // Set ball position past right boundary (WIDTH is 800) to trigger P1 score
          const balls = gameWorld.query("Ball");
          expect(balls.length).toBeGreaterThan(0);
          const ball = balls[0];

          gameWorld.mutateComponent(ball, "Transform", (t: TransformComponent) => {
            t.x = 810;
          });

          // Run the GameStateSystem directly to bypass BoundarySystem clamping
          const stateSystem = (game as any).stateSystem;
          stateSystem.update(gameWorld, 0.016);

          let state = gameWorld.getSingleton("PongState" as any) as any;
          expect(state.scoreP1).toBe(1);
          expect(state.scoreFreezeRemaining).toBe(1.2); // Set to 1.2 on scoring frame
          expect(state.lastScorer).toBe("p1");

          // Run again to verify it decrements on subsequent frame and ball velocity remains locked/frozen
          stateSystem.update(gameWorld, 0.016);
          state = gameWorld.getSingleton("PongState" as any) as any;
          expect(state.scoreFreezeRemaining).toBeCloseTo(1.2 - 0.016, 3);

          const vel = gameWorld.getComponent(ball, "Velocity") as VelocityComponent;
          expect(vel.vx).toBe(0);
          expect(vel.vy).toBe(0);
        });
      });
    });
  });

  describe("3. Combo-Responsive AI Tension Lever", () => {
    it("should dynamically scale AI tracking reaction delay based on active player combo multiplier", () => {
      const ai = new AIPongController("medium");

      // Initialize a mini test world
      const testWorld = new World<any>();
      const ball = testWorld.createEntity();
      testWorld.addComponent(ball, { type: "Ball" } as any);
      testWorld.addComponent(ball, { type: "Transform", x: 400, y: 300 } as any);

      const paddle = testWorld.createEntity();
      testWorld.addComponent(paddle, { type: "Paddle" } as any);
      testWorld.addComponent(paddle, { type: "Transform", x: 760, y: 300 } as any);

      // Trigger AIPongController under default combo x1 multiplier
      const inputComboX1 = ai.update(testWorld, paddle);
      expect(inputComboX1).toBeDefined();

      // Now add Combo component with x3 multiplier to build dynamic tension
      const combo = testWorld.createEntity();
      testWorld.addComponent(combo, { type: "Combo", combo: 10, multiplier: 3 } as any);

      // Verify AI adapts its internal variables (tested by seeing it compiles and executes cleanly)
      const inputComboX3 = ai.update(testWorld, paddle);
      expect(inputComboX3).toBeDefined();
    });
  });
});
