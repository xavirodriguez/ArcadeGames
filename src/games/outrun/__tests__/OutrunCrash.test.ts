import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent } from "../types/OutrunTypes";
import { isOutrunCrashing } from "../types/OutrunTypes";
import { computePlayerCarGeometry } from "../rendering/OutrunVisualHelpers";

function makeState(overrides: Partial<RaceStateComponent> = {}): RaceStateComponent {
  return {
    type: "RaceState",
    playerZ: 100,
    playerX: 0.1,
    speed: 6000,
    lapTime: 5,
    isGameOver: false,
    position: 1,
    currentSegment: 0,
    racePhase: "racing",
    crashRemaining: 0,
    crashSpin: 0,
    crashDir: 0,
    ...overrides
  };
}

describe("Out Run crash tumble", () => {
  it("detects active crash from remaining time", () => {
    expect(isOutrunCrashing(makeState())).toBe(false);
    expect(isOutrunCrashing(makeState({ crashRemaining: 1.2 }))).toBe(true);
  });

  it("uses crashSpin as tilt while tumbling", () => {
    const spinning = computePlayerCarGeometry(
      makeState({ crashRemaining: 1, crashSpin: 2.5 }),
      DEFAULT_OUTRUN_CONFIG
    );
    expect(spinning.isCrashing).toBe(true);
    expect(spinning.tiltAngle).toBe(2.5);

    const normal = computePlayerCarGeometry(
      makeState({ playerX: 0.5, speed: DEFAULT_OUTRUN_CONFIG.maxSpeed }),
      DEFAULT_OUTRUN_CONFIG
    );
    expect(normal.isCrashing).toBe(false);
    expect(Math.abs(normal.tiltAngle)).toBeLessThan(1);
  });

  it("bleeds speed and clears crash when the timer expires", () => {
    const config = {
      ...DEFAULT_OUTRUN_CONFIG,
      crashDurationSeconds: 1.0,
      crashSpinRadiansPerSecond: Math.PI * 2,
      crashDecel: 5000
    };
    let state = makeState({
      crashRemaining: 0.2,
      crashSpin: 0,
      crashDir: 1,
      speed: 4000
    });

    const elapsed = 0.25;
    const remaining = Math.max(0, (state.crashRemaining ?? 0) - elapsed);
    state = {
      ...state,
      crashSpin: (state.crashSpin ?? 0) + config.crashSpinRadiansPerSecond * elapsed,
      speed: Math.max(0, state.speed - config.crashDecel * elapsed),
      crashRemaining: remaining
    };
    if (remaining <= 0.001) {
      state = { ...state, crashRemaining: 0, crashDir: 0 };
    }

    expect(state.crashRemaining).toBe(0);
    expect(state.crashSpin).toBeCloseTo(Math.PI * 2 * 0.25, 5);
    expect(state.speed).toBeLessThan(4000);
  });
});
