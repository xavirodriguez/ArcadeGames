import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerPowBlueprint } from "../registerPowBlueprint";
import { HitRunPowSystem } from "../HitRunPowSystem";
import type { HitRunWeaponState } from "../../weapons/HitRunWeaponTypes";

describe("POW (Prisoner of War) Mechanics (Phase 6)", () => {
  let world: World<CoreComponentRegistry>;
  let powSystem: HitRunPowSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.setResource("IsPaused", false);
    powSystem = new HitRunPowSystem();
    world.addSystem(powSystem);
  });

  it("spawns a POW hostage entity from blueprint and drops a weapon on rescue", () => {
    const powEntity = world.createEntity();

    world.addComponent(powEntity, {
      type: "Transform",
      x: 100,
      y: 100,
      worldX: 100,
      worldY: 100
    } as any);

    world.addComponent(powEntity, {
      type: "PowHostage",
      id: "pow_1",
      weaponDrop: "rocket",
      ammo: 15,
      rescued: false
    } as any);

    expect(world.hasComponent(powEntity, "PowHostage")).toBe(true);

    const player = world.createEntity();
    world.addComponent(player, { type: "PlatformerInput" } as any);

    world.addComponent(powEntity, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [player],
      triggersEntered: [],
      triggersExited: []
    } as any);

    powSystem.update(world, 0.016);
    world.flush();

    // POW should be removed and a weapon pickup spawned
    expect(world.hasEntity(powEntity)).toBe(false);

    const pickups = world.query("WeaponPickup");
    expect(pickups.length).toBe(1);

    const pickup = pickups[0];
    const pData = world.getComponent(pickup, "WeaponPickup") as unknown as { weaponId: string; ammo: number };
    expect(pData.weaponId).toBe("rocket");
    expect(pData.ammo).toBe(15);
  });
});
