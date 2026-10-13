import { SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";
import { TowerDefenseEventBindingSystem } from "./TowerDefenseSystemUtils";

function play(world: World, name: string): void {
  if ((world as any).isReSimulating) return;
  const bus = world.getEventBus?.() ?? (world as any).eventBus;
  if (!bus) return;
  if (typeof bus.emitDeferred === "function") {
    bus.emitDeferred("PlaySFX", { name });
  } else {
    bus.emit?.("PlaySFX", { name });
  }
}

/**
 * Maps TD domain events to shared arcade SFX ids.
 */
export class TowerDefenseAudioSystem extends TowerDefenseEventBindingSystem {
  readonly phase = SystemPhase.Presentation;

  protected override bindEvents(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const bus = world.getEventBus?.() ?? (world as any).eventBus;
    if (!bus?.on) return;

    bus.on("tower:built", () => play(world, "menu_confirm"));
    bus.on("tower:sold", () => play(world, "menu_confirm"));
    bus.on("tower:upgraded", () => play(world, "score"));
    bus.on("creep:killed", () => play(world, "explosion_small"));
    bus.on("wave:started", () => play(world, "wave_start"));
    bus.on("wave:cleared", () => play(world, "score"));
  }
}
