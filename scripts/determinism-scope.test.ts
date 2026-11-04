import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  isDeterminismSensitiveSource,
  isStructuralMutationSensitiveSource,
  isTestOrMockSource
} from "./determinism-scope";

test("determinism scope includes simulation and gameplay systems", () => {
  assert.equal(isDeterminismSensitiveSource("packages/core/src/systems/MovementSystem.ts"), true);
  assert.equal(isDeterminismSensitiveSource("src/games/galaxian/systems/GalaxianInputSystem.ts"), true);
  assert.equal(isDeterminismSensitiveSource("src/games/outrun/simulation/RoadAdvanceSystem.ts"), true);
});

test("determinism scope includes root-level factories and blueprint modules", () => {
  assert.equal(isDeterminismSensitiveSource("src/games/vertical-shmup/EntityFactory.ts"), true);
  assert.equal(isDeterminismSensitiveSource("src/games/frogger/blueprints/FroggerBlueprints.ts"), true);
  assert.equal(isDeterminismSensitiveSource("packages/gameplay-kit/src/spawn/BlueprintInterpreter.ts"), true);
});

test("determinism scope includes all reusable gameplay-kit source files", () => {
  assert.equal(isDeterminismSensitiveSource("packages/gameplay-kit/src/arcade/powerups/PowerUpEffectRegistry.ts"), true);
  assert.equal(isDeterminismSensitiveSource("packages/gameplay-kit/src/combat/CombatResolver.ts"), true);
});

test("tests and mocks are excluded regardless of their directory", () => {
  assert.equal(isTestOrMockSource("src/games/galaxian/systems/__tests__/Movement.test.ts"), true);
  assert.equal(isTestOrMockSource("packages/gameplay-kit/src/spawn/SpawnDirector.spec.ts"), true);
  assert.equal(isTestOrMockSource("src/games/shared/__mocks__/RendererMock.ts"), true);
  assert.equal(isDeterminismSensitiveSource("src/games/galaxian/systems/__tests__/Movement.test.ts"), false);
});

test("structural mutation checks remain limited to systems and simulation", () => {
  assert.equal(isStructuralMutationSensitiveSource("src/games/galaxian/systems/GalaxianInputSystem.ts"), true);
  assert.equal(isStructuralMutationSensitiveSource("src/games/vertical-shmup/EntityFactory.ts"), false);
  assert.equal(isStructuralMutationSensitiveSource("packages/gameplay-kit/src/spawn/BlueprintInterpreter.ts"), false);
});
