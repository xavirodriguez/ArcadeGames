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

defineGameContractSuite({
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
