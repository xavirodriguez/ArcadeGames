import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunFeedbackSystem, isSimulationFrozen } from "../HitRunFeedbackSystem";
import {
  HIT_STOP_NORMAL_SECONDS,
  HIT_STOP_KILL_SECONDS,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG
} from "../HitRunFeedbackTypes";

describe("HitRunFeedbackSystem (Paso B)", () => {
  let world: World<CoreComponentRegistry>;
  let feedback: HitRunFeedbackSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.setResource("HitStopRemaining", 0);
    world.setResource("HitRunScreenShake", {
      intensity: 0,
      duration: 0,
      elapsed: 0
    });
    feedback = new HitRunFeedbackSystem({ ...DEFAULT_HIT_RUN_FEEDBACK_CONFIG });
  });

  it("applies hit-stop on combat:hit and decays to zero", () => {
    feedback.enqueueHitForTest({
      targetEntity: 1,
      sourceEntity: 2,
      amount: 1,
      remainingHealth: 5,
      category: "melee"
    });

    feedback.update(world, 0);
    const afterHit = world.getResource<number>("HitStopRemaining") ?? 0;
    expect(afterHit).toBeGreaterThan(0);
    expect(afterHit).toBeCloseTo(HIT_STOP_NORMAL_SECONDS, 5);
    expect(isSimulationFrozen(world)).toBe(true);

    // Decay in steps
    const step = HIT_STOP_NORMAL_SECONDS / 3;
    feedback.update(world, step);
    const mid = world.getResource<number>("HitStopRemaining") ?? 0;
    expect(mid).toBeLessThan(afterHit);
    expect(mid).toBeGreaterThan(0);

    feedback.update(world, HIT_STOP_NORMAL_SECONDS);
    const end = world.getResource<number>("HitStopRemaining") ?? 0;
    expect(end).toBe(0);
    expect(isSimulationFrozen(world)).toBe(false);
  });

  it("uses longer hit-stop on combat:death than a normal hit", () => {
    feedback.enqueueDeathForTest({
      entity: 1,
      sourceEntity: 2,
      category: "melee"
    });
    feedback.update(world, 0);
    const killStop = world.getResource<number>("HitStopRemaining") ?? 0;
    expect(killStop).toBeCloseTo(HIT_STOP_KILL_SECONDS, 5);
    expect(killStop).toBeGreaterThan(HIT_STOP_NORMAL_SECONDS);
  });

  it("does not apply screen shake resource when isReSimulating", () => {
    world.isReSimulating = true;
    feedback.enqueueHitForTest({
      targetEntity: 1,
      amount: 1,
      remainingHealth: 1,
      category: "melee"
    });
    feedback.update(world, 0);

    // Hit-stop still applies (sim pacing)
    expect(world.getResource<number>("HitStopRemaining") ?? 0).toBeGreaterThan(0);

    const shake = world.getResource<{ intensity: number }>("HitRunScreenShake");
    expect(shake?.intensity ?? 0).toBe(0);
  });

  it("writes HitRunScreenShake when not re-simulating", () => {
    world.isReSimulating = false;
    feedback.enqueueHitForTest({
      targetEntity: 1,
      amount: 1,
      remainingHealth: 1,
      category: "melee"
    });
    feedback.update(world, 0);

    const shake = world.getResource<{ intensity: number; duration: number }>(
      "HitRunScreenShake"
    );
    expect(shake?.intensity ?? 0).toBeGreaterThan(0);
    expect(shake?.duration ?? 0).toBeGreaterThan(0);
  });
});
