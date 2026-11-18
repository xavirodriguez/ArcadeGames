/**
 * Global Jest setup: clears GameLoop watchdog intervals after all tests complete
 * to prevent "Cannot log after tests are done" warnings.
 *
 * GameLoop instances register themselves in `global.__ACTIVE_GAME_LOOPS__`
 * when `process.env.NODE_ENV === "test"` (see GameLoop.ts constructor).
 */
afterAll(() => {
  const loops = global.__ACTIVE_GAME_LOOPS__;
  if (Array.isArray(loops)) {
    for (const loop of loops) {
      if (typeof loop.stop === "function") {
        loop.stop();
      }
    }
    loops.length = 0;
  }
});
