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

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
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

  it("spawns the procedural ink burst at a lethal target", () => {
    const victim = world.createEntity();
    world.addComponent(victim, {
      type: "Transform",
      x: 40,
      y: 60,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 40,
      worldY: 60,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(victim, {
      type: "Render",
      shape: "enemy",
      size: 24,
      color: "#ffffff",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    feedback.enqueueDeathForTest({ entity: victim, category: "melee" });
    feedback.update(world, 0);

    const effects = world.query("Render", "TTL");
    expect(effects.some((entity) => world.getComponent(entity, "Render")?.shape === "pixelfx_ink_burst")).toBe(true);
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

    // Hit-stop still applies via GameplayFreeze
    expect(getGameplayFreezeRemaining(world) ?? 0).toBeGreaterThan(0);

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
  it("spawns combat break and finisher VFX only for their semantic hit transitions", () => {
    const guardTarget = world.createEntity();
    const armorTarget = world.createEntity();
    const lethalTarget = world.createEntity();
    for (const [entity, x] of [[guardTarget, 20], [armorTarget, 60], [lethalTarget, 100]] as const) {
      world.addComponent(entity, {
        type: "Transform",
        x,
        y: 40,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: x,
        worldY: 40,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
    }

    feedback.enqueueHitForTest({
      targetEntity: guardTarget,
      amount: 1,
      remainingHealth: 4,
      category: "guard-break"
    });
    feedback.enqueueHitForTest({
      targetEntity: armorTarget,
      amount: 2,
      remainingHealth: 3,
      category: "armor-break"
    });
    feedback.enqueueHitForTest({
      targetEntity: lethalTarget,
      amount: 2,
      remainingHealth: 0,
      category: "melee"
    });

    feedback.update(world, 0);

    const effects = world.query("Render", "TTL");
    const shapes = effects.map((entity) =>
      (world.getComponent(entity, "Render") as { shape?: string } | undefined)?.shape
    );
    expect(shapes).toContain("pixelfx_guard_break");
    expect(shapes).toContain("pixelfx_armor_break");
    expect(shapes).toContain("pixelfx_combo_finisher");
    expect(shapes.filter((shape) => shape === "pixelfx_combo_finisher")).toHaveLength(1);
  });

  it("distinguishes armor contact and guard recovery feedback", () => {
    const armorTarget = world.createEntity();
    const guardTarget = world.createEntity();
    for (const [entity, x] of [[armorTarget, 30], [guardTarget, 70]] as const) {
      world.addComponent(entity, {
        type: "Transform",
        x,
        y: 40,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: x,
        worldY: 40,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
    }

    feedback.enqueueHitForTest({
      targetEntity: armorTarget,
      amount: 0,
      remainingHealth: 5,
      category: "bullet",
      armorHit: true,
      armorAbsorbed: 2
    });
    feedback.enqueueHitForTest({
      targetEntity: guardTarget,
      amount: 0,
      remainingHealth: 5,
      category: "guard-recovered",
      guardRecovered: true
    });
    feedback.update(world, 0);

    const shapes = world.query("Render", "TTL").map((entity) =>
      (world.getComponent(entity, "Render") as { shape?: string }).shape
    );
    expect(shapes).toContain("pixelfx_ricochet");
    expect(shapes).toContain("pixelfx_shield_pulse");
  });

  it("does not spawn a combo finisher for a non-lethal melee hit", () => {
    const target = world.createEntity();
    world.addComponent(target, {
      type: "Transform",
      x: 40,
      y: 60,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 40,
      worldY: 60,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    feedback.enqueueHitForTest({
      targetEntity: target,
      amount: 1,
      remainingHealth: 2,
      category: "melee"
    });
    feedback.update(world, 0);

    const effects = world.query("Render", "TTL");
    expect(effects.some((entity) =>
      (world.getComponent(entity, "Render") as { shape?: string } | undefined)?.shape === "pixelfx_combo_finisher"
    )).toBe(false);
  });

  it("receives a lethal melee hit through the combat event bus", () => {
    const target = world.createEntity();
    world.addComponent(target, {
      type: "Transform",
      x: 72,
      y: 48,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 72,
      worldY: 48,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    const bus = world.getEventBus();
    expect(bus).toBeDefined();
    if (!bus) return;
    feedback.subscribe(bus);
    bus.emit("combat:hit", {
      targetEntity: target,
      amount: 2,
      remainingHealth: 0,
      category: "melee"
    });

    feedback.update(world, 0);

    const effects = world.query("Render", "TTL");
    expect(effects.some((entity) =>
      (world.getComponent(entity, "Render") as { shape?: string } | undefined)?.shape === "pixelfx_combo_finisher"
    )).toBe(true);
  });

});
