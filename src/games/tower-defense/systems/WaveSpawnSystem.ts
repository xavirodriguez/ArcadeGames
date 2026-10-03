import { System, SystemPhase, World } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  WaveDefinitions,
  CreepCatalog,
  WaypointList,
  GameStateComponent,
} from "../types/TowerDefenseTypes";
import { spawnCreep } from "../EntityFactory";

interface PendingSpawn {
  creepType: string;
  remaining: number;
  intervalMs: number;
  cooldownMs: number;
}

/**
 * Reuses the SpawnDirector pattern from Space Invaders.
 * Manages wave progression and timed creep spawning.
 */
export class WaveSpawnSystem extends System<TowerDefenseComponentRegistry> {
  readonly phase = SystemPhase.Simulation;
  private pending: PendingSpawn[] = [];
  private waveActive = false;

  update(world: World<TowerDefenseComponentRegistry>, dt: number): void {
    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;
    if (!gs) return;

    const director = world.query("SpawnDirector")[0];
    if (director === undefined) return;

    const sd = world.getComponent(director, "SpawnDirector");
    if (!sd) return;

    // Start wave when phase becomes "wave" and director is idle
    if (gs.phase === "wave" && sd.status === "idle" && !this.waveActive) {
      this.startWave(world, gs.wave);
    }

    if (!this.waveActive) return;

    // Tick pending spawns
    for (const p of this.pending) {
      if (p.remaining <= 0) continue;
      p.cooldownMs -= dt;
      if (p.cooldownMs <= 0) {
        this.spawnOne(world, p.creepType);
        p.remaining -= 1;
        p.cooldownMs = p.intervalMs;
        world.mutateComponent(director, "SpawnDirector", (s) => {
          s.enemiesRemaining = Math.max(0, (s.enemiesRemaining ?? 0));
        });
      }
    }

    // Check if wave is finished spawning and all creeps are dead
    const stillSpawning = this.pending.some((p) => p.remaining > 0);
    const liveCreeps = world.query("Creep").length;

    if (!stillSpawning && liveCreeps === 0 && this.waveActive) {
      this.waveActive = false;
      world.mutateComponent(director, "SpawnDirector", (s) => {
        s.status = "idle";
        s.enemiesRemaining = 0;
      });
      world.eventBus?.emit("wave:cleared", { waveIndex: gs.wave });
    }
  }

  private startWave(world: World<TowerDefenseComponentRegistry>, waveIndex: number): void {
    const waves = world.getResource<WaveDefinitions>("WaveDefinitions");
    if (!waves || waveIndex >= waves.length) return;

    const def = waves[waveIndex];
    this.pending = def.creeps.map((c) => ({
      creepType: c.type,
      remaining: c.count,
      intervalMs: (c.interval ?? 0.8) * 1000,
      cooldownMs: 0, // spawn first immediately
    }));

    const total = this.pending.reduce((sum, p) => sum + p.remaining, 0);
    const director = world.query("SpawnDirector")[0];
    if (director !== undefined) {
      world.mutateComponent(director, "SpawnDirector", (s) => {
        s.waveIndex = waveIndex;
        s.status = "spawning";
        s.enemiesRemaining = total;
        s.pendingSpawns = [];
        s.cooldownRemaining = 0;
        s.waveElapsedTime = 0;
      });
    }

    this.waveActive = true;
    world.eventBus?.emit("wave:started", { waveIndex });
  }

  private spawnOne(world: World<TowerDefenseComponentRegistry>, creepType: string): void {
    const catalog = world.getResource<CreepCatalog>("CreepCatalog");
    const waypoints = world.getResource<WaypointList>("WaypointList");
    if (!catalog || !waypoints || waypoints.points.length === 0) return;

    const def = catalog[creepType];
    if (!def) {
      console.warn(`[TD] Unknown creep type: ${creepType}`);
      return;
    }

    const start = waypoints.points[0];
    spawnCreep(world, def, start.x, start.y);
  }
}
