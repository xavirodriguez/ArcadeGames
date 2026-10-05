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
      worldY: 100,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });

    world.addComponent(powEntity, {
      type: "PowHostage",
      weaponDrop: "rocket",
      ammo: 15,
      rescued: false
    } as unknown as CoreComponentRegistry[Extract<keyof CoreComponentRegistry, string>]);

    expect(world.hasComponent(powEntity, "PowHostage")).toBe(true);

    const player = world.createEntity();
    world.addComponent(player, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false,
      fireHeld: false,
      firePressed: false,
      attackPressed: false
    } as unknown as CoreComponentRegistry[Extract<keyof CoreComponentRegistry, string>]);

    world.addComponent(powEntity, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [player],
      triggersEntered: [],
      triggersExited: []
    });

    powSystem.update(world, 0.016);
    world.flush();

    // POW should be removed and a weapon pickup spawned
    expect(world.hasEntity(powEntity)).toBe(false);

    const pickups = world.query("WeaponPickup");
    expect(pickups.length).toBe(1);

    const pickup = pickups[0];
    const pData = world.getComponent(pickup, "WeaponPickup") as { weaponId: string; ammo: number } | undefined;
    expect(pData?.weaponId).toBe("rocket");
    expect(pData?.ammo).toBe(15);
  });
});
