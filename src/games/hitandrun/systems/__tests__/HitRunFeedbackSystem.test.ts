import { World, CoreComponentRegistry, getGameplayFreezeRemaining } from "@tiny-aster/core";
import { HitRunFeedbackSystem, isSimulationFrozen } from "../HitRunFeedbackSystem";
import {
  HIT_STOP_NORMAL_SECONDS,
  HIT_STOP_KILL_SECONDS,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG
} from "../HitRunFeedbackTypes";

describe("HitRunFeedbackSystem (Paso B)", () => {
  let world: World<CoreComponentRegistry>;
  let feedback: HitRunFeedbackSystem;

  let mainCam: number;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    mainCam = world.createEntity();
    world.addComponent(mainCam, {
      type: "Camera2D",
      isMain: true
    } as never);
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
    const afterHit = getGameplayFreezeRemaining(world) ?? 0;
    expect(afterHit).toBeGreaterThan(0);
    expect(afterHit).toBeCloseTo(HIT_STOP_NORMAL_SECONDS, 5);
    expect(isSimulationFrozen(world)).toBe(true);

    // Decay step in Schedule
    const freeze = world.getResource<{ remaining?: number }>("GameplayFreeze");
    if (freeze && typeof freeze.remaining === "number") {
      freeze.remaining = Math.max(0, freeze.remaining - HIT_STOP_NORMAL_SECONDS);
      if (freeze.remaining <= 0) {
        world.deleteResource("GameplayFreeze");
      }
    }
    expect(isSimulationFrozen(world)).toBe(false);
  });

  it("uses longer hit-stop on combat:death than a normal hit", () => {
    feedback.enqueueDeathForTest({
      entity: 1,
      sourceEntity: 2,
      category: "melee"
    });
    feedback.update(world, 0);
    const killStop = getGameplayFreezeRemaining(world) ?? 0;
    expect(killStop).toBeCloseTo(HIT_STOP_KILL_SECONDS, 5);
    expect(killStop).toBeGreaterThan(HIT_STOP_NORMAL_SECONDS);
  });

  it("does not apply screen shake component when isReSimulating", () => {
    world.isReSimulating = true;
    feedback.enqueueHitForTest({
      targetEntity: 1,
      amount: 1,
      remainingHealth: 1,
      category: "melee"
    });
    feedback.update(world, 0);
    world.flush();

    // Hit-stop still applies via GameplayFreeze
    expect(getGameplayFreezeRemaining(world) ?? 0).toBeGreaterThan(0);

    expect(world.hasComponent(mainCam, "ScreenShake")).toBe(false);
  });

  it("adds ScreenShake component on Camera2D when not re-simulating", () => {
    world.isReSimulating = false;
    feedback.enqueueHitForTest({
      targetEntity: 1,
      amount: 1,
      remainingHealth: 1,
      category: "melee"
    });
    feedback.update(world, 0);
    world.flush();

    const shake = world.getComponent(mainCam, "ScreenShake") as { intensity: number; duration: number } | undefined;
    expect(shake).toBeDefined();
    expect(shake?.intensity).toBeGreaterThan(0);
    expect(shake?.duration).toBeGreaterThan(0);
  });
});
