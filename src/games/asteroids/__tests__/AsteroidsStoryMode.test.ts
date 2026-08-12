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
    expect(getStoryEnding(1, 100, 1000)).toBe(
      "Tu señal se apagó en el cinturón Kepler-791. Helios Extractive borró todo registro de la ODISEA-7: el secreto murió contigo."
    );
    expect(getStoryEnding(4, 450, 1000)).toBe(
      "Tu señal se apagó en el cinturón Kepler-791. Helios Extractive borró todo registro de la ODISEA-7: el secreto murió contigo."
    );

    // Level 5-10
    expect(getStoryEnding(5, 1200, 1000)).toBe(
      "La caja negra fue transmitida... pero los drones de Helios interceptaron tu escape a un paso de la Tierra."
    );
    expect(getStoryEnding(10, 5000, 10000)).toBe(
      "La caja negra fue transmitida... pero los drones de Helios interceptaron tu escape a un paso de la Tierra."
    );

    // Level > 10
    expect(getStoryEnding(11, 20000, 10000)).toBe(
      "NUEVO RÉCORD — Te convertiste en el Fantasma de Kepler. La señal llegó a la Tierra: la verdad sobre Helios Extractive, expuesta."
    );
    expect(getStoryEnding(15, 5000, 10000)).toBe(
      "Te fusionaste por completo con el enjambre. Tu eco, y el de todos los que vinieron antes, seguirá orbitando para siempre los radares de Helios."
    );
  });

  it("should spawn a log popup on destroying a large asteroid in story mode (10% chance)", () => {
    // Force gameplayRandom.next to return a value < 0.1 so the 10% chance triggers
    const originalNext = world.gameplayRandom.next;
    world.gameplayRandom.next = () => 0.05;

    // Create a large asteroid
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Asteroid", size: "large" });
    world.addComponent(entity, { type: "Transform", x: 100, y: 100 });

    // Trigger combat:death via the event listener in AsteroidCollisionSystem
    const eventBus = world.getEventBus() as any;
    eventBus.emit("combat:death", { entity, sourceEntity: undefined });

    // Flush command buffer to commit entity creations
    world.getCommandBuffer().flush(world);

    // Verify a popup was spawned
    const textEntities = world.query("UIText" as any);
    expect(textEntities.length).toBeGreaterThan(0);

    // The UIText content should be one of the Chapter 1 logs because we are at level 1
    const popupComp = world.getComponent(textEntities[0], "UIText" as any) as any;
    expect(popupComp.content).toContain("Log #");

    // Restore original random next function
    world.gameplayRandom.next = originalNext;
  });
});
