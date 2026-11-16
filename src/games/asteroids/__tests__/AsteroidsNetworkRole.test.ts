import { AsteroidsGame } from "../AsteroidsGame";
import { AsteroidGameStateSystem } from "../systems/AsteroidGameStateSystem";
import { INITIAL_GAME_STATE } from "../types/AsteroidTypes";

describe("Asteroids network authority role", () => {
  it("assigns server and client roles to separate multiplayer Worlds", async () => {
    const server = new AsteroidsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { networkRole: "server" }
    });
    const client = new AsteroidsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { networkRole: "client" }
    });

    await Promise.all([server.init(), client.init()]);
    try {
      const serverWorld = server.getWorld();
      const clientWorld = client.getWorld();

      expect(serverWorld.getResource("NetworkRole")).toBe("server");
      expect(clientWorld.getResource("NetworkRole")).toBe("client");
      expect(serverWorld.schedule.getSystems().some(system => system instanceof AsteroidGameStateSystem)).toBe(true);
      expect(clientWorld.schedule.getSystems().some(system => system instanceof AsteroidGameStateSystem)).toBe(false);

      const stateEntity = serverWorld.createEntity();
      serverWorld.addComponent(stateEntity, INITIAL_GAME_STATE);
      serverWorld.update(1 / 60);
      clientWorld.update(1 / 60);

      expect(serverWorld.query("Asteroid").length).toBeGreaterThan(0);
      expect(clientWorld.query("Asteroid")).toHaveLength(0);
    } finally {
      server.destroy();
      client.destroy();
    }
  });

  it("defaults multiplayer Worlds to client and local Worlds to single-player authority", async () => {
    const multiplayer = new AsteroidsGame({ headless: true, isMultiplayer: true });
    const singlePlayer = new AsteroidsGame({ headless: true });

    await Promise.all([multiplayer.init(), singlePlayer.init()]);
    try {
      expect(multiplayer.getWorld().getResource("NetworkRole")).toBe("client");
      expect(singlePlayer.getWorld().getResource("NetworkRole")).toBe("single");
      expect(multiplayer.getWorld().schedule.getSystems().some(system => system instanceof AsteroidGameStateSystem)).toBe(false);
      expect(singlePlayer.getWorld().schedule.getSystems().some(system => system instanceof AsteroidGameStateSystem)).toBe(true);
    } finally {
      multiplayer.destroy();
      singlePlayer.destroy();
    }
  });
});
