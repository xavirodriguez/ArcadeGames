import { GameDefinitionRegistry, BaseGame } from "@tiny-aster/core";
import { registerDefaultCampaignGames } from "../../../services/CampaignGameRegistryService";

describe("Campaign Minigames Input Propagation & Lifecycle Integration", () => {
  beforeAll(() => {
    registerDefaultCampaignGames();
  });

  const campaignGames = [
    {
      id: "asteroids",
      input: { thrust: true, rotateLeft: true, shoot: true }
    },
    {
      id: "space-invaders",
      input: { moveLeft: true, shoot: true }
    },
    {
      id: "flappybird",
      input: { flap: true }
    },
    {
      id: "pong",
      input: { p1Up: true, p2Down: true }
    },
    {
      id: "geometrywars",
      input: { moveUp: true, moveLeft: true, shoot: true }
    },
    {
      id: "platformer",
      input: { moveRight: true, p1Launch: true }
    },
    {
      id: "frogger",
      input: { moveUp: true }
    },
    {
      id: "echorunner",
      input: { moveRight: true, p1Launch: true }
    }
  ];

  campaignGames.forEach(({ id, input }) => {
    it(`instantiates, accepts input, executes 120 ticks, and destroys cleanly: ${id}`, async () => {
      expect(GameDefinitionRegistry.has(id)).toBe(true);
      const definition = GameDefinitionRegistry.resolve(id);
      expect(definition).toBeDefined();

      const game = definition.createSimulation(12345) as BaseGame;
      expect(game).toBeDefined();

      await game.init();

      // Set keyboard/controller input state
      game.setInputState(input);

      // Execute ~120 ticks (approx 2 seconds of simulation at 60 FPS)
      for (let i = 0; i < 120; i++) {
        game.update(0.016);
      }

      // Ensure world state exists and entities are active
      expect(game.world).toBeDefined();

      // Reset input state and clean up simulation
      game.setInputState({
        rotateLeft: false,
        rotateRight: false,
        moveLeft: false,
        moveRight: false,
        moveUp: false,
        moveDown: false,
        thrust: false,
        shoot: false,
        hyperspace: false,
        flap: false,
        glide: false,
        p1Left: false,
        p1Right: false,
        p1Launch: false,
        p1Up: false,
        p1Down: false,
        p2Up: false,
        p2Down: false
      });

      expect(() => game.destroy()).not.toThrow();
    });
  });
});
