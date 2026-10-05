import { System, SystemPhase, World } from "@tiny-aster/core";
import type { SpawnRequest } from "@tiny-aster/gameplay-kit";
import type {
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  WaveDefinitions,
  WaypointList,
  GameStateComponent,
} from "../types/TowerDefenseTypes";

export class WaveSpawnSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.Simulation;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, dt: number): void {
    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;
    if (!gs) return;

    const directorEntity = world.query("SpawnDirector")[0];
    if (directorEntity === undefined) return;

    const sd = world.getComponent(directorEntity, "SpawnDirector");
    if (!sd) return;

    if (gs.phase === "wave" && sd.status === "idle") {
      this.startWave(world, directorEntity, gs.wave);
      return;
    }

    if (sd.status !== "spawning" && sd.status !== "active") return;

    const newElapsedTime = sd.waveElapsedTime + dt;
    world.mutateComponent(directorEntity, "SpawnDirector", (s) => {
      s.waveElapsedTime = newElapsedTime;
    });

    const readyToSpawn: SpawnRequest[] = [];
    const remainingSpawns: SpawnRequest[] = [];

    for (const req of sd.pendingSpawns) {
      if (req.spawnTime !== undefined && newElapsedTime >= req.spawnTime) {
        readyToSpawn.push(req);
      } else {
        remainingSpawns.push(req);
      }
    }

    if (readyToSpawn.length > 0) {
      for (const req of readyToSpawn) {
        world.commands.spawnFromBlueprint(req.blueprintId, req.args);
      }
      world.mutateComponent(directorEntity, "SpawnDirector", (s) => {
        s.pendingSpawns = remainingSpawns;
      });
    }

    const liveCreeps = world.query("Creep").length;
    const pendingCount = remainingSpawns.length;

    world.mutateComponent(directorEntity, "SpawnDirector", (s) => {
      s.enemiesRemaining = pendingCount + liveCreeps;
    });

    if (pendingCount === 0 && liveCreeps === 0 && sd.status === "spawning") {
      world.mutateComponent(directorEntity, "SpawnDirector", (s) => {
        s.status = "idle";
        s.enemiesRemaining = 0;
      });
      world.getEventBus()?.emit("wave:cleared", { waveIndex: gs.wave });
    }
  }

  private startWave(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    directorEntity: number,
    waveIndex: number
  ): void {
    const waves = world.getResource<WaveDefinitions>("WaveDefinitions");
    const waypoints = world.getResource<WaypointList>("WaypointList");
    if (!waves || waveIndex >= waves.length || !waypoints || waypoints.points.length === 0) return;

    const def = waves[waveIndex];
    const startPos = waypoints.points[0];

    const pendingSpawns: SpawnRequest[] = [];
    let accumulatedTime = 0;

    for (const c of def.creeps) {
      const interval = c.interval ?? 0.8;
      for (let i = 0; i < c.count; i++) {
        pendingSpawns.push({
          blueprintId: "creep",
          args: { type: c.type, x: startPos.x, y: startPos.y },
          spawnTime: accumulatedTime,
        });
        accumulatedTime += interval;
      }
    }

    world.mutateComponent(directorEntity, "SpawnDirector", (s) => {
      s.waveIndex = waveIndex;
      s.status = "spawning";
      s.enemiesRemaining = pendingSpawns.length;
      s.pendingSpawns = pendingSpawns;
      s.cooldownRemaining = 0;
      s.waveElapsedTime = 0;
    });

    world.getEventBus()?.emit("wave:started", { waveIndex });
  }
}
