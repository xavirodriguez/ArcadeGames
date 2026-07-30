import { AsteroidsGame } from "../AsteroidsGame";

describe("React Bridge Input Integration (InputBridge)", () => {
  let game: AsteroidsGame;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true, isMultiplayer: false });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should update the Input component on the LocalPlayer entity when setInputState is called", () => {
    const world = game.getWorld();

    // Check that we have a LocalPlayer entity
    const playerQuery = world.query("LocalPlayer");
    expect(playerQuery.length).toBeGreaterThan(0);
    const localPlayer = playerQuery[0];

    // Call setInputState
    game.setInputState({
      rotateLeft: true,
      rotateRight: false,
      thrust: true,
      shoot: false,
      hyperspace: true,
    });

    // Verify player Input component is updated
    const inputComp = world.getComponent(localPlayer, "Input") as any;
    expect(inputComp).toBeDefined();
    expect(inputComp.actions["rotateLeft"]).toBe(true);
    expect(inputComp.actions["rotateRight"]).toBe(false);
    expect(inputComp.actions["thrust"]).toBe(true);
    expect(inputComp.actions["shoot"]).toBe(false);
    expect(inputComp.actions["hyperspace"]).toBe(true);
  });
});
