/**
 * Death → brief slow-mo → requestRestart for game/UI.
 */
import {
  System,
  SystemPhase,
  World,
  CoreComponentRegistry,
  Entity,
  RunState,
  TimeScale
} from "@tiny-aster/core";
import { getWeaponDefinition } from "../weapons/HitRunWeaponCatalog";
import type { EventBus } from "@tiny-aster/core";

export interface HitRunDeathFlowState {
  active: boolean;
  remaining: number;
  requestRestart: boolean;
}

export const DEATH_FLOW_RESOURCE = "HitRunDeathFlow";

const SLOW_MO_DURATION = 0.45;
const SLOW_MO_SCALE = 0.28;

export class HitRunDeathFlowSystem extends System<CoreComponentRegistry> {
  /**
   * Recovery duration is a wall-clock presentation timer. The scheduler therefore
   * passes unscaled deltaTime to this system even while gameplay is in slow motion.
   */
  public runsWhileFrozen = true;

  private subscribed = false;
  private pendingDeath = false;

  public subscribe(bus: EventBus, world: World<CoreComponentRegistry>): void {
    if (this.subscribed) return;
    this.subscribed = true;
    const queueDeath = () => {
      const flow = world.getResource<HitRunDeathFlowState>(DEATH_FLOW_RESOURCE);
      if (flow?.active || flow?.requestRestart) return;
      this.pendingDeath = true;
    };
    bus.on("PlayerDied", queueDeath);
    // HitRunCombatSystem emits combat:death for every lethal target. Bridge
    // only BeltInput/player-faction deaths into the Hit&Run recovery flow.
    bus.on("combat:death", (payload: unknown) => {
      const data = payload as { entity?: Entity };
      const entity = data.entity;
      if (entity === undefined || !world.hasEntity(entity)) return;
      const faction = world.getComponent(entity, "Faction") as
        | { value?: string; faction?: string }
        | undefined;
      if (world.hasComponent(entity, "BeltInput") ||
          faction?.value === "player" || faction?.faction === "player") {
        queueDeath();
      }
    });
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    // The scheduler still invokes runsWhileFrozen systems during an explicit pause.
    // Pause must suspend the recovery clock and defer a queued death until resume.
    if (world.getResource("IsPaused") === true) return;

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
      setTimeScale(world, SLOW_MO_SCALE);

      // Reset player weapon to fallback upon death (G3.1)
      const players = world.query("HitRunWeapon");
      for (let p = 0; p < players.length; p++) {
        const weaponState = world.getMutableComponent(players[p], "HitRunWeapon") as
          | import("../weapons/HitRunWeaponTypes").HitRunWeaponState
          | undefined;
        if (weaponState) {
          const fallback = weaponState.fallbackWeaponId ?? "longbow";
          const fallbackDef = getWeaponDefinition(fallback);
          weaponState.weaponId = fallback;
          weaponState.ammoMax = fallbackDef.ammoMax ?? Number.POSITIVE_INFINITY;
          weaponState.ammoCurrent = weaponState.ammoMax;
        }
      }

      const rs = world.getResource<RunState>("RunState");
      if (rs) rs.deaths = (rs.deaths ?? 0) + 1;

      if (!world.isReSimulating) {
        world.getEventBus()?.emit("PlaySFX", { name: "game_over" });
      }
    }

    if (!flow.active) return;

    // runsWhileFrozen gives this system the unscaled wall-clock delta. Dividing
    // by TimeScale here would double-compensate and shorten the slow-motion window.
    flow.remaining -= deltaTime;

    if (flow.remaining <= 0) {
      flow.active = false;
      flow.requestRestart = true;
      setTimeScale(world, 1);
    }
  }
}

function setTimeScale(
  world: World<CoreComponentRegistry>,
  scale: number
): void {
  const current = world.getResource<TimeScale>("TimeScale");
  if (current && typeof current === "object") {
    current.scale = scale;
    current.remainingDuration = undefined;
    return;
  }
  world.setResource("TimeScale", new TimeScale(scale));
}

export function registerHitRunDeathFlow(
  world: World<CoreComponentRegistry>
): HitRunDeathFlowSystem {
  const sys = new HitRunDeathFlowSystem();
  world.addSystem(sys, { phase: SystemPhase.Simulation, priority: 90 });
  const bus = world.getEventBus();
  if (bus) sys.subscribe(bus, world);
  world.setResource(DEATH_FLOW_RESOURCE, {
    active: false,
    remaining: 0,
    requestRestart: false
  } satisfies HitRunDeathFlowState);
  return sys;
}
