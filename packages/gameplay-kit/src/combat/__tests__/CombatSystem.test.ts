import { World, SystemPhase, EventBus, CoreComponentRegistry, CoreEvents, TransformComponent, HealthComponent, CollisionEventsComponent } from "@tiny-aster/core";
import { CombatSystem } from "../systems/CombatSystem";
import { CombatHitEvent, CombatDeathEvent } from "../types/CombatTypes";
import { DamageComponent, FactionComponent } from "../../index";

interface TestCombatComponentRegistry extends CoreComponentRegistry {
  Damage: DamageComponent;
  Faction: FactionComponent;
}

interface TestCombatEventRegistry extends CoreEvents, Record<string, unknown> {
  "combat:hit": CombatHitEvent;
  "combat:death": CombatDeathEvent;
}

describe("CombatSystem", () => {
  let world: World<TestCombatComponentRegistry, TestCombatEventRegistry>;
  let combatSystem: CombatSystem<TestCombatComponentRegistry, TestCombatEventRegistry>;

  beforeEach(() => {
    world = new World<TestCombatComponentRegistry, TestCombatEventRegistry>();
    const eventBus = new EventBus<TestCombatEventRegistry>();
    world.setResource("EventBus", eventBus);
    combatSystem = new CombatSystem();
    world.addSystem(combatSystem, { phase: SystemPhase.Collision });
  });

  it("should apply basic damage and emit combat:hit", () => {
    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attacker, { type: "Damage", amount: 10, category: "laser", friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);

    world.addComponent(target, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(target, { type: "Health", current: 50, max: 50 } as HealthComponent);

    // Add CollisionEvents
    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    let hitEventEmitted = false;
    world.getEventBus()?.on("combat:hit", (payload: CombatHitEvent) => {
      expect(payload.targetEntity).toBe(target);
      expect(payload.sourceEntity).toBe(attacker);
      expect(payload.amount).toBe(10);
      expect(payload.remainingHealth).toBe(40);
      expect(payload.category).toBe("laser");
      hitEventEmitted = true;
    });

    world.update(0.016);
    world.getEventBus()?.flushDeferred();

    const health = world.getComponent(target, "Health");
    expect(health?.current).toBe(40);
    expect(hitEventEmitted).toBe(true);
  });

  it("should reach exactly zero health and emit combat:death", () => {
    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attacker, { type: "Damage", amount: 50, friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);

    world.addComponent(target, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(target, { type: "Health", current: 50, max: 50 } as HealthComponent);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    let deathEmitted = false;
    world.getEventBus()?.on("combat:death", (payload: CombatDeathEvent) => {
      expect(payload.entity).toBe(target);
      expect(payload.sourceEntity).toBe(attacker);
      deathEmitted = true;
    });

    world.update(0.016);
    world.getEventBus()?.flushDeferred();

    const health = world.getComponent(target, "Health");
    expect(health?.current).toBe(0);
    expect(world.hasComponent(target, "Dead")).toBe(true);
    expect(deathEmitted).toBe(true);
  });

  it("should limit health to zero and handle damage exceeding remaining health", () => {
    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attacker, { type: "Damage", amount: 100, friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);

    world.addComponent(target, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(target, { type: "Health", current: 15, max: 50 } as HealthComponent);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    world.update(0.016);

    const health = world.getComponent(target, "Health");
    expect(health?.current).toBe(0);
    expect(world.hasComponent(target, "Dead")).toBe(true);
  });

  it("should respect active invulnerability", () => {
    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attacker, { type: "Damage", amount: 20, friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);

    world.addComponent(target, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(target, { type: "Health", current: 50, max: 50, invulnerableRemaining: 1.5 } as HealthComponent);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    world.update(0.016);

    const health = world.getComponent(target, "Health");
    expect(health?.current).toBe(50); // No damage applied!
  });

  it("should prevent friendly fire by default and allow if friendlyFire is true", () => {
    // Case A: Friendly fire disabled (default)
    const attackerA = world.createEntity();
    const targetA = world.createEntity();

    world.addComponent(attackerA, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attackerA, { type: "Damage", amount: 10, friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);
    world.addComponent(attackerA, { type: "Faction", faction: "player", value: "player" } as FactionComponent);

    world.addComponent(targetA, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(targetA, { type: "Health", current: 50, max: 50 } as HealthComponent);
    world.addComponent(targetA, { type: "Faction", faction: "player", value: "player" } as FactionComponent);

    world.addComponent(attackerA, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: targetA, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(targetA, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attackerA, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    world.update(0.016);
    expect(world.getComponent(targetA, "Health")?.current).toBe(50); // No damage

    // Case B: Friendly fire explicitly enabled
    const attackerB = world.createEntity();
    const targetB = world.createEntity();

    world.addComponent(attackerB, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attackerB, { type: "Damage", amount: 10, friendlyFire: true, consumption: "destroy-entity" } as DamageComponent);
    world.addComponent(attackerB, { type: "Faction", faction: "player", value: "player" } as FactionComponent);

    world.addComponent(targetB, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(targetB, { type: "Health", current: 50, max: 50 } as HealthComponent);
    world.addComponent(targetB, { type: "Faction", faction: "player", value: "player" } as FactionComponent);

    world.addComponent(attackerB, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: targetB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(targetB, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attackerB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    world.update(0.016);
    expect(world.getComponent(targetB, "Health")?.current).toBe(40); // Damage applied!
  });

  it("should ignore targets without HealthComponent or attackers without DamageComponent", () => {
    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    // Attacker has NO Damage Component

    world.addComponent(target, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(target, { type: "Health", current: 50, max: 50 } as HealthComponent);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    world.update(0.016);
    expect(world.getComponent(target, "Health")?.current).toBe(50); // No change
  });

  it("should process unique pairs only once and support snapshot, restore & determinism", () => {
    const attacker = world.createEntity();
    const target = world.createEntity();

    world.addComponent(attacker, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(attacker, { type: "Damage", amount: 15, friendlyFire: false, consumption: "destroy-entity" } as DamageComponent);

    world.addComponent(target, { type: "Transform", x: 0, y: 0 } as TransformComponent);
    world.addComponent(target, { type: "Health", current: 50, max: 50 } as HealthComponent);

    world.addComponent(attacker, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: target, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);
    world.addComponent(target, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: attacker, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as CollisionEventsComponent);

    // Snapshot before impact
    const snapshot = world.snapshot();

    // Perform impact
    world.update(0.016);
    expect(world.getComponent(target, "Health")?.current).toBe(35);

    // Restore back to before impact
    world.restore(snapshot);
    expect(world.getComponent(target, "Health")?.current).toBe(50);

    // Run again and ensure exact same deterministic damage
    world.update(0.016);
    expect(world.getComponent(target, "Health")?.current).toBe(35);
  });
});
