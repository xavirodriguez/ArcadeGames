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
import {
  WAVE_TELEGRAPHS_RESOURCE,
  WAVE_BANNER_RESOURCE,
  pushTelegraph,
  tickTelegraphs,
  tickBanner,
  type WaveTelegraphMarker,
  type WaveBannerState
} from "./HitRunWavePresentation";

export interface HitRunWaveSystemConfig {
  defaultSpawnX: number;
  defaultSpawnY: number;
  offscreenOffsetX: number;
  telegraphLead: number;
}

const DEFAULT_CFG: HitRunWaveSystemConfig = {
  defaultSpawnX: 400,
  defaultSpawnY: 200,
  offscreenOffsetX: 40,
  telegraphLead: 0.55
};

export class HitRunWaveSystem extends System<CoreComponentRegistry> {
  private cfg: HitRunWaveSystemConfig;
  private telegraphedEventKeys = new Set<string>();
  private lastClearEventIndex = -1;

  constructor(config: Partial<HitRunWaveSystemConfig> = {}) {
    super();
    this.cfg = { ...DEFAULT_CFG, ...config };
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (isSimulationFrozen(world)) return;

    let telegraphs = world.getResource<WaveTelegraphMarker[]>(WAVE_TELEGRAPHS_RESOURCE);
    if (!telegraphs) {
      telegraphs = [];
      world.setResource(WAVE_TELEGRAPHS_RESOURCE, telegraphs);
    }
    tickTelegraphs(telegraphs, deltaTime);

    let banner = world.getResource<WaveBannerState | null>(WAVE_BANNER_RESOURCE) ?? null;
    banner = tickBanner(banner, deltaTime);
    world.setResource(WAVE_BANNER_RESOURCE, banner);

    const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    const script = world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);
    if (!state || !script || !state.active) return;

    state.elapsed += deltaTime;

    // Preview telegraphs for upcoming events
    this.queueTelegraphs(world, state, script, telegraphs);

    const events = script.events;
    const eLen = events.length;
    while (state.nextEventIndex < eLen) {
      const ev = events[state.nextEventIndex];
      if (ev.t > state.elapsed) break;
      this.dispatchEvent(world, state, ev, state.nextEventIndex);
      state.nextEventIndex++;
    }

    this.tickStaggers(world, state);

    // CLEAR when a batch finished and there's a breathing gap (or end)
    this.maybeShowClear(world, state, script);

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
        this.telegraphedEventKeys.clear();
        this.lastClearEventIndex = -1;
        world.setResource(WAVE_BANNER_RESOURCE, {
          text: "NEXT WAVE",
          remaining: 1.2,
          sub: script.name
        });
      }
    }
  }

  private queueTelegraphs(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState,
    script: WaveScript,
    telegraphs: WaveTelegraphMarker[]
  ): void {
    const lead = this.cfg.telegraphLead;
    const events = script.events;
    for (let i = state.nextEventIndex; i < events.length; i++) {
      const ev = events[i];
      const eta = ev.t - state.elapsed;
      if (eta > lead) break;
      if (eta < -0.05) continue;
      const key = `${state.scriptId}:${i}`;
      if (this.telegraphedEventKeys.has(key)) continue;
      this.telegraphedEventKeys.add(key);

      const count = Math.max(1, ev.count ?? 1);
      const formation = (ev.formation ?? "point") as WaveFormation;
      const spacing = ev.spacing ?? 24;
      const baseX = ev.x ?? this.cfg.defaultSpawnX + this.cfg.offscreenOffsetX;
      const baseY = ev.y ?? this.cfg.defaultSpawnY;
      const slots = computeFormationSlots(formation, count, baseX, baseY, spacing);
      for (let s = 0; s < slots.length; s++) {
        pushTelegraph(telegraphs, slots[s].x, slots[s].y, lead);
      }
    }
  }

  private maybeShowClear(
    world: World<CoreComponentRegistry>,
    state: WaveDirectorState,
    script: WaveScript
  ): void {
    if (state.pendingStaggers.length > 0) return;
    const idx = state.nextEventIndex - 1;
    if (idx < 0 || idx === this.lastClearEventIndex) return;

    const events = script.events;
    const next = events[state.nextEventIndex];
    const gap = next ? next.t - state.elapsed : 999;
    if (gap < 1.2 && next) return;

    this.lastClearEventIndex = idx;
    const enemies = world.query("Enemy");
    // Soft clear: banner even if a few still alive — emphasis on rhythm
    world.setResource(WAVE_BANNER_RESOURCE, {
      text: enemies.length === 0 ? "CLEAR" : "PUSH ON",
      remaining: 1.35,
      sub: script.name
    });
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
  world.setResource(WAVE_TELEGRAPHS_RESOURCE, []);
  world.setResource(WAVE_BANNER_RESOURCE, {
    text: script.name ?? script.id.toUpperCase(),
    remaining: 1.5,
    sub: "INCOMING"
  });
}

export function stopWaveDirector(world: World<CoreComponentRegistry>): void {
  const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
  if (state) {
    state.active = false;
  }
}
