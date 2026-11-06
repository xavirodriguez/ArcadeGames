import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { BeltCameraSystem } from "../belt/BeltCameraSystem";
import {
  BELT_CAMERA_CONFIG_RESOURCE,
  BELT_CAMERA_STATE_RESOURCE,
  type BeltCameraConfig,
  type BeltCameraState
} from "../belt/BeltCameraTypes";
import { HitRunOrphanEnemyCleanupSystem } from "../systems/HitRunOrphanEnemyCleanupSystem";
import { HitRunEnemyPool } from "../waves/HitRunEnemyPool";
import {
  ENEMY_POOL_RESOURCE,
  WAVE_DIRECTOR_RESOURCE,
  type IHitRunEnemyPool,
  type HitRunEnemySpawnParams,
  type WaveDirectorState,
  type WaveScript
} from "../waves/HitRunWaveTypes";
import { HitRunWaveSystem, startWaveScript } from "../waves/HitRunWaveSystem";

function createWaveWorld(): {
  world: World<CoreComponentRegistry>;
  spawned: number[];
} {
  const world = new World<CoreComponentRegistry>();
  world.setResource(BELT_CAMERA_CONFIG_RESOURCE, {
    viewportWidth: 800,
    lookAhead: 40,
    followSpeed: 6,
    minCameraX: 0,
    sections: [
      { id: "section-0", startX: 0, gateX: 720 },
      { id: "section-1", startX: 720, gateX: 1400 }
    ]
  } satisfies BeltCameraConfig);
  world.setResource(BELT_CAMERA_STATE_RESOURCE, {
    cameraX: 0,
    currentSectionIndex: 0,
    sectionCleared: false,
    gateLocked: true,
    hadEnemiesThisSection: false
  } satisfies BeltCameraState);

  const spawned: number[] = [];
  const pool: IHitRunEnemyPool = {
    acquireEnemy(rawWorld: unknown, _params: HitRunEnemySpawnParams): number {
      const target = rawWorld as World<CoreComponentRegistry>;
      const entity = target.createEntity();
      const section = target.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
      target.addComponent(entity, { type: "Health", current: 1, max: 1 });
      target.addComponent(entity, { type: "Enemy", kind: "patrol" } as never);
      target.addComponent(entity, {
        type: "BeltSectionEnemy",
        sectionIndex: section?.currentSectionIndex ?? 0
      } as never);
      spawned.push(entity);
      return entity;
    }
  };
  world.setResource(ENEMY_POOL_RESOURCE, pool);

  return { world, spawned };
}

function killEnemy(world: World<CoreComponentRegistry>, entity: number): void {
  world.mutateComponent(entity, "Health", (health) => {
    health.current = 0;
  });
  world.addComponent(entity, { type: "Dead" } as never);
}

function getCameraState(world: World<CoreComponentRegistry>): BeltCameraState {
  const state = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
  if (!state) throw new Error("Belt camera state was not initialized.");
  return state;
}

