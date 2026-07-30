import { World } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";

describe("React Bridge: Asteroids InputBridge Integration", () => {
  let game: AsteroidsGame;
  let world: World<any, any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should correctly update the LocalPlayer entity's Input component when game.setInputState() is invoked", () => {
    // 1. Find LocalPlayer entity in World
    const players = world.query("LocalPlayer", "Input");
    expect(players.length).toBeGreaterThan(0);
    const playerEntity = players[0];

    // Verify entity initially has empty actions map
    let inputComp = world.getComponent(playerEntity, "Input") as any;
    expect(inputComp).toBeDefined();
    expect(inputComp.actions["rotateLeft"]).toBeUndefined();
    expect(inputComp.actions["thrust"]).toBeUndefined();

    // 2. Set positive inputs
    game.setInputState({
      rotateLeft: true,
      thrust: true,
      shoot: true,
      rotationAmount: 0.5,
    });

    // 3. Verify component mutated in-place with exact values
    inputComp = world.getComponent(playerEntity, "Input") as any;
    expect(inputComp.actions["rotateLeft"]).toBe(true);
    expect(inputComp.actions["thrust"]).toBe(true);
    expect(inputComp.actions["shoot"]).toBe(true);
    expect(inputComp.axes["rotate_x"]).toBe(0.5);
    expect(inputComp.axes["horizontal"]).toBe(0.5);

    // 4. Set different/false inputs
    game.setInputState({
      rotateLeft: false,
      thrust: false,
      shoot: false,
      rotationAmount: -0.2,
    });

    // 5. Verify values updated correctly
    inputComp = world.getComponent(playerEntity, "Input") as any;
    expect(inputComp.actions["rotateLeft"]).toBe(false);
    expect(inputComp.actions["thrust"]).toBe(false);
    expect(inputComp.actions["shoot"]).toBe(false);
    expect(inputComp.axes["rotate_x"]).toBe(-0.2);
    expect(inputComp.axes["horizontal"]).toBe(-0.2);
  });
});
