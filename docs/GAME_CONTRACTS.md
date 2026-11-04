# Shared game contracts

Tiny Aster exposes a common lifecycle and simulation contract through `BaseGame`. The shared contract suite at `src/games/shared/testing/GameContractSuite.ts` verifies behavior that should remain consistent across game implementations.

## Covered guarantees

- Initialization reaches `GameLifecycleState.RUNNING` and exposes the actual initial seed.
- Pause and resume are idempotent and update the lifecycle state.
- Restart accepts a replacement seed, rebuilds the simulation and returns to the running state.
- Destroy moves the lifecycle to its terminal `DESTROYED` state.
- Two instances created with the same seed and driven by the same compact input frames keep matching simulation ticks and state hashes.

The tests compare two independent instances tick by tick. This detects divergence earlier than comparing only the final score or final state.

## Pilot and adoption

`AsteroidsGame.contract.test.ts` is the first adopter. Additional games should register the suite in their own Jest project and provide:

1. A factory that creates a headless, manually driven instance with the supplied seed.
2. A representative, non-empty sequence of that game's supported `CompactInputFrame` inputs.

Use deterministic input sequences; do not use wall-clock timing or unseeded random values in the test.

## What the shared suite does not assume

The suite does not assume that every game has the same movement model, collision rules, game-over state, renderer or asset pipeline. Those are game-specific contracts and must remain covered by tests owned by the relevant game. Canvas/Skia parity, visual snapshots, multiplayer behavior and terminal-state transitions are not yet implied by passing this suite.

## Running the pilot

```bash
pnpm exec jest --runInBand --runTestsByPath src/games/asteroids/__tests__/AsteroidsGame.contract.test.ts
```

The normal CI game test step also includes this test through the Asteroids Jest project.
