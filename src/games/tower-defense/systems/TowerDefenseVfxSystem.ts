import { System, SystemPhase, World } from "@tiny-aster/core";
import type { GridLayout } from "../../shared/grid/GridTypes";
import type {
  GameStateComponent,
  TileGrid,
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  TowerDefenseVisualEffect,
  TowerDefenseVisualEffects,
  TDPhase,
} from "../types/TowerDefenseTypes";

const VISUAL_EFFECTS_RESOURCE = "TowerDefenseVisualEffects";
const VFX_COLORS = {
  grunt: "#ff9b54",
  fast: "#66d9ff",
  tank: "#b9c5d8",
  boss: "#d78bff",
  reward: "#ffd54f",
  danger: "#ff5252",
  info: "#71eaff",
} as const;

/** Presentation-only effects; these values never influence gameplay decisions. */
export class TowerDefenseVfxSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.Presentation;

  private bound = false;
  private unsubscribers: Array<() => void> = [];
  private previousPhase: TDPhase | undefined;
  private nextEffectId = 1;
  private resetPending = false;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, dt: number): void {
    if (world.isReSimulating) return;
    this.bindEvents(world);

    const safeDelta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    const current = this.resetPending
      ? { elapsedSeconds: 0, effects: [] as TowerDefenseVisualEffect[] }
      : world.getResource<TowerDefenseVisualEffects>(VISUAL_EFFECTS_RESOURCE) ?? {
          elapsedSeconds: 0,
          effects: [],
        };
    this.resetPending = false;

    const elapsedSeconds = current.elapsedSeconds + safeDelta;
    const effects = current.effects
      .map((effect) => ({ ...effect, ageSeconds: effect.ageSeconds + safeDelta }))
      .filter((effect) => effect.ageSeconds < effect.durationSeconds);

    const gameState = world.getSingleton("GameState") as GameStateComponent | undefined;
    if (gameState) {
      if (this.previousPhase !== undefined && this.previousPhase !== gameState.phase) {
        const banner = this.resolvePhaseBanner(world, gameState, this.previousPhase);
        if (banner) {
          effects.push(this.createEffect({
            kind: "phase-banner",
            x: banner.x,
            y: banner.y,
            durationSeconds: banner.durationSeconds,
            color: banner.color,
            text: banner.text,
          }));
        }
      } else if (this.previousPhase === undefined && (gameState.phase === "victory" || gameState.phase === "game_over")) {
        const banner = this.resolvePhaseBanner(world, gameState, undefined);
        if (banner) effects.push(this.createEffect(world, {
          kind: "phase-banner",
          x: banner.x,
          y: banner.y,
          durationSeconds: banner.durationSeconds,
          color: banner.color,
          text: banner.text,
        }));
      }
      this.previousPhase = gameState.phase;
    }

    world.setResource<TowerDefenseVisualEffects>(VISUAL_EFFECTS_RESOURCE, { elapsedSeconds, effects });
  }

  reset(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.bound = false;
    this.previousPhase = undefined;
    this.nextEffectId = 1;
    this.resetPending = true;
  }

  private bindEvents(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    if (this.bound) return;
    const bus = world.getEventBus();
    if (!bus?.on) return;

    const killedUnsubscribe = bus.on("creep:killed", (event) => {
      if (world.isReSimulating) return;
      const transform = world.getComponent(event.entity, "Transform");
      const x = event.x ?? transform?.x ?? 0;
      const y = event.y ?? transform?.y ?? 0;
      const color = VFX_COLORS[event.creepType as keyof typeof VFX_COLORS] ?? VFX_COLORS.grunt;

      this.enqueue(world, {
        kind: "enemy-death",
        x,
        y,
        durationSeconds: event.creepType === "boss" ? 0.85 : 0.55,
        color,
        creepType: event.creepType,
      });
      this.enqueue(world, {
        kind: "gold-reward",
        x,
        y,
        durationSeconds: 0.9,
        color: VFX_COLORS.reward,
        amount: event.reward,
      });
    });
    if (typeof killedUnsubscribe === "function") this.unsubscribers.push(killedUnsubscribe);

    const baseUnsubscribe = bus.on("creep:reached_base", (event) => {
      if (world.isReSimulating) return;
      const transform = world.getComponent(event.entity, "Transform");
      const position = event.x !== undefined && event.y !== undefined
        ? { x: event.x, y: event.y }
        : this.resolveBasePosition(world, transform?.x ?? 0, transform?.y ?? 0);
      this.enqueue(world, {
        kind: "base-hit",
        x: position.x,
        y: position.y,
        durationSeconds: 0.8,
        color: VFX_COLORS.danger,
      });
    });
    if (typeof baseUnsubscribe === "function") this.unsubscribers.push(baseUnsubscribe);

    this.bound = true;
  }

  private enqueue(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    effect: Omit<TowerDefenseVisualEffect, "id" | "ageSeconds">
  ): void {
    if (world.isReSimulating) return;
    const current = world.getResource<TowerDefenseVisualEffects>(VISUAL_EFFECTS_RESOURCE) ?? {
      elapsedSeconds: 0,
      effects: [],
    };
    world.setResource<TowerDefenseVisualEffects>(VISUAL_EFFECTS_RESOURCE, {
      ...current,
      effects: [...current.effects, { ...effect, id: this.nextEffectId++, ageSeconds: 0 }],
    });
  }

  private createEffect(
    effect: Omit<TowerDefenseVisualEffect, "id" | "ageSeconds">
  ): TowerDefenseVisualEffect {
    return { ...effect, id: this.nextEffectId++, ageSeconds: 0 };
  }

  private resolvePhaseBanner(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    gameState: GameStateComponent,
    previousPhase: TDPhase | undefined
  ): { x: number; y: number; text: string; color: string; durationSeconds: number } | null {
    const center = this.resolveMapCenter(world);
    if (gameState.phase === "wave") {
      return { ...center, text: `WAVE ${gameState.wave + 1} INCOMING`, color: VFX_COLORS.info, durationSeconds: 1.4 };
    }
    if (gameState.phase === "intermission" && previousPhase === "wave") {
      return { ...center, text: "WAVE CLEARED", color: VFX_COLORS.reward, durationSeconds: 1.3 };
    }
    if (gameState.phase === "build" && previousPhase === "intermission") {
      return { ...center, text: "PREPARE DEFENSES", color: VFX_COLORS.info, durationSeconds: 1.0 };
    }
    if (gameState.phase === "victory") {
      return { ...center, text: "SECTOR SECURE", color: VFX_COLORS.reward, durationSeconds: 2.2 };
    }
    if (gameState.phase === "game_over") {
      return { ...center, text: "BASE DESTROYED", color: VFX_COLORS.danger, durationSeconds: 2.2 };
    }
    return null;
  }

  private resolveMapCenter(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>
  ): { x: number; y: number } {
    const layout = world.getResource<GridLayout>("GridLayout");
    return layout
      ? { x: layout.offsetX + layout.stepX * 8, y: layout.offsetY + layout.stepY * 0.65 }
      : { x: 400, y: 64 };
  }

  private resolveBasePosition(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    fallbackX: number,
    fallbackY: number
  ): { x: number; y: number } {
    const layout = world.getResource<GridLayout>("GridLayout");
    const grid = world.getResource<TileGrid>("TileGrid");
    if (!layout || !grid) return { x: fallbackX, y: fallbackY };
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (grid.tiles[row]?.[col] === "base") {
          return {
            x: layout.offsetX + col * layout.stepX + layout.stepX / 2,
            y: layout.offsetY + row * layout.stepY + layout.stepY / 2,
          };
        }
      }
    }
    return { x: fallbackX, y: fallbackY };
  }
}
