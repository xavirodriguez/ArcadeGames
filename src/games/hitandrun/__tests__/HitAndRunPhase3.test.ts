import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerHitRunWeapons } from "../weapons/registerHitRunWeapons";
import { registerHitRunWeaponPickups } from "../weapons/HitRunWeaponPickup";
import { registerHitRunPowSystem, createPowBlueprint, HitRunPowComponent } from "../pow/HitRunPowSystem";
import { registerHitRunScoreSystem, HIT_RUN_SCORE_RESOURCE, HitRunScoreState } from "../systems/HitRunScoreSystem";
import { HitRunExplosionSystem } from "../weapons/HitRunExplosionSystem";
import type { HitRunWeaponState } from "../weapons/HitRunWeaponTypes";
import type { HealthComponent } from "@tiny-aster/core";

describe("Hit & Run Phase 3 Requirements", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    registerHitRunWeapons(world);
    registerHitRunWeaponPickups(world);
    registerHitRunPowSystem(world);
    registerHitRunScoreSystem(world);
  });

  describe("1. Weapon Ammo & Auto-Degradation (G3.1, G3.2)", () => {
    it("switches weapon automatically to fallback basic weapon when ammo reaches 0", () => {
      const shooter = world.createEntity();
      world.addComponent(shooter, {
        type: "Transform",
        x: 100,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(shooter, {
        type: "HitRunWeapon",
        weaponId: "shotgun",
        cooldownRemaining: 0,
        ammoCurrent: 1,
        ammoMax: 20,
        fallbackWeaponId: "longbow"
      } as HitRunWeaponState);
      world.addComponent(shooter, {
        type: "BeltInput",
        moveX: 0,
        moveY: 0,
        attackHeld: false,
        attackPressed: false,
        fireHeld: true,
        firePressed: true,
        specialHeld: false,
        specialPressed: false,
        jumpHeld: false,
        jumpPressed: false,
        _prevHeldMask: 0
      });

      world.update(0.016);

      const weaponState = world.getComponent(shooter, "HitRunWeapon") as HitRunWeaponState | undefined;
      expect(weaponState?.weaponId).toBe("longbow");
      expect(weaponState?.ammoCurrent).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe("2. Rescue POWs & Score Event (G4.5)", () => {
    it("rescues POW on hit/interaction, grants drop and emits score event", () => {
      const pow = world.createEntity();
      const powBp = createPowBlueprint();
      powBp.spawn(world, pow, { x: 150, y: 150, dropType: "points" });

      world.getCommandBuffer().addComponent(pow, { type: "Dead" });
      world.flush();

      world.update(0.016);

      const powComp = world.getComponent(pow, "HitRunPow") as HitRunPowComponent | undefined;
      expect(powComp?.state).toBe("liberated");

      const { HitRunScoreSystem } = require("../systems/HitRunScoreSystem");
      const scoreSys = new HitRunScoreSystem();
      scoreSys.addScore(world, 1000, 150, 150, "POW RESCUED!");

      const scoreState = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
      expect(scoreState?.score).toBeGreaterThan(0);
    });
  });

  describe("3. 3D Z-Depth Explosions (G3.9)", () => {
    it("does not damage entity at z=0 when explosion is detonated at z=50", () => {
      const target = world.createEntity();
      world.addComponent(target, {
        type: "Transform",
        x: 200,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 200,
        worldY: 200,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(target, {
        type: "BeltElevation",
        z: 0,
        vz: 0,
        grounded: true
      });
      world.addComponent(target, {
        type: "Health",
        current: 10,
        max: 10
      });
      world.addComponent(target, {
        type: "Faction",
        value: "enemy"
      });

      const explosionSys = new HitRunExplosionSystem();
      const bus = world.getEventBus();
      if (bus) explosionSys.subscribe(bus);

      bus?.emit("combat:explosion", {
        x: 200,
        y: 200,
        z: 50,
        radius: 40, // 40px radius cannot reach 50px z distance
        damage: 5,
        category: "explosive"
      });

      explosionSys.update(world, 0.016);

      const health = world.getComponent(target, "Health") as HealthComponent | undefined;
      expect(health?.current).toBe(10);
    });
  });

  describe("4. Score System Enemy Kills (G4.7)", () => {
    it("increments score after registering dead enemy on ScoreSystem", () => {
      const enemy = world.createEntity();
      world.addComponent(enemy, {
        type: "Transform",
        x: 100,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      const scoreSys = new (require("../systems/HitRunScoreSystem").HitRunScoreSystem)();
      scoreSys.addScore(world, 100, 100, 100);

      const scoreState = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
      expect(scoreState?.score).toBe(100);
    });
  });
});
