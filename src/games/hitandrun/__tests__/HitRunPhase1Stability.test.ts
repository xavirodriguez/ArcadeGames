import { EventBus, World, CoreComponentRegistry } from "@tiny-aster/core";
import { createBeltInputComponent, createBeltMovementComponent, BELT_MOVEMENT_CONFIG_RESOURCE, DEFAULT_BELT_MOVEMENT_CONFIG } from "../belt/BeltMovementTypes";
import { BeltMovementSystem } from "../belt/BeltMovementSystem";
import { HitRunStaggerSystem } from "../hurt/HitRunStaggerSystem";
import { HitRunOrphanEnemyCleanupSystem } from "../systems/HitRunOrphanEnemyCleanupSystem";
import { registerHitRunDeathFlow, DEATH_FLOW_RESOURCE, type HitRunDeathFlowState } from "../systems/HitRunDeathFlowSystem";
import { registerHitRunScoreSystem, HIT_RUN_SCORE_RESOURCE, type HitRunScoreState } from "../systems/HitRunScoreSystem";

describe("Hit & Run phase 1 gameplay stability", () => {
  it("keeps valid enemies alive after the spawn script has ended", () => {
    const world = new World<CoreComponentRegistry>();
    const enemy = world.createEntity();
    world.addComponent(enemy, { type: "Health", current: 3, max: 3 });
    world.addComponent(enemy, { type: "Enemy", kind: "patrol" });
    world.addComponent(enemy, { type: "Faction", value: "enemy" });
    world.addComponent(enemy, { type: "Render", shape: "popcorn", size: 24, color: "#fff", visible: true, opacity: 1, order: 1, rotation: 0, angularVelocity: 0 } as never);
    world.addComponent(enemy, { type: "Collider2D", shape: { type: "aabb", halfWidth: 8, halfHeight: 8 }, layer: 1, mask: 0xffff, enabled: true, isTrigger: false } as never);
    world.addComponent(enemy, { type: "Hurtbox" } as never);

    new HitRunOrphanEnemyCleanupSystem().update(world, 10);

    expect(world.hasComponent(enemy, "Dead")).toBe(false);
    expect((world.getComponent(enemy, "Health") as { current: number }).current).toBe(3);
  });

  it("removes an enemy that has no collider without awarding a combat death", () => {
    const world = new World<CoreComponentRegistry>();
    const enemy = world.createEntity();
    world.addComponent(enemy, { type: "Health", current: 3, max: 3 });
    world.addComponent(enemy, { type: "Enemy", kind: "patrol" });
    world.addComponent(enemy, { type: "Faction", value: "enemy" });
    world.addComponent(enemy, { type: "Render", size: 24, visible: true });
    world.addComponent(enemy, { type: "Hurtbox" });

    new HitRunOrphanEnemyCleanupSystem().update(world, 0.016);
    world.flush();

    expect(world.hasComponent(enemy, "Dead")).toBe(true);
  });

  it("does not steer the player while hitstunned and preserves physical velocity", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(BELT_MOVEMENT_CONFIG_RESOURCE, { ...DEFAULT_BELT_MOVEMENT_CONFIG });
    const player = world.createEntity();
    world.addComponent(player, { type: "Transform", x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 400, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(player, { type: "Velocity", vx: 180, vy: 35, angularVelocity: 0 });
    world.addComponent(player, createBeltInputComponent());
    world.addComponent(player, createBeltMovementComponent());
    world.addComponent(player, { type: "HitReaction", hitstunRemaining: 0.4, staggerRemaining: 0, blinkElapsed: 0 });
    world.mutateComponent(player, "BeltInput", input => { input.moveX = -1; input.moveY = -1; });

    new BeltMovementSystem().update(world, 1 / 60);

    const velocity = world.getComponent(player, "Velocity") as { vx: number; vy: number };
    expect(velocity.vx).toBe(180);
    expect(velocity.vy).toBe(35);
  });

  it("does not erase enemy knockback while stagger is active", () => {
    const world = new World<CoreComponentRegistry>();
    const enemy = world.createEntity();
    world.addComponent(enemy, { type: "Enemy", kind: "patrol" });
    world.addComponent(enemy, { type: "Velocity", vx: -260, vy: 0, angularVelocity: 0 });
    world.addComponent(enemy, { type: "HitReaction", hitstunRemaining: 0.2, staggerRemaining: 0.3, blinkElapsed: 0 });

    new HitRunStaggerSystem().update(world, 1 / 60);

    expect((world.getComponent(enemy, "Velocity") as { vx: number }).vx).toBe(-260);
  });

  it("bridges lethal player combat events into the death recovery flow", () => {
    const world = new World<CoreComponentRegistry>();
    const bus = new EventBus();
    world.setResource("EventBus", bus);
    const player = world.createEntity();
    world.addComponent(player, createBeltInputComponent());
    world.addComponent(player, { type: "Faction", value: "player" });

    const deathFlow = registerHitRunDeathFlow(world);
    bus.emitDeferred("combat:death", { entity: player, category: "enemy_melee" });
    bus.flushDeferred();
    deathFlow.update(world, 1 / 60);

    const state = world.getResource<HitRunDeathFlowState>(DEATH_FLOW_RESOURCE);
    expect(state?.active).toBe(true);
    expect(state?.remaining).toBeGreaterThan(0);
  });

  it("does not award score or combo for a player death", () => {
    const world = new World<CoreComponentRegistry>();
    const bus = new EventBus();
    world.setResource("EventBus", bus);
    const player = world.createEntity();
    world.addComponent(player, createBeltInputComponent());
    world.addComponent(player, { type: "Faction", value: "player" });
    registerHitRunScoreSystem(world);

    bus.emitDeferred("combat:death", { entity: player, category: "enemy_melee" });
    bus.flushDeferred();

    const score = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
    expect(score?.score).toBe(0);
    expect(score?.comboHits).toBe(0);
  });
});
