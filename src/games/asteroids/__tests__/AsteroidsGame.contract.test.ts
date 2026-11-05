import type { CompactInputFrame } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { defineGameContractSuite } from "../../shared/testing/GameContractSuite";

const deterministicInputs = [
  { t: 1, b: 1 },
  { t: 2, b: 2 },
  { t: 3, b: 4 },
  { t: 4, b: 8 },
  { t: 5, b: 0 },
  { t: 6, b: 1 | 8 },
  { t: 7, b: 2 | 8 },
  { t: 8, b: 4 | 8 },
  { t: 9, b: 0 },
  { t: 10, b: 16 }
] satisfies readonly CompactInputFrame[];

defineGameContractSuite<AsteroidsGame>({
  gameId: "asteroids",
  seed: 98765,
  inputs: deterministicInputs,
  applyInput: (game, input) => game.setInputState({
    thrust: (input.b & 1) !== 0,
    rotateLeft: (input.b & 2) !== 0,
    rotateRight: (input.b & 4) !== 0,
    shoot: (input.b & 8) !== 0,
    hyperspace: (input.b & 16) !== 0
  }),
  create: (seed) => new AsteroidsGame({
    headless: true,
    manualLoop: true,
    gameOptions: { seed }
  })
});


describe("Asteroids input contract", () => {
  it("applies thrust through the game input API before advancing a simulation tick", async () => {
    const game = new AsteroidsGame({
      headless: true,
      manualLoop: true,
      gameOptions: { seed: 98765 }
    });

    try {
      await game.init();

      const [shipEntity] = game.getWorld().query("LocalPlayer", "Velocity");
      if (shipEntity === undefined) {
        throw new Error("Asteroids did not initialize its local player velocity.");
      }

      const velocityBefore = game.getWorld().getComponent(shipEntity, "Velocity");
      if (!velocityBefore) {
        throw new Error("Asteroids local player has no Velocity component.");
      }
      const speedBefore = Math.hypot(velocityBefore.vx, velocityBefore.vy);

      game.setInputState({
        thrust: true,
        rotateLeft: false,
        rotateRight: false,
        shoot: false,
        hyperspace: false
      });
      game.step({ t: 1, b: 1 });

      const velocityAfter = game.getWorld().getComponent(shipEntity, "Velocity");
      if (!velocityAfter) {
        throw new Error("Asteroids local player lost its Velocity component after stepping.");
      }

      expect(Math.hypot(velocityAfter.vx, velocityAfter.vy)).toBeGreaterThan(speedBefore);
    } finally {
      game.destroy();
    }
  });
});
