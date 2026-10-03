import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunMeleeSystem, createMeleeAttackComponent } from "../HitRunMeleeSystem";
import {
  DEFAULT_MELEE_ATTACK_CONFIG,
  type MeleeAttackComponent
} from "../MeleeAttackTypes";
import { registerHitRunMelee } from "../registerHitRunMelee";

function addTransform(world: World<CoreComponentRegistry>, e: number, x: number, y: number): void {
  world.addComponent(e, {
    type: "Transform",
    x,
    y,
    worldX: x,
    worldY: y,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
}

describe("HitRunMeleeSystem (Paso A)", () => {
  let world: World<CoreComponentRegistry>;
  let system: HitRunMeleeSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.setResource("IsPaused", false);
    world.setResource("HitStopRemaining", 0);
    system = registerHitRunMelee(world, { ...DEFAULT_MELEE_ATTACK_CONFIG });
  });

  function spawnPlayer(): number {
    const p = world.createEntity();
    addTransform(world, p, 100, 100);
    world.addComponent(p, createMeleeAttackComponent());
    world.addComponent(p, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false
    });
    return p;
  }

  it("does not create hitbox during startup; creates only in active", () => {
    const p = spawnPlayer();
    const input = world.getMutableComponent(p, "PlatformerInput") as
      | (CoreComponentRegistry["PlatformerInput"] & { attackPressed?: boolean })
      | undefined;
    if (input) input.attackPressed = true;

    // Start swing → startup
    system.update(world, 0.016);
    let melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.phase).toBe("startup");
    expect(melee.hitboxEntity).toBe(-1);

    // Advance past startup
    const startup = DEFAULT_MELEE_ATTACK_CONFIG.startupSeconds;
    system.update(world, startup + 0.001);
    melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.phase).toBe("active");
    expect(melee.hitboxEntity).toBeGreaterThanOrEqual(0);
    expect(world.hasEntity(melee.hitboxEntity)).toBe(true);
  });

  it("destroys hitbox when leaving active (recovery)", () => {
    const p = spawnPlayer();
    const input = world.getMutableComponent(p, "PlatformerInput") as
      | (CoreComponentRegistry["PlatformerInput"] & { attackPressed?: boolean })
      | undefined;
    if (input) input.attackPressed = true;
    system.update(world, 0.016);

    const startup = DEFAULT_MELEE_ATTACK_CONFIG.startupSeconds;
    const active = DEFAULT_MELEE_ATTACK_CONFIG.activeSeconds;
    system.update(world, startup + 0.001);
    let melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    const hitboxId = melee.hitboxEntity;
    expect(hitboxId).toBeGreaterThanOrEqual(0);

    system.update(world, active + 0.001);
    world.flush();

    melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.phase).toBe("recovery");
    expect(melee.hitboxEntity).toBe(-1);
  });

  it("blocks a new attack during recovery", () => {
    const p = spawnPlayer();
    const input = world.getMutableComponent(p, "PlatformerInput") as
      | (CoreComponentRegistry["PlatformerInput"] & { attackPressed?: boolean })
      | undefined;
    if (input) input.attackPressed = true;
    system.update(world, 0.016);
    system.update(world, DEFAULT_MELEE_ATTACK_CONFIG.startupSeconds + 0.001);
    system.update(world, DEFAULT_MELEE_ATTACK_CONFIG.activeSeconds + 0.001);

    let melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.phase).toBe("recovery");

    const inputMut = world.getMutableComponent(p, "PlatformerInput") as
      | (CoreComponentRegistry["PlatformerInput"] & { attackPressed?: boolean })
      | undefined;
    if (inputMut) inputMut.attackPressed = true;
    system.update(world, 0.016);
    melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.phase).toBe("recovery");
  });

  it("records each enemy at most once per swing (hitEntityIds)", () => {
    const p = spawnPlayer();
    const input = world.getMutableComponent(p, "PlatformerInput") as
      | (CoreComponentRegistry["PlatformerInput"] & { attackPressed?: boolean })
      | undefined;
    if (input) input.attackPressed = true;
    system.update(world, 0.016);
    system.update(world, DEFAULT_MELEE_ATTACK_CONFIG.startupSeconds + 0.001);

    const meleeMut = world.getMutableComponent(p, "MeleeAttack") as MeleeAttackComponent;
    const hitbox = meleeMut.hitboxEntity;
    expect(hitbox).toBeGreaterThanOrEqual(0);

    const enemy = world.createEntity();
    addTransform(world, enemy, 122, 100);
    world.addComponent(enemy, {
      type: "Health",
      current: 10,
      max: 10
    });
    world.addComponent(enemy, {
      type: "Faction",
      value: "enemy"
    });
    world.addComponent(enemy, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });

    // Simulate collision overlap on hitbox
    const col = world.getMutableComponent(hitbox, "CollisionEvents") as {
      triggersEntered: number[];
      activeTriggers: number[];
      collisions: Array<{ otherEntity: number }>;
    };
    col.triggersEntered = [enemy];
    col.activeTriggers = [enemy];

    system.update(world, 0.016);
    let melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.hitCount).toBe(1);
    expect(melee.hitEntityIds[0]).toBe(enemy);

    const health = world.getComponent(enemy, "Health") as { current: number };
    const afterFirst = health.current;

    // Same enemy still overlapping — should not damage again
    system.update(world, 0.016);
    melee = world.getComponent(p, "MeleeAttack") as MeleeAttackComponent;
    expect(melee.hitCount).toBe(1);
    const health2 = world.getComponent(enemy, "Health") as { current: number };
    expect(health2.current).toBe(afterFirst);
  });
});
