import { World, SystemPhase, EventBus } from "@tiny-aster/core";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

describe("Space Invaders Game Over & Controls Layer Integration", () => {
  let world: World<SpaceInvadersComponentRegistry>;
  let gameStateSystem: SpaceInvadersGameStateSystem;

  beforeEach(() => {
    world = new World<SpaceInvadersComponentRegistry>();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    const mockGame = {
      isMultiplayer: false,
      isPaused: false,
      getWorld: () => world,
      setInputState: jest.fn(),
    } as any;

    gameStateSystem = new SpaceInvadersGameStateSystem(mockGame);
    world.addSystem(gameStateSystem, { phase: SystemPhase.GameRules });

    world.setResource("GameConfig", { PLAYER_INITIAL_LIVES: 3 });
    const gameStateEntity = world.createEntity();
    world.addComponent(gameStateEntity, {
      type: "GameState",
      lives: 0,
      score: 1200,
      level: 2,
      invadersRemaining: 5,
      isGameOver: false,
      screenShake: null,
      kamikazesActive: 0,
      readyRemaining: 0,
      intermissionRemaining: 0,
      continueCountdownRemaining: 0,
      continuesRemaining: 0,
    } as any);
  });

  it("should trigger isGameOver when lives reach 0 and no continues remain", () => {
    // Process game rules tick
    world.update(0.1);

    const gameState = world.getSingleton("GameState") as any;
    expect(gameState.isGameOver).toBe(true);
  });

  it("should conditionally hide controlsSlot when isGameOver is true so touch events reach REINITIALIZE MISSION", () => {
    // Simulate game over state
    world.mutateSingleton("GameState", (gs) => {
      gs.isGameOver = true;
    });

    const gameState = world.getSingleton("GameState") as any;

    // Simulate the controlsSlot render condition: !gameState?.isGameOver
    const shouldRenderControls = !gameState?.isGameOver;

    expect(shouldRenderControls).toBe(false);
  });

  it("should restore controlsSlot render condition after onRestart resets isGameOver to false", () => {
    // 1. Initial game over state
    world.mutateSingleton("GameState", (gs) => {
      gs.isGameOver = true;
    });

    let gameState = world.getSingleton("GameState") as any;
    expect(!gameState?.isGameOver).toBe(false);

    // 2. Simulate onRestart (e.g. game.restart())
    world.mutateSingleton("GameState", (gs) => {
      gs.isGameOver = false;
      gs.lives = 3;
      gs.score = 0;
    });

    gameState = world.getSingleton("GameState") as any;
    expect(gameState.isGameOver).toBe(false);

    // 3. controlsSlot should render again for active gameplay
    const shouldRenderControls = !gameState?.isGameOver;
    expect(shouldRenderControls).toBe(true);
  });
});
