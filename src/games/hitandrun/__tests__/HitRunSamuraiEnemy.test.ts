import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { getEnemyArchetype } from "../waves/HitRunEnemyArchetypes";
import { HitRunEnemyPool } from "../waves/HitRunEnemyPool";
import { SECTION_WAVE_SCRIPTS } from "../waves/sectionWaves";
import {
  SAMURAI_ANIMATIONS,
  SAMURAI_ASSET_KEY,
  SAMURAI_CELL_SIZE,
  SAMURAI_SPRITE_READY_RESOURCE,
  getSamuraiFrameRect
} from "../rendering/SamuraiVisualAssets";
import {
  HitRunSpriteAnimatorPlaybackSystem,
  SamuraiAnimationStateSystem,
  SamuraiSpriteFrameSystem
} from "../rendering/SamuraiAnimationSystems";
import { SpriteRegistry } from "../../shared/sprites";
import { getHitRunCharacterSpriteSheet, HIT_RUN_SUMI_E_SAMURAI_SHEET_ID } from "../rendering/HitRunSpriteAtlas";

describe("Hit & Run samurai enemy", () => {
  beforeEach(() => {
    const classicSheet = getHitRunCharacterSpriteSheet(SAMURAI_ASSET_KEY);
    const sumiESheet = getHitRunCharacterSpriteSheet(HIT_RUN_SUMI_E_SAMURAI_SHEET_ID);
    if (!classicSheet || !sumiESheet) throw new Error("Hit&Run sprite metadata is missing.");
    SpriteRegistry.register(classicSheet);
    SpriteRegistry.register(sumiESheet);
  });
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
    expect(SECTION_WAVE_SCRIPTS.wave_boss.events).toContainEqual(
      expect.objectContaining({ type: "samurai", count: 1 })
    );
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

  it("spawns the enemy with SpriteAnimator and the standard AI state machine", () => {
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
      srcRect: { x: 0, y: 0, w: 64, h: 64 },
      scale: (getEnemyArchetype("samurai")?.size ?? SAMURAI_CELL_SIZE) / SAMURAI_CELL_SIZE
    });
        expect(world.getComponent(entity, "SpriteAnimator")).toMatchObject({
      type: "SpriteAnimator",
      sheetId: SAMURAI_ASSET_KEY,
      currentAnim: "idle",
      frameIndex: 0
    });
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
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("idle");

    world.mutateComponent(entity, "Velocity", (velocity) => {
      velocity.vx = -58;
    });
    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("walk");

    world.mutateComponent(entity, "Velocity", (velocity) => {
      velocity.vx = 0;
    });
    world.mutateComponent(entity, "StateMachine", (machine) => {
      machine.currentState = "Anticipation";
    });
    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("attack");

    new SamuraiSpriteFrameSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "Sprite")?.srcRect).toEqual(
      getSamuraiFrameRect(16)
    );
    expect(world.getComponent(entity, "Transform")?.y).toBe(400);
  });

  it("advances the canonical clip in elapsed seconds and updates the atlas source rect", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(SAMURAI_SPRITE_READY_RESOURCE, true);
    const entity = new HitRunEnemyPool().acquireEnemy(world, {
      x: 480,
      y: 400,
      archetypeId: "samurai"
    });
    world.mutateComponent(entity, "StateMachine", (machine) => {
      machine.currentState = "Anticipation";
    });
    new SamuraiAnimationStateSystem().update(world, 1 / 60);

    new HitRunSpriteAnimatorPlaybackSystem().update(world, 0.2);
    expect(world.getComponent(entity, "SpriteAnimator")).toMatchObject({
      currentAnim: "attack",
      frameIndex: 2
    });
    new SamuraiSpriteFrameSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "Sprite")?.srcRect).toEqual(getSamuraiFrameRect(18));
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
    } as never);

    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("hurt");

    world.removeComponent(entity, "HitReaction");
    stateSystem.update(world, 1 / 60);
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("hurt");
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
    world.mutateComponent(entity, "SpriteAnimator", (animator) => {
      animator.currentAnim = "hurt";
      animator.frameIndex = 5;
    });

    new SamuraiAnimationStateSystem().update(world, 1 / 60);
    expect(world.hasComponent(entity, "HitReaction")).toBe(true);
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("idle");
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
    expect(world.getComponent(entity, "SpriteAnimator")?.currentAnim).toBe("death");
    expect(SAMURAI_ANIMATIONS.death.loop).toBe(false);
    expect(world.getComponent(entity, "EnemyDeathState")).toMatchObject({
      timer: 0.85,
      phase: "samurai-animation"
    });
  });
});