describe("Hit & Run wave lifecycle integrity", () => {
  it("keeps the section gate closed between scheduled spawn events", () => {
    const { world, spawned } = createWaveWorld();
    const waves = new HitRunWaveSystem();
    const script: WaveScript = {
      id: "two-groups-with-gap",
      events: [
        { t: 0, type: "popcorn" },
        { t: 2, type: "charger" }
      ]
    };

    startWaveScript(world, script);
    waves.update(world, 0);
    expect(spawned).toHaveLength(1);

    killEnemy(world, spawned[0]);
    new BeltCameraSystem().update(world, 1 / 60);

    expect(getCameraState(world).sectionCleared).toBe(false);
    expect(getCameraState(world).gateLocked).toBe(true);

    waves.update(world, 2);
    expect(spawned).toHaveLength(2);
    killEnemy(world, spawned[1]);
    new BeltCameraSystem().update(world, 1 / 60);

    expect(getCameraState(world).sectionCleared).toBe(true);
    expect(getCameraState(world).gateLocked).toBe(false);
  });

  it("keeps the gate closed while an interval stagger still has pending spawns", () => {
    const { world, spawned } = createWaveWorld();
    const waves = new HitRunWaveSystem();

    startWaveScript(world, {
      id: "staggered-group",
      events: [{ t: 0, type: "popcorn", count: 2, interval: 1 }]
    });
    waves.update(world, 0);

    expect(spawned).toHaveLength(1);
    const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    expect(state?.pendingStaggers).toHaveLength(1);

    killEnemy(world, spawned[0]);
    new BeltCameraSystem().update(world, 1 / 60);

    expect(getCameraState(world).sectionCleared).toBe(false);
    expect(getCameraState(world).gateLocked).toBe(true);

    waves.update(world, 1);
    expect(spawned).toHaveLength(2);
    expect(
      world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE)?.pendingStaggers
    ).toHaveLength(0);

    killEnemy(world, spawned[1]);
    new BeltCameraSystem().update(world, 1 / 60);

    expect(getCameraState(world).sectionCleared).toBe(true);
    expect(getCameraState(world).gateLocked).toBe(false);
  });

  it("does not let enemies owned by a previous section block the current section", () => {
    const { world } = createWaveWorld();
    world.setResource(BELT_CAMERA_STATE_RESOURCE, {
      cameraX: 720,
      currentSectionIndex: 1,
      sectionCleared: false,
      gateLocked: true,
      hadEnemiesThisSection: true
    } satisfies BeltCameraState);

    const previousSectionEnemy = world.createEntity();
    world.addComponent(previousSectionEnemy, {
      type: "Health",
      current: 5,
      max: 5
    });
    world.addComponent(previousSectionEnemy, {
      type: "Enemy",
      kind: "patrol"
    } as never);
    world.addComponent(previousSectionEnemy, {
      type: "BeltSectionEnemy",
      sectionIndex: 0
    } as never);

    new BeltCameraSystem().update(world, 1 / 60);

    expect(getCameraState(world).sectionCleared).toBe(true);
    expect(getCameraState(world).gateLocked).toBe(false);
  });

  it("reassigns section ownership when a pooled enemy is recycled", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource(BELT_CAMERA_STATE_RESOURCE, {
      cameraX: 0,
      currentSectionIndex: 0,
      sectionCleared: false,
      gateLocked: true,
      hadEnemiesThisSection: false
    } satisfies BeltCameraState);

    const pool = new HitRunEnemyPool();
    pool.prewarm(world, 1);
    const first = pool.acquireEnemy(world, {
      archetypeId: "popcorn",
      x: 200,
      y: 400
    });

    expect(
      (world.getComponent(first, "BeltSectionEnemy") as { sectionIndex: number })
        .sectionIndex
    ).toBe(0);

    pool.releaseEnemy(world, first);
    world.setResource(BELT_CAMERA_STATE_RESOURCE, {
      cameraX: 720,
      currentSectionIndex: 1,
      sectionCleared: false,
      gateLocked: true,
      hadEnemiesThisSection: false
    } satisfies BeltCameraState);

    const recycled = pool.acquireEnemy(world, {
      archetypeId: "popcorn",
      x: 900,
      y: 400
    });

    expect(recycled).toBe(first);
    expect(
      (world.getComponent(recycled, "BeltSectionEnemy") as { sectionIndex: number })
        .sectionIndex
    ).toBe(1);
  });

  it("does not orphan a combat-capable enemy solely because its rendered size is small", () => {
    const world = new World<CoreComponentRegistry>();
    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Health",
      current: 3,
      max: 3
    });
    world.addComponent(enemy, { type: "Enemy", kind: "patrol" } as never);
    world.addComponent(enemy, { type: "Faction", value: "enemy" });
    world.addComponent(enemy, {
      type: "Render",
      shape: "popcorn",
      size: 2,
      color: "#fff",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0
    } as never);
    world.addComponent(enemy, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 4, halfHeight: 4 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false
    } as never);
    world.addComponent(enemy, { type: "Hurtbox" } as never);

    new HitRunOrphanEnemyCleanupSystem().update(world, 1 / 60);

    expect(world.hasComponent(enemy, "Dead")).toBe(false);
    expect(
      (world.getComponent(enemy, "Health") as { current: number }).current
    ).toBe(3);
  });
  it("does not clear a looping wave during its inter-loop delay", () => {
    const { world, spawned } = createWaveWorld();
    const waves = new HitRunWaveSystem();

    startWaveScript(world, {
      id: "loop-with-gap",
      loop: true,
      loopDelay: 10,
      events: [{ t: 0, type: "popcorn" }]
    });
    waves.update(world, 0);

    expect(spawned).toHaveLength(1);
    killEnemy(world, spawned[0]);
    new BeltCameraSystem().update(world, 1 / 60);

    expect(getCameraState(world).sectionCleared).toBe(false);
    expect(getCameraState(world).gateLocked).toBe(true);
  });

});
