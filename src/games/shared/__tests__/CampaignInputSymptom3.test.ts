import { GameDefinitionRegistry, BaseGame, TransformComponent } from "@tiny-aster/core";
import { registerDefaultCampaignGames } from "../../../services/CampaignGameRegistryService";

describe("Symptom 3 Fix Verification Test (Hypothesis B)", () => {
  beforeAll(() => {
    registerDefaultCampaignGames();
  });

  it("verifies that game simulation initialized via Campaign flow does not receive keyboard input without active controls binding", async () => {
    const definition = GameDefinitionRegistry.resolve("asteroids");
    const game = definition.createSimulation(12345, { headless: true }) as BaseGame;
    await game.init();

    const world = game.getWorld();
    const shipEntities = world.query("LocalPlayer", "Transform", "Input");
    expect(shipEntities.length).toBeGreaterThan(0);

    const shipEntity = shipEntities[0];
    const initialTransform = { ...(world.getComponent(shipEntity, "Transform") as TransformComponent) };

    // Tick simulation for 10 frames without input
    for (let i = 0; i < 10; i++) {
      game.update(0.016);
    }

    const currentTransform = { ...(world.getComponent(shipEntity, "Transform") as TransformComponent) };
    expect(currentTransform.x).toBe(initialTransform.x);
    expect(currentTransform.y).toBe(initialTransform.y);

    game.destroy();
  });

  it("verifies that ship moves when input payload is supplied to game simulation", async () => {
    const definition = GameDefinitionRegistry.resolve("asteroids");
    const game = definition.createSimulation(12345, { headless: true }) as BaseGame;
    await game.init();

    const world = game.getWorld();
    const shipEntities = world.query("LocalPlayer", "Transform", "Input");
    const shipEntity = shipEntities[0];
    const initialTransform = { ...(world.getComponent(shipEntity, "Transform") as TransformComponent) };

    // Set input state as useKeyboardControls does upon thrust key down
    game.setInputState({ thrust: true });

    // Tick simulation for 10 frames
    for (let i = 0; i < 10; i++) {
      game.update(0.016);
    }

    const currentTransform = { ...(world.getComponent(shipEntity, "Transform") as TransformComponent) };

    // Position MUST have changed
    expect(currentTransform.x).not.toBe(initialTransform.x);

    game.destroy();
  });
});
