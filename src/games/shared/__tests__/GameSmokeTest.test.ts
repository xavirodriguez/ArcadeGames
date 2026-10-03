import { BaseGame } from "@tiny-aster/core";
import { AsteroidsGame } from "../../asteroids/AsteroidsGame";
import { ArkanoidGame } from "../../arkanoid/ArkanoidGame";
import { EchoRunnerGame } from "../../echorunner/EchoRunnerGame";
import { FlappyBirdGame } from "../../flappybird/FlappyBirdGame";
import { FroggerGame } from "../../frogger/FroggerGame";
import { GeometryWarsGame } from "../../geometrywars/GeometryWarsGame";
import { PlatformerGame } from "../../platformer/PlatformerGame";
import { PongGame } from "../../pong/PongGame";
import { SpaceInvadersGame } from "../../space-invaders/SpaceInvadersGame";

type GameFactory = () => BaseGame<any, any, any, any, any>;

const gameFactories: Record<string, GameFactory> = {
  asteroids: () => new AsteroidsGame(),
  arkanoid: () => new ArkanoidGame(),
  echorunner: () => new EchoRunnerGame(),
  flappybird: () => new FlappyBirdGame(),
  frogger: () => new FroggerGame(),
  geometrywars: () => new GeometryWarsGame(),
  platformer: () => new PlatformerGame(),
  pong: () => new PongGame(),
  "space-invaders": () => new SpaceInvadersGame(),
};

describe("Headless Game Smoke Tests", () => {
  Object.entries(gameFactories).forEach(([gameId, factory]) => {
    describe(`Game: ${gameId}`, () => {
      let game: BaseGame<any, any, any, any, any>;

      beforeEach(async () => {
        game = factory();
        await game.init();
        game.start();
      });

      afterEach(() => {
        game.destroy();
      });

      it("runs 120 ticks without throwing exceptions", () => {
        expect(() => {
          for (let i = 0; i < 120; i++) {
            game.update(1 / 60);
          }
        }).not.toThrow();
      });

      it("checks entity position movement or static simulation state", () => {
        const world = game.getWorld();
        let entitiesWithVelocity = world.query("Transform", "Velocity");
        if (entitiesWithVelocity.length === 0) {
          for (let i = 0; i < 10; i++) {
            game.update(1 / 60);
          }
          entitiesWithVelocity = world.query("Transform", "Velocity");
        }

        if (entitiesWithVelocity.length > 0) {
          let targetEntity: number | undefined;
          let initialTransform: { x: number; y: number } | undefined;

          for (const e of entitiesWithVelocity) {
            const vel = world.getComponent(e, "Velocity") as { vx: number; vy: number };
            if (vel && (Math.abs(vel.vx) > 0.001 || Math.abs(vel.vy) > 0.001)) {
              const tf = world.getComponent(e, "Transform") as { x: number; y: number };
              if (tf) {
                targetEntity = e;
                initialTransform = { x: tf.x, y: tf.y };
                break;
              }
            }
          }

          if (targetEntity !== undefined && initialTransform !== undefined) {
            for (let i = 0; i < 10; i++) {
              game.update(1 / 60);
            }
            const newTransform = world.getComponent(targetEntity, "Transform") as { x: number; y: number };
            expect(newTransform).toBeDefined();
            const moved = newTransform.x !== initialTransform.x || newTransform.y !== initialTransform.y;
            expect(moved).toBe(true);
          } else {
            expect(world.entities.length).toBeGreaterThan(0);
          }
        } else {
          expect(world.entities.length).toBeGreaterThan(0);
        }
      });

      it("has valid shapes in Render components if present", () => {
        const world = game.getWorld();
        const renderEntities = world.query("Render");
        if (renderEntities.length > 0) {
          for (const e of renderEntities) {
            const render = world.getComponent(e, "Render") as any;
            if (render) {
              const shapeType = render.shape?.type ?? render.shapeType ?? render.type;
              expect(shapeType).toBeDefined();
            }
          }
        } else {
          expect(world.entities.length).toBeGreaterThan(0);
        }
      });

      it("maintains expected initial game state resources or singleton properties", () => {
        expect(game.isGameOver()).toBe(false);
        const state = game.getGameState();
        expect(state).toBeDefined();
      });
    });
  });
});
