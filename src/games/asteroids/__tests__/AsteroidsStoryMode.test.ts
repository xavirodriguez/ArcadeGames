import { World } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { getStoryEnding } from "../story/StoryBeats";

describe("Asteroids Story Mode Tests", () => {
  let game: AsteroidsGame;
  let world: World<any, any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({
      headless: true,
      gameOptions: {
        mode: "story"
      }
    });
    await game.init();
    world = game.getWorld();
    world.gameplayRandom.unlock();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should initialize story mode correctly", () => {
    const state = game.getGameState();
    expect(state.mode).toBe("story");
    expect(state.readyRemaining).toBe(3.0);
    expect(state.intermissionRemaining).toBe(0);
    expect(state.storyBeatText).toBe("ODISEA-7 A LA DERIVA");
  });

  it("should process ready countdown in story mode and let game start", () => {
    // Tick ready countdown
    world.update(1.0);
    expect(game.getGameState().readyRemaining).toBe(2.0);

    world.update(2.0);
    expect(game.getGameState().readyRemaining).toBe(0);
  });

  it("should transition to intermission when all asteroids are cleared in story mode", () => {
    // Clear ready countdown first
    world.update(3.1);
    expect(game.getGameState().readyRemaining).toBe(0);

    // Clear any spawned asteroids
    const initialAsteroids = world.query("Asteroid");
    for (const entity of initialAsteroids) {
      world.getCommandBuffer().removeEntity(entity);
    }
    world.getCommandBuffer().flush(world);

    // Update once to process zero asteroids and trigger intermission
    world.update(0.016);
    world.flush();

    const state = game.getGameState();
    expect(state.intermissionRemaining).toBe(3.0);
    expect(state.chapterTitle).toBe("Capítulo 1: Silencio en el Cinturón — completado");
    expect(state.storyBeatText).toBe("Algo se mueve entre los escombros...");
    expect(state.level).toBe(1); // Still level 1 during intermission!

    // Tick intermission countdown by 2.0s
    world.update(2.0);
    expect(game.getGameState().intermissionRemaining).toBe(1.0);

    // Complete intermission countdown by 1.1s
    world.update(1.1);
    world.flush();

    // Now level should have incremented, and triggered ready countdown for level 2!
    const nextState = game.getGameState();
    expect(nextState.level).toBe(2);
    expect(nextState.readyRemaining).toBe(3.0);
    expect(nextState.intermissionRemaining).toBe(0);
    expect(nextState.storyBeatText).toBe("ODISEA-7 A LA DERIVA"); // Beat readyText for level 2

    // Should have spawned wave for level 2: 5 + (2 - 1) = 6 asteroids
    const newAsteroids = world.query("Asteroid");
    expect(newAsteroids.length).toBe(6);
  });

  it("should return alternative story ending strings correctly", () => {
    // Level < 5
    expect(getStoryEnding(1, 100, 1000)).toBe("Tu señal se apagó cerca del borde del Cinturón.");
    expect(getStoryEnding(4, 450, 1000)).toBe("Tu señal se apagó cerca del borde del Cinturón.");

    // Level 5-10
    expect(getStoryEnding(5, 1200, 1000)).toBe(
      "Escapaste con fragmentos de prueba... pero el enjambre sigue ahí fuera."
    );
    expect(getStoryEnding(10, 5000, 10000)).toBe(
      "Escapaste con fragmentos de prueba... pero el enjambre sigue ahí fuera."
    );

    // Level > 10
    expect(getStoryEnding(11, 20000, 10000)).toBe(
      "NUEVO RÉCORD — Te convertiste en leyenda del Cinturón de Kepler."
    );
    expect(getStoryEnding(15, 5000, 10000)).toBe(
      "Te convertiste en leyenda del Cinturón de Kepler."
    );
  });
});
