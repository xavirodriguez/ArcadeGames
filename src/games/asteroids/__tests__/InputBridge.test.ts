import { AsteroidsGame } from "../AsteroidsGame";

describe("Asteroids Input Bridge (React Bridge)", () => {
  let game: AsteroidsGame;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    game.getWorld().gameplayRandom.unlock();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should successfully update the local player Input component in the ECS World via setInputState", () => {
    const world = game.getWorld();
    const localPlayers = world.query("LocalPlayer", "Input");
    expect(localPlayers.length).toBe(1);

    const playerEntity = localPlayers[0];
    const initialInput = world.getComponent(playerEntity, "Input") as any;
    expect(initialInput).toBeDefined();

    // Call setInputState to simulate React Bridge inputs
    game.setInputState({
      rotateLeft: true,
      thrust: true,
      shoot: false,
    });

    // Verify component in ECS is updated
    const updatedInput = world.getComponent(playerEntity, "Input") as any;
    expect(updatedInput.actions.rotateLeft).toBe(true);
    expect(updatedInput.actions.thrust).toBe(true);
    expect(updatedInput.actions.shoot).toBe(false);
  });
});
