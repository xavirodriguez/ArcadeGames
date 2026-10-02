import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import { computeFormationSlots } from "./waveFormations";
import type {
  WaveScript,
  WaveDirectorState,
  WaveEvent,
  PendingStagger,
  IHitRunEnemyPool,
  WaveFormation
} from "./HitRunWaveTypes";
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE,
  ENEMY_POOL_RESOURCE
} from "./HitRunWaveTypes";

export interface HitRunWaveSystemConfig {
  /** Spawn por defecto si el evento no trae x/y. */
  defaultSpawnX: number;
  defaultSpawnY: number;
  /** Margen derecho off-screen para spawns tipo "entrar desde la derecha". */
  offscreenOffsetX: number;
}

const DEFAULT_CFG: HitRunWaveSystemConfig = {
  defaultSpawnX: 400,
  defaultSpawnY: 200,
  offscreenOffsetX: 40
};

/**
 * HitRunWaveSystem — director de ritmo por timeline JSON.
 *
 * Fase: SystemPhase.Simulation
 *
 * - Avanza `WaveDirectorState.elapsed`
 * - Dispara WaveEvents cuando elapsed >= event.t
 * - Soporta stagger (interval) y loop de script
 * - Spawnea vía IHitRunEnemyPool (resource HitRunEnemyPool)
 * - Respeta hit-stop / pause vía isSimulationFrozen
 *
 * Determinismo: formaciones fijas; scatter usa hash de índice (no Math.random).
 * Si en el futuro quieres jitter de seed de partida, usa world.gameplayRandom
 * solo en el path de scatter.
 */
export class HitRunWaveSystem extends System<CoreComponentRegistry> {
  private cfg: HitRunWaveSystemConfig;

  constructor(config: Partial<HitRunWaveSystemConfig> = {}) {
    super();
    this.cfg = { ...DEFAULT_CFG, ...config };
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (isSimulationFrozen(world)) return;

    const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    const script = world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);
    if (!state || !script || !state.active) return;

    state.elapsed += deltaTime;

    // 1) Eventos cuyo t ya llegó
    const events = script.events;
    const eLen = events.length;
    while (state.nextEventIndex < eLen) {
      const ev = events[state.nextEventIndex];
      if (ev.t > state.elapsed) break;
      this.dispatchEvent(world, state, ev, state.nextEventIndex);
      state.nextEventIndex++;
    }

    // 2) Staggers en curso
    this.tickStaggers(world, state);

    // 3) Loop del script
    if (
      state.nextEventIndex >= eLen &&
      state.pendingStaggers.length === 0 &&
      script.loop
    ) {
      const delay = script.loopDelay ?? 0;
      const lastT = eLen > 0 ? events[eLen - 1].t : 0;
      if (state.elapsed >= lastT + delay) {
        state.elapsed = 0;
        state.nextEventIndex = 0;
        state.pendingStaggers.length = 0;
      }
    }
  }

  private dispatchEvent(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState,
    ev: WaveEvent,
    eventIndex: number
  ): void {
    const count = Math.max(1, ev.count ?? 1);
    const formation = (ev.formation ?? "point") as WaveFormation;
    const spacing = ev.spacing ?? 24;
    const baseX = ev.x ?? this.cfg.defaultSpawnX + this.cfg.offscreenOffsetX;
    const baseY = ev.y ?? this.cfg.defaultSpawnY;
    const interval = ev.interval ?? 0;

    if (interval > 0 && count > 1) {
      // Primer spawn inmediato + el resto en stagger
      this.spawnOne(world, state, ev.type, formation, baseX, baseY, spacing, 0, count, ev.tags);
      const pending: PendingStagger = {
        eventIndex,
        remaining: count - 1,
        nextSpawnAt: state.elapsed + interval,
        spawned: 1,
        type: ev.type,
        formation,
        baseX,
        baseY,
        spacing,
        interval,
        count,
        tags: ev.tags
      };
      state.pendingStaggers.push(pending);
      return;
    }

    // Spawn en bloque (formación completa)
    this.spawnGroup(world, state, ev.type, formation, baseX, baseY, spacing, count, ev.tags);
  }

  private tickStaggers(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState
  ): void {
    const list = state.pendingStaggers;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      while (s.remaining > 0 && state.elapsed >= s.nextSpawnAt) {
        this.spawnOne(
          world,
          state,
          s.type,
          s.formation,
          s.baseX,
          s.baseY,
          s.spacing,
          s.spawned,
          s.count,
          s.tags
        );
        s.spawned++;
        s.remaining--;
        s.nextSpawnAt += s.interval;
      }
      if (s.remaining <= 0) {
        list.splice(i, 1);
      }
    }
  }

  private spawnGroup(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState,
    type: string,
    formation: WaveFormation,
    baseX: number,
    baseY: number,
    spacing: number,
    count: number,
    tags?: string[]
  ): void {
    const slots = computeFormationSlots(formation, count, baseX, baseY, spacing);
    for (let i = 0; i < slots.length; i++) {
      this.spawnAt(world, state, type, slots[i].x, slots[i].y, i, count, tags);
    }
  }

  private spawnOne(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState,
    type: string,
    formation: WaveFormation,
    baseX: number,
    baseY: number,
    spacing: number,
    indexInGroup: number,
    groupSize: number,
    tags?: string[]
  ): void {
    const slots = computeFormationSlots(formation, groupSize, baseX, baseY, spacing);
    const slot = slots[Math.min(indexInGroup, slots.length - 1)] ?? {
      x: baseX,
      y: baseY
    };
    this.spawnAt(world, state, type, slot.x, slot.y, indexInGroup, groupSize, tags);
  }

  private spawnAt(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState,
    type: string,
    x: number,
    y: number,
    indexInGroup: number,
    groupSize: number,
    tags?: string[]
  ): void {
    const pool = world.getResource<IHitRunEnemyPool>(ENEMY_POOL_RESOURCE);
    if (!pool) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[HitRunWaveSystem] HitRunEnemyPool resource missing");
      }
      return;
    }

    pool.acquireEnemy(world, {
      x,
      y,
      archetypeId: type,
      tags,
      indexInGroup,
      groupSize
    });
    state.totalSpawned++;
  }
}

/**
 * Arranca (o reinicia) un script de oleada en el world.
 */
export function startWaveScript(
  world: World<CoreComponentRegistry>,
  script: WaveScript
): void {
  world.setResource(WAVE_SCRIPT_RESOURCE, script);
  const state: WaveDirectorState = {
    type: "WaveDirectorState",
    scriptId: script.id,
    elapsed: 0,
    nextEventIndex: 0,
    active: true,
    pendingStaggers: [],
    totalSpawned: 0
  };
  world.setResource(WAVE_DIRECTOR_RESOURCE, state);
}

export function stopWaveDirector(world: World<CoreComponentRegistry>): void {
  const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
  if (state) {
    state.active = false;
  }
}
