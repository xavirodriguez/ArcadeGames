import { GeometryWarsGame } from "../../geometrywars/GeometryWarsGame";
import { SpaceInvadersGame } from "../../space-invaders/SpaceInvadersGame";
import { AsteroidsGame } from "../../asteroids/AsteroidsGame";
import { FlappyBirdGame } from "../../flappybird/FlappyBirdGame";
import { createEmptyCanonicalInputState } from "@tiny-aster/core";

describe("Input Unification Retrofit Non-Regression Tests", () => {
  describe("GeometryWarsGame", () => {
    it("processes CanonicalInputState accurately without behavior regression", () => {
      const game = new GeometryWarsGame({ headless: true });
      const world = game.getWorld();

      const player = world.createEntity();
      world.addComponent(player, { type: "Player", moveX: 0, moveY: 0 } as any);
      world.addComponent(player, { type: "Aim", aimX: 0, aimY: 0, isFiring: false } as any);

      const canonicalState = createEmptyCanonicalInputState();
      canonicalState.axes.moveX = 1;
      canonicalState.axes.moveY = -1;
      canonicalState.axes.aimX = 0.5;
      canonicalState.axes.aimY = 0.5;
      canonicalState.actions = ["fire"];

      game.setInputState(canonicalState);

      const pComp = world.getComponent(player, "Player" as any) as any;
      const aimComp = world.getComponent(player, "Aim" as any) as any;

      expect(pComp.moveX).toBe(1);
      expect(pComp.moveY).toBe(-1);
      expect(aimComp.aimX).toBe(0.5);
      expect(aimComp.aimY).toBe(0.5);
      expect(aimComp.isFiring).toBe(true);
    });
  });

  describe("SpaceInvadersGame", () => {
    it("translates CanonicalInputState axes and actions to internal Input component", () => {
      const game = new SpaceInvadersGame({ headless: true });
      const world = game.getWorld();

      const player = world.createEntity();
      world.addComponent(player, { type: "Player" } as any);

      const canonicalState = createEmptyCanonicalInputState();
      canonicalState.axes.moveX = -1;
      canonicalState.actions = ["fire"];

      game.setInputState(canonicalState);

      const inputComp = world.getComponent(player, "Input" as any) as any;
      expect(inputComp.moveLeft).toBe(true);
      expect(inputComp.moveRight).toBe(false);
      expect(inputComp.shoot).toBe(true);
    });
  });

  describe("AsteroidsGame", () => {
    it("translates CanonicalInputState axes and actions to Asteroids internal input actions", () => {
      const game = new AsteroidsGame({ headless: true });
      const world = game.getWorld();

      const playerEntity = world.createEntity();
      world.addComponent(playerEntity, { type: "LocalPlayer" } as any);

      const canonicalState = createEmptyCanonicalInputState();
      canonicalState.axes.moveX = 1;
      canonicalState.axes.moveY = -1;
      canonicalState.actions = ["fire", "hyperspace"];

      game.setInputState(canonicalState);

      const player = game.getWorld().query("LocalPlayer" as any)[0];
      const inputComp = game.getWorld().getComponent(player, "Input" as any) as any;

      expect(inputComp.actions).toContain("rotateRight");
      expect(inputComp.actions).not.toContain("rotateLeft");
      expect(inputComp.actions).toContain("thrust");
      expect(inputComp.actions).toContain("shoot");
      expect(inputComp.actions).toContain("hyperspace");
    });
  });

  describe("FlappyBirdGame", () => {
    it("translates CanonicalInputState actions to FlappyBird internal flap and glide", () => {
      const game = new FlappyBirdGame();
      const world = game.getWorld();

      const bird = world.createEntity();
      world.addComponent(bird, { type: "Bird" } as any);

      const canonicalState = createEmptyCanonicalInputState();
      canonicalState.actions = ["boost", "confirm"];

      game.setInputState(canonicalState);

      const flappyInput = world.getComponent(bird, "FlappyInput" as any) as any;
      expect(flappyInput.flap).toBe(true);
      expect(flappyInput.glide).toBe(true);
    });
  });
});
