import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunHurtSystem } from "../hurt/HitRunHurtSystem";
import { registerHitRunStateMachines } from "../ai/hitRunStateMachines";

function simulateEnemyKnockback(
  deltaTime: number,
  frames: number
): number {
  const world = new World<CoreComponentRegistry>();
  const enemy = world.createEntity();
  world.addComponent(enemy, {
    type: "Enemy",
    kind: "charger"
  } as never);
  world.addComponent(enemy, {
    type: "Velocity",
    vx: 260,
    vy: 0,
    angularVelocity: 0
  });
  world.addComponent(enemy, {
    type: "HitReaction",
    hitstunRemaining: 2,
    staggerRemaining: 2,
    blinkElapsed: 0
  });

  const hurt = new HitRunHurtSystem();
  for (let i = 0; i < frames; i++) {
    hurt.update(world, deltaTime);
  }

  return (world.getComponent(enemy, "Velocity") as { vx: number }).vx;
}

describe("Hit & Run hit reaction integration", () => {
  it("keeps enemy knockback damping consistent across 30 Hz and 60 Hz updates", () => {
    const at30Hz = simulateEnemyKnockback(1 / 30, 30);
    const at60Hz = simulateEnemyKnockback(1 / 60, 60);

    expect(at30Hz).toBeCloseTo(at60Hz, 8);
    // The legacy response was 0.85 retention per 60 Hz simulation tick.
    expect(at60Hz).toBeCloseTo(260 * Math.pow(0.85, 60), 6);
  });

  it("does not let a staggered charger FSM overwrite the knockback impulse", () => {
    const world = new World<CoreComponentRegistry>();
    registerHitRunStateMachines(world);

    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Enemy",
      kind: "charger"
    } as never);
    world.addComponent(enemy, {
      type: "Velocity",
      vx: -73,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(enemy, {
      type: "HitReaction",
      hitstunRemaining: 0.2,
      staggerRemaining: 0.3,
      blinkElapsed: 0
    });

    const registry = world.getResource<
      Record<
        string,
        {
          states: Record<
            string,
            {
              onUpdate?: (
                w: World<CoreComponentRegistry>,
                e: number,
                data: Record<string, unknown>,
                elapsed: number
              ) => string | void;
            }
          >;
        }
      >
    >("StateMachineRegistry");
    const chargeUpdate = registry?.hr_charge?.states.Charge?.onUpdate;

    expect(chargeUpdate).toBeDefined();
    chargeUpdate?.(world, enemy, { chargeDir: 1 }, 1 / 60);

    expect(
      (world.getComponent(enemy, "Velocity") as { vx: number }).vx
    ).toBe(-73);
  });

  it("resumes the charger FSM after the impact lock expires", () => {
    const world = new World<CoreComponentRegistry>();
    registerHitRunStateMachines(world);

    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Enemy",
      kind: "charger"
    } as never);
    world.addComponent(enemy, {
      type: "Transform",
      x: 100,
      y: 400,
      worldX: 100,
      worldY: 400,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(enemy, {
      type: "Velocity",
      vx: -73,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(enemy, {
      type: "HitReaction",
      hitstunRemaining: 0.2,
      staggerRemaining: 0.3,
      blinkElapsed: 0
    });

    const registry = world.getResource<
      Record<
        string,
        {
          states: Record<
            string,
            {
              onUpdate?: (
                w: World<CoreComponentRegistry>,
                e: number,
                data: Record<string, unknown>,
                elapsed: number
              ) => string | void;
            }
          >;
        }
      >
    >("StateMachineRegistry");
    const chargeUpdate = registry?.hr_charge?.states.Charge?.onUpdate;
    expect(chargeUpdate).toBeDefined();

    const data: Record<string, unknown> = { chargeDir: 1 };
    chargeUpdate?.(world, enemy, data, 0.1);
    expect(
      (world.getComponent(enemy, "Velocity") as { vx: number }).vx
    ).toBe(-73);

    world.removeComponent(enemy, "HitReaction");
    chargeUpdate?.(world, enemy, data, 0.2);

    expect(
      (world.getComponent(enemy, "Velocity") as { vx: number }).vx
    ).toBeGreaterThan(0);
  });
});
