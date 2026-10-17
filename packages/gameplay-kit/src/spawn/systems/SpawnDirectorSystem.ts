import { System, World, ComponentRegistry, EventBus, WorldCommandBuffer } from "@tiny-aster/core";
import { SpawnDirectorComponent, WaveDefinition, SpawnRequest } from "../components/SpawnComponents";

/**
 * SpawnDirectorSystem orchestrates the sequential spawning of wave definitions,
 * managing pre-wave and post-wave cooldowns, and checking wave completion.
 * Runs deterministically in the Simulation phase.
 * @public
 */
import { EventRegistry } from "@tiny-aster/core";

export class SpawnDirectorSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {

  constructor() {
    super();
  }

  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const stateKey = "GameState" as Extract<keyof TComponents, string>;
    const gameState = world.getSingleton(stateKey) as { readyRemaining?: number; intermissionRemaining?: number; continueCountdownRemaining?: number; phase?: string } | undefined;
    if (gameState && ((gameState.readyRemaining ?? 0) > 0 || (gameState.intermissionRemaining ?? 0) > 0 || (gameState.continueCountdownRemaining ?? 0) > 0)) return;
    if (gameState && gameState.phase !== undefined && gameState.phase !== "PLAYING") return;

    const directorKey = "SpawnDirector" as Extract<keyof TComponents, string>;
    const directorEntity = world.query(directorKey)[0];
    if (directorEntity === undefined) return;

    // Load active director state
    const director = world.getComponent(directorEntity, directorKey) as SpawnDirectorComponent | undefined;
    if (!director) return;

    const waveDefinitions = world.getResource<WaveDefinition[]>("WaveDefinitions") || [];

    let waveIndex = director.waveIndex;
    let status = director.status;
    const initialStatus = status;
    let cooldownRemaining = director.cooldownRemaining;
    let waveElapsedTime = director.waveElapsedTime;
    let pendingSpawns = [...director.pendingSpawns];
    let activeWaveId = director.activeWaveId;
    let enemiesRemaining = director.enemiesRemaining;

    if (status === "idle") {
      if (waveIndex >= 0 && waveIndex < waveDefinitions.length) {
        const waveDef = waveDefinitions[waveIndex];
        status = "spawning";
        activeWaveId = waveDef.id;
        waveElapsedTime = 0;
        pendingSpawns = waveDef.spawns.map(spawn => ({
          ...spawn,
          spawnTime: (spawn.delay || 0)
        }));
        enemiesRemaining = 0;

        const eventBus = world.getEventBus() as EventBus;
        if (eventBus) {
          eventBus.emitDeferred("spawn:wave_start", {
            waveIndex,
            waveId: waveDef.id,
            isBossWave: !!waveDef.isBossWave
          });
        }
      }
    }

    if (status === "spawning") {
      waveElapsedTime += deltaTime;

      const remainingSpawns: SpawnRequest[] = [];
      for (const spawn of pendingSpawns) {
        const spawnTime = spawn.spawnTime ?? 0;
        if (waveElapsedTime >= spawnTime) {
          // Time to spawn!
          const entityId = world.reserveEntityId();
          world.getCommandBuffer().createEntity(entityId);
          world.getCommandBuffer().spawnFromBlueprintForEntity(
            entityId,
            spawn.blueprintId as Extract<keyof TComponents, string>,
            spawn.args as Record<string, any>
          );

          // Attach WaveMember component to identify it belongs to the wave
          world.getCommandBuffer().addComponent(entityId, {
            type: "WaveMember",
            waveIndex,
            waveId: activeWaveId || ""
          } as Parameters<WorldCommandBuffer<TComponents>["addComponent"]>[1]);
        } else {
          remainingSpawns.push(spawn);
        }
      }

      pendingSpawns = remainingSpawns;

      if (pendingSpawns.length === 0) {
        status = "active";
      }
    }

    if (status === "active" && initialStatus === "active") {
      // Query remaining wave members
      const waveMemberKey = "WaveMember" as Extract<keyof TComponents, string>;
      const activeMembers = world.query(waveMemberKey);
      enemiesRemaining = activeMembers.length;

      if (enemiesRemaining === 0) {
        status = "cooldown";
        const currentWave = waveDefinitions[waveIndex];
        cooldownRemaining = currentWave?.cooldown ?? 0;

        const eventBus = world.getEventBus() as EventBus;
        if (eventBus) {
          eventBus.emitDeferred("spawn:wave_complete", {
            waveIndex,
            waveId: activeWaveId || ""
          });
        }
      }
    }

    if (status === "cooldown") {
      cooldownRemaining -= deltaTime;
      if (cooldownRemaining <= 0) {
        waveIndex++;
        status = "idle";
        activeWaveId = undefined;
      }
    }

    // Mutate state back into director component
    world.mutateComponent(directorEntity, directorKey, (d: unknown) => {
      const sd = d as SpawnDirectorComponent;
      sd.waveIndex = waveIndex;
      sd.status = status;
      sd.cooldownRemaining = cooldownRemaining;
      sd.waveElapsedTime = waveElapsedTime;
      sd.pendingSpawns = pendingSpawns;
      sd.activeWaveId = activeWaveId;
      sd.enemiesRemaining = enemiesRemaining;
    });
  }
}
