import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { getEnemyArchetype } from "../waves/HitRunEnemyArchetypes";
import { HitRunEnemyPool } from "../waves/HitRunEnemyPool";
import {
  SAMURAI_ANIMATIONS,
  SAMURAI_ASSET_KEY,
  SAMURAI_CELL_SIZE,
  SAMURAI_SPRITE_READY_RESOURCE,
  getSamuraiFrameRect
} from "../rendering/SamuraiVisualAssets";
import {
  SamuraiAnimationStateSystem,
  SamuraiSpriteFrameSystem
} from "../rendering/SamuraiAnimationSystems";

describe("Hit & Run samurai enemy", () => {
  it("registers a durable melee archetype and all five non-empty clips", () => {
    const archetype = getEnemyArchetype("samurai");

    expect(archetype).toMatchObject({
      id: "samurai",
      poolId: "enemy_samurai",
      faction: "enemy",
      shape: "samurai",
      health: 5
    });
    expect(archetype?.behaviorTags).toContain("walk");
    expect(Object.keys(SAMURAI_ANIMATIONS)).toEqual([
      "idle",
      "walk",
      "attack",
      "hurt",
      "death"
    ]);
    expect(SAMURAI_ANIMATIONS.idle).toMatchObject({ frames: expect.any(Array), loop: true });
    expect(SAMURAI_ANIMATIONS.idle.frames).toHaveLength(8);
    expect(SAMURAI_ANIMATIONS.walk).toMatchObject({ frames: expect.any(Array), loop: true });
    expect(SAMURAI_ANIMATIONS.walk.frames).toHaveLength(8);
    expect(SAMURAI_ANIMATIONS.attack).toMatchObject({ frames: expect.any(Array), loop: false });
    expect(SAMURAI_ANIMATIONS.attack.frames).toHaveLength(8);
    expect(SAMURAI_ANIMATIONS.hurt).toMatchObject({ frames: expect.any(Array), loop: false });
    expect(SAMURAI_ANIMATIONS.hurt.frames).toHaveLength(6);
    expect(SAMURAI_ANIMATIONS.death).toMatchObject({ frames: expect.any(Array), loop: false });
    expect(SAMURAI_ANIMATIONS.death.frames).toHaveLength(8);
    expect(SAMURAI_CELL_SIZE).toBe(64);
  });

  it("spawns the enemy with Sprite, Animator and the standard AI state machine", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(SAMURAI_SPRITE_READY_RESOURCE, true);

    const entity = new HitRunEnemyPool().acquireEnemy(world, {
      x: 480,
      y: 400,
      archetypeId: "samurai"
    });

    expect(world.getComponent(entity, "Render")?.shape).toBe("sprite");
    expect(world.getComponent(entity, "Sprite")).toMatchObject({
      type: "Sprite",
      assetKey: SAMURAI_ASSET_KEY,
      anchor: { x: 0.5, y: 0.94 },
      srcRect: { x: 0, y: 0, w: 64, h: 64 }
    });
    expect(world.getComponent(entity, "Animator")?.current).toBe("idle");
    expect(world.getComponent(entity, "StateMachine")?.machineId).toBe("hr_walk");
  });

  it("switches between idle, walk and telegraphed katana attack without changing the pivot", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(SAMURAI_SPRITE_READY_RESOURCE, true);
    const entity = new HitRunEnemyPool().acquireEnemy(world, {
      x: 480,
      y: 400,
      archetypeId: "samurai"
    });
    const stateSystem = new SamuraiAnimationStateSystem();

    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "Animator")?.current).toBe("idle");

    world.mutateComponent(entity, "Velocity", (velocity) => {
      velocity.vx = -58;
    });
    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "Animator")?.current).toBe("walk");

    world.mutateComponent(entity, "Velocity", (velocity) => {
      velocity.vx = 0;
    });
    world.mutateComponent(entity, "StateMachine", (machine) => {
      machine.currentState = "Anticipation";
    });
    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "Animator")?.current).toBe("attack");

    new SamuraiSpriteFrameSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "Sprite")?.srcRect).toEqual(
      getSamuraiFrameRect(16)
    );
    expect(world.getComponent(entity, "Transform")?.y).toBe(400);
  });

  it("finishes the hurt recoil after the short hitstun component expires", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(SAMURAI_SPRITE_READY_RESOURCE, true);
    const entity = new HitRunEnemyPool().acquireEnemy(world, {
      x: 480,
      y: 400,
      archetypeId: "samurai"
    });
    const stateSystem = new SamuraiAnimationStateSystem();
    world.addComponent(entity, {
      type: "HitReaction",
      hitstunRemaining: 0.12,
      blinkElapsed: 0
    });

    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "Animator")?.current).toBe("hurt");

    world.removeComponent(entity, "HitReaction");
    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "Animator")?.current).toBe("hurt");
  });

  it("returns to locomotion after hitstun expires even when HitReaction remains attached", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(SAMURAI_SPRITE_READY_RESOURCE, true);
    const entity = new HitRunEnemyPool().acquireEnemy(world, {
      x: 480,
      y: 400,
      archetypeId: "samurai"
    });

    world.addComponent(entity, {
      type: "HitReaction",
      hitstunRemaining: 0,
      blinkElapsed: 0
    } as never);
    world.mutateComponent(entity, "Animator", (animator) => {
      animator.current = "hurt";
      animator.frame = 5;
    });

    new SamuraiAnimationStateSystem().update(world, 1 / 60);
    expect(world.hasComponent(entity, "HitReaction")).toBe(true);
    expect(world.getComponent(entity, "Animator")?.current).toBe("idle");
  });

  it("plays death as a terminal non-looping clip", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(SAMURAI_SPRITE_READY_RESOURCE, true);
    const entity = new HitRunEnemyPool().acquireEnemy(world, {
      x: 480,
      y: 400,
      archetypeId: "samurai"
    });
    world.mutateComponent(entity, "Health", (health) => {
      health.current = 0;
    });
    world.addComponent(entity, {
      type: "EnemyDeathState",
      timer: 0.35,
      phase: "dying"
    } as never);

    new SamuraiAnimationStateSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "Animator")?.current).toBe("death");
    expect(SAMURAI_ANIMATIONS.death.loop).toBe(false);
    expect(world.getComponent(entity, "EnemyDeathState")).toMatchObject({
      timer: 0.85,
      phase: "samurai-animation"
    });
  });
});
