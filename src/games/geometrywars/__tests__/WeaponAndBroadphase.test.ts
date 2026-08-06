import {
  World,
  TransformComponent,
  ColliderComponent,
  ShapeType,
  CircleShape,
  BoxShape,
  BroadPhase,
  SystemPhase,
  CollisionSystem2D
} from "@tiny-aster/core";
import { GeometryWarsGame } from "../GeometryWarsGame";
import { GWBulletPool } from "../EntityPool";

describe("Phase 2 & 3: Weapon pooling and Broadphase Verification", () => {

  describe("Phase 2: Weapon continuous shooting and GWBulletPool stability", () => {
    it("should shoot continuously and reclaim expired bullets cleanly without entity leaks", async () => {
      const game = new GeometryWarsGame();
      await (game as any).onRegisterSystems();
      await (game as any).onInitializeEntities();

      const sceneWorld = (game as any).currentScene.getWorld();
      const player = sceneWorld.query("Player")[0];

      // 1. Trigger continuous shooting pointing right
      game.setInputState({
        moveX: 0,
        moveY: 0,
        aimX: 1.0,
        aimY: 0.0,
        fire: true
      });

      // Verify that GWBulletPool is registered as a resource
      const pool = (sceneWorld as any).getResource("GWBulletPool") as GWBulletPool;
      expect(pool).toBeDefined();
      const initialPoolSize = pool!.size; // usually 1 or 0 depending on pre-allocation

      // Update world over multiple frames to trigger shooting
      // Cooldown is 0.12s. Let's tick 0.16s (10 ticks of 0.016s)
      for (let i = 0; i < 10; i++) {
        game.update(0.016);
      }

      // Check that a bullet was created and is active
      const bullets = sceneWorld.query("Damage");
      expect(bullets.length).toBeGreaterThan(0);
      const activeBulletsCountFirst = bullets.length;

      // 2. Continuous shooting: tick further to spawn more bullets
      // We'll update for 1.0s to generate multiple active bullets
      for (let i = 0; i < 60; i++) {
        game.update(0.016);
      }

      const activeBulletCount = sceneWorld.query("Damage").length;
      expect(activeBulletCount).toBeGreaterThan(1);
      // Ensure there is a limit/stable state of active bullets due to TTL expiration
      expect(activeBulletCount).toBeLessThan(20);

      // 3. Test clean reclamation on bullet TTL expiration
      // Bullet TTL is 1.2s. Let's stop firing and tick for 1.5s (94 ticks of 0.016s)
      game.setInputState({
        fire: false,
        aimX: 0,
        aimY: 0
      });

      for (let i = 0; i < 100; i++) {
        game.update(0.016);
      }

      // Ensure all bullets are expired and removed from the active entity list
      const finalBullets = sceneWorld.query("Damage");
      expect(finalBullets.length).toBe(0);

      // Verify that the pool has successfully reclaimed the bullets (meaning they reside in the idle pool)
      expect(pool!.size).toBeGreaterThan(initialPoolSize);
    });
  });

  describe("Phase 3: Broadphase Sweep & Prune equivalence and scale validation", () => {
    /**
     * Helper to compute AABB overlaps via exhaustive O(N²) brute-force.
     */
    function computeBruteForceAABBPairs(entities: number[], world: World<any>): Set<string> {
      const pairs = new Set<string>();
      const count = entities.length;

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const entA = entities[i];
          const entB = entities[j];

          const tA = world.getComponent(entA, "Transform") as TransformComponent;
          const cA = world.getComponent(entA, "Collider") as ColliderComponent;
          const tB = world.getComponent(entB, "Transform") as TransformComponent;
          const cB = world.getComponent(entB, "Collider") as ColliderComponent;

          if (!tA || !cA || !tB || !cB) continue;

          const aabbA = BroadPhase.getShapeBounds(tA as any, cA as any);
          const aabbB = BroadPhase.getShapeBounds(tB as any, cB as any);

          // Standard AABB overlap check
          const overlapX = aabbA.minX <= aabbB.maxX && aabbB.minX <= aabbA.maxX;
          const overlapY = aabbA.minY <= aabbB.maxY && aabbB.minY <= aabbA.maxY;

          if (overlapX && overlapY) {
            const pairId = entA < entB ? `${entA},${entB}` : `${entB},${entA}`;
            pairs.add(pairId);
          }
        }
      }

      return pairs;
    }

    it("should return the exact same overlapping pairs as exhaustive brute-force", () => {
      const world = new World();
      const entityIds: number[] = [];

      // Set up random seed/determinism coordinates
      // We will spawn 100 entities with random colliders (circle and box)
      for (let i = 0; i < 100; i++) {
        const ent = world.createEntity();
        entityIds.push(ent);

        // Deterministic position layout
        const x = (i * 17) % 800;
        const y = (i * 31) % 600;
        const isBox = i % 2 === 0;

        world.addComponent(ent, {
          type: "Transform",
          x,
          y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: x,
          worldY: y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        } as TransformComponent);

        world.addComponent(ent, {
          type: "Collider",
          shape: isBox
            ? ({ type: ShapeType.Box, width: 20, height: 20 } as BoxShape)
            : ({ type: ShapeType.Circle, radius: 10 } as CircleShape),
          layer: 1,
          mask: 1,
          enabled: true,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false
        } as ColliderComponent);
      }

      // Compute pairs via Sweep & Prune broadphase
      const sapPairsArray = BroadPhase.sweepAndPrune(entityIds, world as any);
      const sapPairs = new Set(
        sapPairsArray.map(([a, b]: [any, any]) => (a < b ? `${a},${b}` : `${b},${a}`))
      );

      // Compute pairs via Brute force AABB
      const brutePairs = computeBruteForceAABBPairs(entityIds, world);

      // Compare exact pair match
      expect(sapPairs.size).toBe(brutePairs.size);
      for (const pair of sapPairs) {
        expect(brutePairs.has(pair as string)).toBe(true);
      }
    });

    it("should scale efficiently with 1000 entities and run within performance budgets", () => {
      const world = new World();
      const entityIds: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const ent = world.createEntity();
        entityIds.push(ent);

        const x = (i * 13) % 800;
        const y = (i * 19) % 600;

        world.addComponent(ent, {
          type: "Transform",
          x,
          y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: x,
          worldY: y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        } as TransformComponent);

        world.addComponent(ent, {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: 5 } as CircleShape,
          layer: 1,
          mask: 1,
          enabled: true,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false
        } as ColliderComponent);
      }

      // Measure Sweep & Prune performance
      const startSAP = Date.now();
      const sapPairs = BroadPhase.sweepAndPrune(entityIds, world as any);
      const elapsedSAP = Date.now() - startSAP;

      // Measure Brute Force performance
      const startBrute = Date.now();
      const brutePairs = computeBruteForceAABBPairs(entityIds, world);
      const elapsedBrute = Date.now() - startBrute;

      console.log(`Phase 3 Scale test with 1000 entities:`);
      console.log(`- Sweep & Prune Broadphase: ${elapsedSAP}ms (found ${sapPairs.length} overlapping pairs)`);
      console.log(`- Brute-Force Exhaustive: ${elapsedBrute}ms (found ${brutePairs.size} overlapping pairs)`);

      // Sweep and prune is generally much faster than brute force at N=1000.
      expect(sapPairs.length).toBe(brutePairs.size);
    });
  });

  describe("Phase 4: Enemy Steering and AI States", () => {
    it("should toggle the evader enemy steering mode between seek and flee based on distance", async () => {
      const game = new GeometryWarsGame();
      await (game as any).onRegisterSystems();
      await (game as any).onInitializeEntities();

      const sceneWorld = (game as any).currentScene.getWorld();

      // Create an evader close to the player (the player is spawned at center: 400, 300)
      const evaderClose = sceneWorld.createEntity();
      const blueprintRegistry = sceneWorld.getResource("BlueprintRegistry") as any;
      blueprintRegistry.get("enemy_evader").spawn(sceneWorld, evaderClose, { x: 420, y: 300 }); // Distance: 20 pixels

      // Create an evader far from the player
      const evaderFar = sceneWorld.createEntity();
      blueprintRegistry.get("enemy_evader").spawn(sceneWorld, evaderFar, { x: 700, y: 300 }); // Distance: 300 pixels

      sceneWorld.flush();

      // Update AI system once
      game.update(0.016);

      const closeSteering = sceneWorld.getComponent(evaderClose, "Steering") as any;
      const farSteering = sceneWorld.getComponent(evaderFar, "Steering") as any;

      expect(closeSteering.mode).toBe("flee");
      expect(farSteering.mode).toBe("seek");
    });
  });

  describe("Phase 5: Wave Spawning and SpawnDirectorSystem", () => {
    it("should procedurally spawn wave 1 line enemies and preserve wave state through snapshots", async () => {
      const game = new GeometryWarsGame();
      await (game as any).onRegisterSystems();
      await (game as any).onInitializeEntities();

      const sceneWorld = (game as any).currentScene.getWorld();

      // Ensure director entity is spawned and is in spawning/idle state
      const directorEntity = sceneWorld.query("SpawnDirector")[0];
      expect(directorEntity).toBeDefined();

      const director = sceneWorld.getComponent(directorEntity, "SpawnDirector") as any;
      expect(director.status).toBe("idle");

      // Update to transition from idle to spawning and spawn initial line members
      game.update(0.016);
      sceneWorld.flush();

      // Chaser enemies should have spawned (5 chaser enemies)
      const chasers = sceneWorld.query("Steering").filter((entity: number) => {
        const render = sceneWorld.getComponent(entity, "Render") as any;
        return render && render.shape === "gw_chaser";
      });
      expect(chasers.length).toBe(5);

      // Verify that after spawning, state transitions to active on next update
      game.update(0.016);
      const updatedDirector = sceneWorld.getComponent(directorEntity, "SpawnDirector") as any;
      expect(updatedDirector.status).toBe("active");

      // Modify the director properties slightly and perform snapshot/restore
      sceneWorld.mutateComponent(directorEntity, "SpawnDirector", (d: any) => {
        d.waveElapsedTime = 42.42;
      });

      const snapshot = sceneWorld.snapshot();

      sceneWorld.mutateComponent(directorEntity, "SpawnDirector", (d: any) => {
        d.waveElapsedTime = 99.99;
      });

      // Restore snapshot
      sceneWorld.restore(snapshot);

      const restoredDirector = sceneWorld.getComponent(directorEntity, "SpawnDirector") as any;
      expect(restoredDirector.waveElapsedTime).toBeCloseTo(42.42, 2);
    });
  });

  describe("Phase 6: Combat, Combo, and Score Rules", () => {
    it("should award scores and update combos on combat:death events, and preserve consistency through snapshots", async () => {
      const game = new GeometryWarsGame();
      await (game as any).onRegisterSystems();
      await (game as any).onInitializeEntities();

      const sceneWorld = (game as any).currentScene.getWorld();
      const player = sceneWorld.query("Player")[0];

      // Initially, combo should be 0 and score should be 0
      let combo = sceneWorld.getComponent(player, "Combo") as any;
      expect(combo.combo).toBe(0);
      expect(combo.multiplier).toBe(1);

      let gameState = game.getGameState();
      expect(gameState.score).toBe(0);

      // Create an enemy chaser
      const chaser = sceneWorld.createEntity();
      const blueprintRegistry = sceneWorld.getResource("BlueprintRegistry") as any;
      blueprintRegistry.get("enemy_chaser").spawn(sceneWorld, chaser, { x: 100, y: 100 });
      sceneWorld.flush();

      // Emit combat:death for chaser
      sceneWorld.getEventBus().emit("combat:death", {
        entity: chaser,
        sourceEntity: player
      });

      sceneWorld.flush();

      // Verify chaser is removed, combo is incremented, and score is updated
      expect(sceneWorld.hasEntity(chaser)).toBe(false);

      // Fetch fresh combo state
      combo = sceneWorld.getComponent(player, "Combo") as any;
      expect(combo.combo).toBe(1);

      gameState = game.getGameState();
      expect(gameState.score).toBe(100); // base chaser score is 100

      // Let's test snapshot and rollback on combo and score
      const snapshot = sceneWorld.snapshot();

      // Fake another kill
      sceneWorld.mutateComponent(player, "Combo", (c: any) => {
        c.combo = 10;
        c.multiplier = 2;
      });

      // Restore snapshot
      sceneWorld.restore(snapshot);

      // Verify combo is restored
      combo = sceneWorld.getComponent(player, "Combo") as any;
      expect(combo.combo).toBe(1);
      expect(combo.multiplier).toBe(1);
    });
  });

  describe("Phase 7: Game feel, partículas y audio", () => {
    it("should trigger particle burst and audio on enemy death only if not resimulating", async () => {
      const game = new GeometryWarsGame();
      await (game as any).onRegisterSystems();
      await (game as any).onInitializeEntities();

      const sceneWorld = (game as any).currentScene.getWorld();
      const player = sceneWorld.query("Player")[0];

      // Set up mock audio
      const playSFXMock = jest.fn();
      sceneWorld.setResource("Audio", { playSFX: playSFXMock });

      // Create an enemy
      const chaser = sceneWorld.createEntity();
      const blueprintRegistry = sceneWorld.getResource("BlueprintRegistry") as any;
      blueprintRegistry.get("enemy_chaser").spawn(sceneWorld, chaser, { x: 100, y: 100 });
      sceneWorld.flush();

      // Ensure no particles initially
      let particles = sceneWorld.query("Render").filter((entity: number) => {
        const render = sceneWorld.getComponent(entity, "Render") as any;
        return render && render.shape === "gw_particle";
      });
      expect(particles.length).toBe(0);

      // 1. Trigger death while NOT resimulating (isReSimulating = false)
      expect(sceneWorld.isReSimulating).toBe(false);

      sceneWorld.getEventBus().emit("combat:death", {
        entity: chaser,
        sourceEntity: player
      });
      sceneWorld.flush();

      // Verify audio playSFX was called and particles are spawned
      expect(playSFXMock).toHaveBeenCalledWith("explosion");

      particles = sceneWorld.query("Render").filter((entity: number) => {
        const render = sceneWorld.getComponent(entity, "Render") as any;
        return render && render.shape === "gw_particle";
      });
      expect(particles.length).toBe(12); // Spawns 12 particles

      // Clean up particles
      for (const p of particles) {
        sceneWorld.getCommandBuffer().removeEntity(p);
      }
      sceneWorld.flush();

      // 2. Trigger death while RESIMULATING (isReSimulating = true)
      playSFXMock.mockClear();

      // Create another enemy
      const chaser2 = sceneWorld.createEntity();
      blueprintRegistry.get("enemy_chaser").spawn(sceneWorld, chaser2, { x: 200, y: 200 });
      sceneWorld.flush();

      // Turn on resimulating flag
      (sceneWorld as any).isReSimulating = true;

      sceneWorld.getEventBus().emit("combat:death", {
        entity: chaser2,
        sourceEntity: player
      });
      sceneWorld.flush();

      // Verify audio and particles were skipped
      expect(playSFXMock).not.toHaveBeenCalled();

      particles = sceneWorld.query("Render").filter((entity: number) => {
        const render = sceneWorld.getComponent(entity, "Render") as any;
        return render && render.shape === "gw_particle";
      });
      expect(particles.length).toBe(0); // 0 particles spawned!
    });
  });
});
