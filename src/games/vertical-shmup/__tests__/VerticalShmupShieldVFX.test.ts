import { EventBus, World } from "@tiny-aster/core";
import { CombatSystem, DamageComponent, FactionComponent } from "@tiny-aster/gameplay-kit";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupCollisionSystem } from "../systems/ShmupCollisionSystem";

describe("Vertical Shmup explicit shield VFX", () => {
  it("absorbs a lethal hit, emits the shield pulse, and recharges independently", () => {
    const world = new World<ShmupComponentRegistry, ShmupEventRegistry>();
    const eventBus = new EventBus<ShmupEventRegistry>();
    world.setResource("EventBus", eventBus);

    const attacker = world.createEntity();
    world.addComponent(attacker, { type: "Transform", x: 20, y: 20, rotation: 0, scaleX: 1, scaleY: 1, worldX: 20, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: true });
    world.addComponent(attacker, { type: "Damage", amount: 3, category: "enemy_bullet", friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);
    world.addComponent(attacker, { type: "Faction", faction: "enemy", value: "enemy" } as FactionComponent);
    world.addComponent(attacker, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] });

    const player = world.createEntity();
    world.addComponent(player, { type: "Transform", x: 30, y: 30, rotation: 0, scaleX: 1, scaleY: 1, worldX: 30, worldY: 30, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: true });
    world.addComponent(player, { type: "ShmupPlayer" });
    world.addComponent(player, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });
    world.addComponent(player, { type: "Shield", charges: 1, maxCharges: 1, rechargeRemaining: 0, rechargeSeconds: 6 });
    world.addComponent(player, { type: "Faction", faction: "player", value: "player" } as FactionComponent);
    world.addComponent(player, { type: "CollisionEvents", collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }], activeTriggers: [], triggersEntered: [], triggersExited: [] });
    world.getComponent(attacker, "CollisionEvents")?.collisions.push({ otherEntity: player, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });

    const feedback = new ShmupCollisionSystem();
    feedback.update(world, 0);
    new CombatSystem<ShmupComponentRegistry, ShmupEventRegistry>().update(world, 1 / 60);
    eventBus.flushDeferred();

    expect(world.getComponent(player, "Health")?.current).toBe(3);
    expect(world.getComponent(player, "Shield")?.charges).toBe(0);
    expect(world.getComponent(player, "Shield")?.rechargeRemaining).toBe(6);
    expect(world.hasComponent(player, "Dead")).toBe(false);
    expect(world.query("Render", "TTL").some((entity) => world.getComponent(entity, "Render")?.shape === "pixelfx_shield_pulse")).toBe(true);

    feedback.update(world, 6);
    expect(world.getComponent(player, "Shield")?.charges).toBe(1);
    expect(world.getComponent(player, "Shield")?.rechargeRemaining).toBe(0);
  });
});