import { NullAudioPlayer } from "@tiny-aster/core";
import { FlappyBirdGame } from "../../../flappybird/FlappyBirdGame";
import { GeometryWarsGame } from "../../../geometrywars/GeometryWarsGame";
import { SpaceInvadersGame } from "../../../space-invaders/SpaceInvadersGame";

describe("UpdateFromServer Golden Master Tests", () => {
  describe("FlappyBirdGame.updateFromServer", () => {
    it("matches golden master snapshot for entity state and components", async () => {
      const game = new FlappyBirdGame({ isMultiplayer: true, audio: new NullAudioPlayer() });
      await game.init();

      const serverState = {
        tick: 42,
        players: {
          p1: { x: 100, y: 200, alive: true, velocityY: -50 },
          p2: { x: 120, y: 250, alive: false, velocityY: 10 },
        },
        pipes: {
          pipe1: { x: 300, gapY: 150, id: "pipe1" },
        },
      };

      game.updateFromServer(serverState);

      const world = game.getWorld();
      const entities = world.query("Transform");

      const entitySnapshots = entities.map((id: number) => {
        const components: Record<string, unknown> = {};
        for (const compName of ["Transform", "Render", "Bird", "Pipe"]) {
          if (world.hasComponent(id, compName as any)) {
            components[compName] = world.getComponent(id, compName as any);
          }
        }
        return { id, components };
      });

      expect(entitySnapshots).toMatchSnapshot();
      game.destroy();
    });
  });

  describe("GeometryWarsGame.updateFromServer", () => {
    it("matches golden master snapshot for entity state and components with localSessionId", async () => {
      const game = new GeometryWarsGame({ isMultiplayer: true, headless: true, audio: new NullAudioPlayer() });
      await game.init();

      const serverState = {
        tick: 100,
        players: {
          p1: { x: 10, y: 20, alive: true, angle: 1.57 },
          p2: { x: 30, y: 40, alive: false, angle: 0 },
        },
        enemies: {
          e1: { x: 100, y: 100, angle: 0.5, type: "gw_seeker" },
        },
        bullets: {
          b1: { x: 200, y: 200, angle: 3.14 },
        },
      };

      // p1 is local session ID, so in GW p1 should be skipped from Transform creation in updateFromServer
      game.updateFromServer(serverState, "p1");

      const world = game.getWorld();
      const entities = world.query("Transform");

      const entitySnapshots = entities.map((id: number) => {
        const components: Record<string, unknown> = {};
        for (const compName of ["Transform", "Render", "Player", "Health", "Enemy", "Bullet"]) {
          if (world.hasComponent(id, compName as any)) {
            components[compName] = world.getComponent(id, compName as any);
          }
        }
        return { id, components };
      });

      expect(entitySnapshots).toMatchSnapshot();
      game.destroy();
    });
  });

  describe("SpaceInvadersGame.updateFromServer", () => {
    it("matches golden master snapshot for entity state and components with localSessionId", async () => {
      const game = new SpaceInvadersGame({ isMultiplayer: true, headless: true, audio: new NullAudioPlayer() });
      await game.init();

      const world = game.getWorld();
      game.blueprints.get("state")?.spawn(world, world.createEntity(), {});

      const serverState = {
        tick: 88,
        score: 500,
        gameOver: false,
        players: {
          p1: { x: 50, y: 500, alive: true },
          p2: { x: 150, y: 500, alive: false },
        },
        invaders: {
          inv1: { x: 100, y: 100, alive: true, id: "inv1" },
          inv2: { x: 120, y: 100, alive: false, id: "inv2" },
        },
        bullets: {
          b1: { x: 50, y: 450, ownerId: "player" },
          b2: { x: 100, y: 150, ownerId: "enemy" },
        },
      };

      game.updateFromServer(serverState, "p1");

      const entities = world.query("Transform");

      const entitySnapshots = entities.map((id: number) => {
        const components: Record<string, unknown> = {};
        for (const compName of ["Transform", "Render", "Player", "LocalPlayer", "Input", "Invader", "PlayerBullet", "EnemyBullet", "Health", "Faction", "Damage", "Boundary"]) {
          if (world.hasComponent(id, compName as any)) {
            components[compName] = world.getComponent(id, compName as any);
          }
        }
        return { id, components };
      });

      expect(entitySnapshots).toMatchSnapshot();

      const gameState = game.getGameState();
      expect(gameState.score).toBe(500);
      expect(gameState.isGameOver).toBe(false);
      game.destroy();
    });
  });
});
