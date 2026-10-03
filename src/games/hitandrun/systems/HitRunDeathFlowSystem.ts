/**
 * Death → brief slow-mo → auto restart (or flag for UI).
 * Listens PlayerDied; presentation-friendly without blocking netcode paths.
 */
import {
  System,
  World,
  CoreComponentRegistry,
  RunState
} from "@tiny-aster/core";
import type { EventBus } from "@tiny-aster/core";

export interface HitRunDeathFlowState {
  active: boolean;
  /** Time left in slow-mo before restart signal */
  remaining: number;
  /** Set true when UI/game should call restart */
  requestRestart: boolean;
}

export const DEATH_FLOW_RESOURCE = "HitRunDeathFlow";

const SLOW_MO_DURATION = 0.45;
const SLOW_MO_SCALE = 0.28;

export class HitRunDeathFlowSystem extends System<CoreComponentRegistry> {
  private subscribed = false;
  private pendingDeath = false;

  public subscribe(bus: EventBus): void {
    if (this.subscribed) return;
    this.subscribed = true;
    bus.on("PlayerDied", () => {
      this.pendingDeath = true;
    });
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    let flow = world.getResource<HitRunDeathFlowState>(DEATH_FLOW_RESOURCE);
    if (!flow) {
      flow = { active: false, remaining: 0, requestRestart: false };
      world.setResource(DEATH_FLOW_RESOURCE, flow);
    }

    if (this.pendingDeath && !flow.active) {
      this.pendingDeath = false;
      flow.active = true;
      flow.remaining = SLOW_MO_DURATION;
      flow.requestRestart = false;
      world.setResource("TimeScale", SLOW_MO_SCALE);

      const rs = world.getResource<RunState>("RunState");
      if (rs) rs.deaths = (rs.deaths ?? 0) + 1;

      if (!world.isReSimulating) {
        const bus = world.getEventBus();
        bus?.emit("PlaySFX", { name: "game_over" });
      }
    }

    if (!flow.active) return;

    // Use unscaled feel: advance with real dt * scale so remaining is wall-ish
    const scale = (world.getResource<number>("TimeScale") as number) ?? 1;
    flow.remaining -= deltaTime / Math.max(0.05, scale);

    if (flow.remaining <= 0) {
      flow.active = false;
      flow.requestRestart = true;
      world.setResource("TimeScale", 1);
    }
  }
}

export function registerHitRunDeathFlow(world: World<CoreComponentRegistry>): HitRunDeathFlowSystem {
  const sys = new HitRunDeathFlowSystem();
  world.addSystem(sys, { phase: "Simulation" as never, priority: 90 });
  // Fix phase - use SystemPhase via import in register file
  const bus = world.getEventBus();
  if (bus) sys.subscribe(bus);
  world.setResource(DEATH_FLOW_RESOURCE, {
    active: false,
    remaining: 0,
    requestRestart: false
  } satisfies HitRunDeathFlowState);
  return sys;
}
