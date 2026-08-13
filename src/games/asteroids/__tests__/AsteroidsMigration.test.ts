import { AsteroidsGame } from "../AsteroidsGame";
import { AsteroidsDefinition } from "../AsteroidsDefinition";
import { GameSession, DeterministicReplayRecorder, DivergenceDetector, CompactInputFrame } from "@tiny-aster/core";

describe("Asteroids Game Migration - Regression & Determinism Verification", () => {
  let standaloneGame: AsteroidsGame | null = null;
  let sessionGame: AsteroidsGame | null = null;
  let testDetectorGame: AsteroidsGame | null = null;

  afterEach(() => {
    if (standaloneGame) {
      standaloneGame.destroy();
      standaloneGame = null;
    }
    if (sessionGame) {
      sessionGame.destroy();
      sessionGame = null;
    }
    if (testDetectorGame) {
      testDetectorGame.destroy();
      testDetectorGame = null;
    }
  });

  it("should yield identical hashes tick-by-tick between standalone game and GameSession wrapped game", async () => {
    const seed = 98765;

    // 1. Standalone game setup
    standaloneGame = new AsteroidsGame({ headless: true, gameOptions: { seed } });
    await standaloneGame.init();

    const recorder = new DeterministicReplayRecorder("asteroids", seed);
    recorder.captureInitialState(standaloneGame);

    // Define a sequence of inputs to test various actions
    const inputs: CompactInputFrame[] = [
      { t: 1, b: 1 }, // thrust
      { t: 2, b: 2 }, // left
      { t: 3, b: 4 }, // right
      { t: 4, b: 8 }, // fire
      { t: 5, b: 0 }, // idle
      { t: 6, b: 1 | 8 }, // thrust + fire
      { t: 7, b: 2 | 8 }, // left + fire
      { t: 8, b: 4 | 8 }, // right + fire
      { t: 9, b: 0 },
      { t: 10, b: 16 }, // hyperspace
    ];

    const standaloneHashes: string[] = [];

    // Run original simulation ticks
    for (const input of inputs) {
      standaloneGame.step(input);
      recorder.recordFrame(input);
      standaloneHashes.push(standaloneGame.hash());
    }

    const replayFile = recorder.compileReplay();

    // 2. Wrapped GameSession setup
    const session = new GameSession(AsteroidsDefinition, seed);
    sessionGame = session.simulation as AsteroidsGame;
    await sessionGame.init();

    // Play identical inputs on GameSession
    const sessionHashes: string[] = [];
    for (const input of inputs) {
      session.playTick(input);
      sessionHashes.push(session.simulation.hash());
    }

    // 3. Tick-by-tick exact match verification
    expect(sessionHashes).toEqual(standaloneHashes);

    // 4. Divergence Detector verification
    testDetectorGame = new AsteroidsGame({ headless: true, gameOptions: { seed } });
    await testDetectorGame.init();

    const divergenceResult = DivergenceDetector.findDivergenceTick(testDetectorGame, replayFile, standaloneHashes);
    expect(divergenceResult).toBe(-1); // Matches perfectly with zero divergence!
  });
});
