import {
  System,
  World,
  CoreComponentRegistry,
  EventBus,
  SystemPhase,
  Entity
} from "@tiny-aster/core";

export interface ScorePopupSlot {
  active: boolean;
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  lifetime: number;
}

export interface HitRunScoreState {
  score: number;
  comboMultiplier: number;
  comboHits: number;
  comboTimer: number;
  popupPool: ScorePopupSlot[];
}

export const HIT_RUN_SCORE_RESOURCE = "HitRunScoreState";

const COMBO_WINDOW = 2.5;

export class HitRunScoreSystem extends System<CoreComponentRegistry> {
  private subscribed = false;
  private nextPopupId = 1;

  public subscribe(bus: EventBus, world: World<CoreComponentRegistry>): void {
    if (this.subscribed) return;
    this.subscribed = true;

    bus.on("combat:death", (payload: unknown) => {
      const data = payload as { entity?: Entity; category?: string; sourceEntity?: Entity };
      this.onEnemyKilled(world, data);
    });

    bus.on("combat:pow_rescued", (payload: unknown) => {
      const data = payload as { entity?: Entity; dropType?: string };
      this.onPowRescued(world, data);
    });
  }

  private createInitialPool(): ScorePopupSlot[] {
    const pool: ScorePopupSlot[] = [];
    for (let i = 0; i < 24; i++) {
      pool.push({
        active: false,
        id: 0,
        text: "",
        x: 0,
        y: 0,
        color: "#fbbf24",
        opacity: 0,
        lifetime: 0
      });
    }
    return pool;
  }

  public update(world: World<CoreComponentRegistry>, dt: number): void {
    let state = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
    if (!state) {
      state = {
        score: 0,
        comboMultiplier: 1,
        comboHits: 0,
        comboTimer: 0,
        popupPool: this.createInitialPool()
      };
      world.setResource(HIT_RUN_SCORE_RESOURCE, state);
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.comboHits = 0;
        state.comboMultiplier = 1;
      }
    }

    // Tick floating score popup pool (zero allocations)
    const pool = state.popupPool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;

      p.lifetime -= dt;
      p.y -= 25 * dt;
      p.opacity = Math.max(0, p.lifetime / 0.8);
      if (p.lifetime <= 0) {
        p.active = false;
      }
    }
  }

  public addScore(
    world: World<CoreComponentRegistry>,
    amount: number,
    x?: number,
    y?: number,
    label?: string,
    color = "#fbbf24"
  ): void {
    let state = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
    if (!state) {
      state = {
        score: 0,
        comboMultiplier: 1,
        comboHits: 0,
        comboTimer: 0,
        popupPool: this.createInitialPool()
      };
      world.setResource(HIT_RUN_SCORE_RESOURCE, state);
    }

    const earned = Math.round(amount * state.comboMultiplier);
    state.score += earned;

    if (x !== undefined && y !== undefined) {
      this.spawnPopupSlot(state.popupPool, label ? `${label} +${earned}` : `+${earned}`, x, y, color);
    }
  }

  private spawnPopupSlot(pool: ScorePopupSlot[], text: string, x: number, y: number, color: string): void {
    let slot = pool.find((s) => !s.active);
    if (!slot) {
      // Overwrite oldest slot if pool is exhausted
      slot = pool[0];
    }
    slot.active = true;
    slot.id = this.nextPopupId++;
    slot.text = text;
    slot.x = x;
    slot.y = y;
    slot.color = color;
    slot.opacity = 1;
    slot.lifetime = 0.8;
  }

  private onEnemyKilled(world: World<CoreComponentRegistry>, data: { entity?: Entity; category?: string; sourceEntity?: Entity }): void {
    if (!world) return;

    let state = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
    if (!state) {
      state = { score: 0, comboMultiplier: 1, comboHits: 0, comboTimer: 0, popupPool: this.createInitialPool() };
      world.setResource(HIT_RUN_SCORE_RESOURCE, state);
    }

    state.comboHits++;
    state.comboTimer = COMBO_WINDOW;
    state.comboMultiplier = Math.min(4, 1 + Math.floor(state.comboHits / 3) * 0.5);

    let basePoints = 100;
    if (data.category === "explosive") basePoints = 150;
    else if (data.category === "shotgun") basePoints = 120;

    let x: number | undefined;
    let y: number | undefined;
    if (data.entity !== undefined && world.hasEntity(data.entity)) {
      const tr = world.getComponent(data.entity, "Transform");
      if (tr) {
        x = tr.worldX ?? tr.x;
        y = tr.worldY ?? tr.y;
      }
    }

    const earned = Math.round(basePoints * state.comboMultiplier);
    state.score += earned;

    if (x !== undefined && y !== undefined) {
      const multStr = state.comboMultiplier > 1 ? ` x${state.comboMultiplier}` : "";
      this.spawnPopupSlot(state.popupPool, `+${earned}${multStr}`, x, y, "#ef4444");
    }
  }

  private onPowRescued(world: World<CoreComponentRegistry>, data: { entity?: Entity; dropType?: string }): void {
    if (!world) return;

    let x: number | undefined;
    let y: number | undefined;
    if (data.entity !== undefined && world.hasEntity(data.entity)) {
      const tr = world.getComponent(data.entity, "Transform");
      if (tr) {
        x = tr.worldX ?? tr.x;
        y = tr.worldY ?? tr.y;
      }
    }

    this.addScore(world, 500, x, y, "POW SAVED!", "#3b82f6");
  }
}

export function registerHitRunScoreSystem(world: World<CoreComponentRegistry>): HitRunScoreSystem {
  const sys = new HitRunScoreSystem();
  world.addSystem(sys, { phase: SystemPhase.GameRules, priority: 10 });
  const bus = world.getEventBus();
  if (bus) sys.subscribe(bus, world);
  const initPool: ScorePopupSlot[] = [];
  for (let i = 0; i < 24; i++) {
    initPool.push({ active: false, id: 0, text: "", x: 0, y: 0, color: "#fbbf24", opacity: 0, lifetime: 0 });
  }
  world.setResource(HIT_RUN_SCORE_RESOURCE, {
    score: 0,
    comboMultiplier: 1,
    comboHits: 0,
    comboTimer: 0,
    popupPool: initPool
  } satisfies HitRunScoreState);
  return sys;
}
