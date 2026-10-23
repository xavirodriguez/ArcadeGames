import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitAndRunGame } from "../HitAndRunGame";
import { registerHitRunEnemyPool } from "../waves/HitRunEnemyPool";
import { registerHitRunCombat } from "../systems/HitRunCombatBootstrap";
import { BeltCameraSystem } from "../belt/BeltCameraSystem";
import { BELT_CAMERA_STATE_RESOURCE, BeltCameraState } from "../belt/BeltCameraTypes";
import { WAVE_DIRECTOR_RESOURCE, WaveDirectorState } from "../waves/HitRunWaveTypes";

describe("Hit & Run Phase 2 Requirements", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    registerHitRunCombat(world);
  });

  describe("1. World Snapshot Friendliness and Resimulation Determinism (G1.1)", () => {
    it("produces identical snapshots before and after restoration and tick execution", async () => {
      const game = new HitAndRunGame({ seed: 42 });
      await game.init();

      const gameWorld = game.getWorld();

      for (let i = 0; i < 5; i++) {
        game.update(0.016);
      }

      const snapshotBefore = gameWorld.snapshot();

      const restoredWorld = new World<CoreComponentRegistry>();
      restoredWorld.restore(snapshotBefore);

      const snapshotAfter = restoredWorld.snapshot();

      expect(snapshotAfter.tick).toBe(snapshotBefore.tick);
      expect(snapshotAfter.entities).toEqual(snapshotBefore.entities);

      game.destroy();
    });
  });

  describe("2. Explicit Enemy Death Lifecycle and Pool Recycling (G4.1, G1.4, G3.6)", () => {
    it("transitions dead enemy through EnemyDeathState before reclaiming to pool", () => {
      const pool = registerHitRunEnemyPool(world);
      pool.prewarm(world, 4);

      const enemy = pool.acquireEnemy(world, {
        archetypeId: "popcorn",
        x: 200,
        y: 400
      });

      expect(world.hasEntity(enemy)).toBe(true);
      const renderBefore = world.getComponent(enemy, "Render") as { visible: boolean; opacity: number };
      const colliderBefore = world.getComponent(enemy, "Collider2D") as { enabled: boolean };
      expect(renderBefore.visible).toBe(true);
      expect(colliderBefore.enabled).toBe(true);

      world.getCommandBuffer().addComponent(enemy, { type: "Dead" });
      world.flush();

      world.update(0.016);

      expect(world.hasComponent(enemy, "EnemyDeathState")).toBe(true);
      const colliderDuringDeath = world.getComponent(enemy, "Collider2D") as { enabled: boolean };
      expect(colliderDuringDeath.enabled).toBe(false);
      expect(world.hasComponent(enemy, "Hurtbox")).toBe(false);

      for (let i = 0; i < 25; i++) {
        world.update(0.016);
      }

      const freeList = world.getResource<number[]>("HitRunEnemyPoolFreeList") ?? [];
      expect(freeList.includes(enemy)).toBe(true);

      const recycledEnemy = pool.acquireEnemy(world, {
        archetypeId: "popcorn",
        x: 300,
        y: 400
      });

      expect(recycledEnemy).toBe(enemy);
      const renderReacquired = world.getComponent(recycledEnemy, "Render") as { visible: boolean; opacity: number };
      const colliderReacquired = world.getComponent(recycledEnemy, "Collider2D") as { enabled: boolean };
      expect(renderReacquired.visible).toBe(true);
      expect(colliderReacquired.enabled).toBe(true);
      expect(world.hasComponent(recycledEnemy, "Hurtbox")).toBe(true);
    });
  });

  describe("3. Decoupled Camera Gate Unlocking without Render.size Heuristic (G4.8)", () => {
    it("unlocks camera gate when last wave enemy is killed regardless of tiny Render.size", () => {
      const cameraSystem = new BeltCameraSystem();

      world.setResource("BeltCameraState", {
        cameraX: 0,
        currentSectionIndex: 0,
        sectionCleared: false,
        gateLocked: true,
        hadEnemiesThisSection: true
      } satisfies BeltCameraState);

      world.setResource(WAVE_DIRECTOR_RESOURCE, {
        type: "WaveDirectorState",
        scriptId: "test_wave",
        elapsed: 10,
        nextEventIndex: 1,
        active: false,
        pendingStaggers: [],
        totalSpawned: 1,
        totalKilled: 1
      } satisfies WaveDirectorState);

      const tinyEnemy = world.createEntity();
      world.addComponent(tinyEnemy, { type: "Enemy", kind: "patrol" });
      world.addComponent(tinyEnemy, { type: "Health", current: 0, max: 1 });
      world.addComponent(tinyEnemy, { type: "Dead" });
      world.addComponent(tinyEnemy, {
        type: "Render",
        shape: "enemy",
        size: 1, // tiny size (1px) — previously ignored by size < 5 heuristic
        visible: true,
        opacity: 0,
        order: 1,
        depthSort: true,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      });

      cameraSystem.update(world, 0.016);

      const camState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
      expect(camState?.sectionCleared).toBe(true);
      expect(camState?.gateLocked).toBe(false);
    });
  });
});
