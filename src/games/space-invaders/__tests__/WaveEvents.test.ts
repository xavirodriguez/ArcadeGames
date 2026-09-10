import { SpaceInvadersGame } from "../SpaceInvadersGame";

describe("WaveEvents and Timeline", () => {
  it("should generate procedural wave definitions with event types across 50 levels", () => {
    const game = new SpaceInvadersGame({ headless: true });
    const scene = (game as any).sceneManager?.currentScene;
    if (scene) {
      scene.onEnter();
      const waveDefs = scene.world.getResource("WaveDefinitions") as any[];
      expect(waveDefs).toBeDefined();
      expect(waveDefs.length).toBe(50);

      // Verify event types
      expect(waveDefs[4].eventType).toBe("Boss"); // Level 5
      expect(waveDefs[2].eventType).toBe("Kamikaze Surge"); // Level 3
      expect(waveDefs[6].eventType).toBe("Obstacle"); // Level 7
      expect(waveDefs[1].eventType).toBe("Time Modifier"); // Level 2
    }
  });
});
