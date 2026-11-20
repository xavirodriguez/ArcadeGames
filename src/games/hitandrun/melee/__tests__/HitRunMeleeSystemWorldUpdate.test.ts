import { World, CoreComponentRegistry, SystemPhase } from "@tiny-aster/core";
import { HitRunMeleeSystem, createMeleeAttackComponent } from "../HitRunMeleeSystem";
import { DEFAULT_MELEE_ATTACK_CONFIG } from "../MeleeAttackTypes";

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
    dirty: true
  });
}

describe("HitRunMeleeSystem inside World.update", () => {
  it("spawns the melee hitbox without mutating world structure directly", () => {
    const world = new World<CoreComponentRegistry>();
    const meleeSystem = new HitRunMeleeSystem();

    const player = world.createEntity();
    addTransform(world, player, 100, 100);
    world.addComponent(player, createMeleeAttackComponent());
    world.addComponent(player, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false
    });

    // Drive the melee system through the real schedule so `world.isUpdating` is true.
    world.addSystem(meleeSystem, { phase: SystemPhase.Simulation, priority: 30 });

    const input = world.getMutableComponent(player, "PlatformerInput") as
      | (CoreComponentRegistry["PlatformerInput"] & { attackPressed?: boolean })
      | undefined;
    if (input) input.attackPressed = true;

    const startup = DEFAULT_MELEE_ATTACK_CONFIG.startupSeconds;

    // The hitbox is spawned while the world is updating: the builder must defer
    // entity creation instead of calling world.createEntity() directly.
    expect(() => world.update(1 / 60)).not.toThrow();
    expect(() => world.update(startup + 0.001)).not.toThrow();

    const melee = world.getComponent(player, "MeleeAttack") as
      | { phase?: string; hitboxEntity?: number }
      | undefined;
    expect(melee?.phase).toBe("active");
    expect(melee?.hitboxEntity).toBeGreaterThanOrEqual(0);
    expect(world.hasEntity(melee?.hitboxEntity ?? -1)).toBe(true);
    expect(world.getComponent(melee?.hitboxEntity ?? -1, "Transform")).toBeDefined();
  });
});
