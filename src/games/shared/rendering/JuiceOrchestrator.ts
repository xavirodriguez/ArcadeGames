import { World, CoreComponentRegistry, Entity, Juice } from "@tiny-aster/core";
import { colors } from "../../../theme/colors";
import { getVFXState, VFXWorldState } from "./SharedVFXInternal";
import { requestHitStop, HitStopPriority } from "./HitStopSystem";
import {
  resolveVFXPlacement,
  resolveVFXSemanticColor,
  VFX_VISUAL_PROFILES,
  type VFXEffectDescriptor
} from "./VFXEffectIR";

export type SharedVFXPrimitiveName =
  | "shockwave"
  | "shield_bubble"
  | "thruster_flame"
  | "laser_beam"
  | "singularity"
  | "comet_trail"
  | "hologram_glitch"
  | "floating_text"
  | "screen_border_glow"
  | "warp_lines"
  | "pixelfx_impact"
  | "pixelfx_hitstun"
  | "pixelfx_stagger"
  | "pixelfx_slash"
  | "pixelfx_explosion"
  | "pixelfx_dust"
  | "pixelfx_pickup"
  | "pixelfx_muzzle"
  | "pixelfx_shield_crack"
  | "pixelfx_ink_burst"
  | "pixelfx_paddle_impact"
  | "pixelfx_brick_shatter"
  | "pixelfx_flap_gust"
  | "pixelfx_hop"
  | "pixelfx_phase_dash"
  | "pixelfx_ricochet"
  | "pixelfx_charge"
  | "pixelfx_shield_pulse"
  | "pixelfx_parry"
  | "pixelfx_perfect_block"
  | "pixelfx_critical_hit"
  | "pixelfx_projectile_deflection"
  | "pixelfx_guard_break"
  | "pixelfx_armor_break"
  | "pixelfx_combo_finisher"
  | "pixelfx_target_warning"
  | "pixelfx_teleport"
  | "pixelfx_surface_skid"
  | "pixelfx_mechanical_motion"
  | "pixelfx_heal"
  | "pixelfx_poison"
  | "pixelfx_burn"
  | "pixelfx_frost"
  | "pixelfx_electric"
  | "pixelfx_bleed"
  | "pixelfx_buff"
  | "pixelfx_debuff"
  | "pixelfx_spawn"
  | "pixelfx_death"
  | "pixelfx_nova"
  | "pixelfx_vortex"
  | "pixelfx_meteor"
  | "pixelfx_rift"
  | "pixelfx_arc_chain"
  | "pixelfx_gravity_well"
  | "pixelfx_blade_dance"
  | "pixelfx_seismic_wave"
  | "pixelfx_soul_reap"
  | "pixelfx_time_warp"
  | "pixelfx_afterimage"
  | "pixelfx_sonic_boom"
  | "pixelfx_plasma_bloom"
  | "pixelfx_crystal_shards"
  | "pixelfx_smoke_column"
  | "pixelfx_tether_snare"
  | "pixelfx_spark_rain"
  | "pixelfx_rune_seal"
  | "pixelfx_wind_shear"
  | "pixelfx_pulse_mine";

/**
 * Base configuration options shared across Juice spawn calls and catalog profiles.
 * @public
 */
export interface BaseJuiceOptions {
  tint?: string;
  scale?: number;
  intensity?: number;
  ttl?: number;
  /** Visual animation duration in seconds; independent from entity lifetime. */
  animDuration?: number;
  text?: string;
  hitStopMs?: number;
  hitStopPriority?: HitStopPriority | number;
  shakeIntensity?: number;
  shakeDurationMs?: number;
}

/**
 * Runtime options passed when spawning a visual juice effect.
 * @public
 */
export interface JuiceSpawnOptions extends BaseJuiceOptions {
  x?: number;
  y?: number;
  rotation?: number;
}

/**
 * Catalog profile definition binding a juice effect primitive with default options.
 * @public
 */
export interface JuiceProfile extends BaseJuiceOptions {
  effect: SharedVFXPrimitiveName;
  pixelFxId?: string;
}

export type SupportedGameId =
  | "pong"
  | "asteroids"
  | "space-invaders"
  | "arkanoid"
  | "flappybird"
  | "frogger"
  | "geometry-wars"
  | "platformer"
  | "echo-runner";

export const JUICE_CATALOG = {
  pong: {
    "ball:rally": { effect: "warp_lines", tint: colors.cyan, intensity: 1.0, scale: 1.0 },
    "paddle:hit": { effect: "pixelfx_paddle_impact", tint: colors.cyan, scale: 0.9, ttl: 0.22, hitStopMs: 60, hitStopPriority: HitStopPriority.LOW, shakeIntensity: 0, shakeDurationMs: 40 },
    "goal:scored": { effect: "shockwave", tint: colors.danger, scale: 1.5, ttl: 0.5, hitStopMs: 100, hitStopPriority: HitStopPriority.HIGH, shakeIntensity: 4.0, shakeDurationMs: 120 }
  },
  asteroids: {
    "rock:destroyed": { effect: "pixelfx_explosion", tint: colors.warning, scale: 1.2, ttl: 0.42, hitStopMs: 40, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 2.5, shakeDurationMs: 80 },
    "ship:damage": { effect: "screen_border_glow", tint: colors.danger, scale: 1.0, ttl: 0.3, hitStopMs: 150, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 5.0, shakeDurationMs: 150 },
    "ship:fire": { effect: "thruster_flame", tint: colors.cyan, scale: 0.7, ttl: 0.15 }
  },
  "space-invaders": {
    "shield:degraded": { effect: "hologram_glitch", tint: colors.green, scale: 1.0, ttl: 0.3, hitStopMs: 30, hitStopPriority: HitStopPriority.LOW },
    "alien:destroyed": { effect: "shockwave", tint: colors.magenta, scale: 1.0, ttl: 0.3, hitStopMs: 40, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 2.0, shakeDurationMs: 60 },
    "ufo:destroyed": { effect: "shockwave", tint: colors.yellow, scale: 1.8, ttl: 0.6, hitStopMs: 120, hitStopPriority: HitStopPriority.HIGH, shakeIntensity: 4.5, shakeDurationMs: 140 }
  },
  arkanoid: {
    "brick:shatter": { effect: "pixelfx_brick_shatter", tint: colors.danger, scale: 0.95, ttl: 0.32, hitStopMs: 30, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 1.5, shakeDurationMs: 50 },
    "brick:hit": { effect: "shockwave", tint: colors.cyan, scale: 0.6, ttl: 0.15, hitStopMs: 30, hitStopPriority: HitStopPriority.LOW, shakeIntensity: 1.0, shakeDurationMs: 30 },
    "paddle:bounce": { effect: "shield_bubble", tint: colors.cyan, scale: 0.9, ttl: 0.2 },
    "boss:hit": { effect: "hologram_glitch", tint: colors.redHot, scale: 1.5, ttl: 0.4, hitStopMs: 80, hitStopPriority: HitStopPriority.HIGH, shakeIntensity: 3.5, shakeDurationMs: 100 }
  },
  flappybird: {
    "pipe:passed": { effect: "floating_text", tint: colors.yellow, scale: 1.0, ttl: 0.5, text: "+1" },
    "bird:flap": { effect: "pixelfx_flap_gust", tint: colors.cyan, scale: 0.65, ttl: 0.2 },
    "bird:crash": { effect: "shockwave", tint: colors.danger, scale: 1.4, ttl: 0.4, hitStopMs: 150, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 5.0, shakeDurationMs: 150 }
  },
  frogger: {
    "goal:reached": { effect: "shield_bubble", tint: colors.cyan, scale: 1.4, ttl: 0.6, hitStopMs: 80, hitStopPriority: HitStopPriority.HIGH },
    "frog:hop": { effect: "pixelfx_hop", tint: colors.green, scale: 0.55, ttl: 0.18 },
    "frog:splat": { effect: "shockwave", tint: colors.danger, scale: 1.2, ttl: 0.4, hitStopMs: 150, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 4.0, shakeDurationMs: 120 }
  },
  "geometry-wars": {
    "enemy:destroyed": { effect: "shockwave", tint: colors.magenta, scale: 1.5, ttl: 0.4, hitStopMs: 50, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 3.0, shakeDurationMs: 80 },
    "bomb:trigger": { effect: "singularity", tint: colors.cyan, scale: 2.5, ttl: 0.8, hitStopMs: 200, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 7.0, shakeDurationMs: 200 },
    "player:death": { effect: "shockwave", tint: colors.danger, scale: 2.0, ttl: 0.6, hitStopMs: 250, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 8.0, shakeDurationMs: 250 }
  },
  platformer: {
    "player:damage": { effect: "pixelfx_impact", tint: colors.danger, scale: 1.0, ttl: 0.3, hitStopMs: 120, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 4.0, shakeDurationMs: 120 },
    "coin:collected": { effect: "floating_text", tint: colors.yellow, scale: 0.9, ttl: 0.4, text: "+10" },
    "enemy:stomp": { effect: "pixelfx_impact", tint: colors.green, scale: 1.0, ttl: 0.28, hitStopMs: 40, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 2.0, shakeDurationMs: 60 },
    "player:dash": { effect: "pixelfx_phase_dash", tint: colors.magenta, scale: 1.05, ttl: 0.24 },
    "player:slide": { effect: "pixelfx_surface_skid", tint: colors.yellow, scale: 0.9, ttl: 0.2 },
    "platform:reversed": { effect: "pixelfx_mechanical_motion", tint: colors.cyan, scale: 0.85, ttl: 0.28 }
  },
  "echo-runner": {
    "echo:ghost": { effect: "hologram_glitch", tint: colors.cyan, scale: 1.0, ttl: 0.3 },
    "dash:boost": { effect: "comet_trail", tint: colors.magenta, scale: 1.2, ttl: 0.25 },
    "obstacle:hit": { effect: "screen_border_glow", tint: colors.danger, scale: 1.0, ttl: 0.3, hitStopMs: 100, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 3.5, shakeDurationMs: 100 },
    "player:slide": { effect: "pixelfx_surface_skid", tint: colors.cyan, scale: 0.9, ttl: 0.2 },
    "platform:reversed": { effect: "pixelfx_mechanical_motion", tint: colors.green, scale: 0.85, ttl: 0.28 }
  }
} as const satisfies Record<SupportedGameId, Record<string, JuiceProfile>>;

/**
 * Strictly typed mapping of supported games to their valid semantic Juice event keys,
 * derived directly from JUICE_CATALOG.
 * @public
 */
export type GameJuiceEventMap = {
  [G in SupportedGameId]: keyof (typeof JUICE_CATALOG)[G];
};

export class JuiceOrchestrator<TComponents extends CoreComponentRegistry = CoreComponentRegistry> {
  private world: World<TComponents, any, any>;

  constructor(world: World<TComponents, any, any>) {
    this.world = world;
  }

  /**
   * Spawns a visual effect primitive with zero-allocation deferral during system ticks.
   * FR-1: High-level single-line API.
   */
  public spawn(effectName: SharedVFXPrimitiveName, options?: JuiceSpawnOptions): number | null {
    const state = getVFXState(this.world);

    // Hit-stop changes authoritative simulation state, so replay it during rollback.
    // Its duration is independent of local Juice/accessibility presentation settings.
    if (options?.hitStopMs && options.hitStopMs > 0) {
      requestHitStop(this.world, options.hitStopMs, options.hitStopPriority ?? HitStopPriority.NORMAL);
    }

    // Particles, shake and all other presentation output are never emitted during replay.
    if (this.world.isReSimulating) return null;

    const juiceLevel = state.juiceLevel ?? 1.0;

    // FR-6: Low stimulation mode disables shake & flashes and suppresses background screen-filling effects
    const scale = (options?.scale ?? 1.0) * juiceLevel;
    const ttlSeconds = (options?.ttl ?? 0.4) * Math.max(0.2, juiceLevel);
    const tint = options?.tint;
    const x = options?.x ?? 0;
    const y = options?.y ?? 0;

    // Trigger screen shake if requested (suppressed in Low Stimulation Mode)
    if (options?.shakeIntensity && options.shakeIntensity > 0 && !state.lowStimulationMode) {
      const intensity = options.shakeIntensity * juiceLevel;
      const duration = (options.shakeDurationMs ?? 100) * juiceLevel;
      if (intensity > 0 && duration > 0) {
        Juice.shake(this.world, intensity, duration);
      }
    }

    const isUpdating = this.world.isUpdating === true;

    const createEntity = (): number => {
      if (isUpdating) {
        const id = this.world.reserveEntityId();
        this.world.getCommandBuffer().createEntity(id);
        return id;
      }
      return this.world.createEntity();
    };

    const addComp = (entity: number, comp: any): void => {
      if (isUpdating) {
        this.world.getCommandBuffer().addComponent(entity, comp);
      } else {
        this.world.addComponent(entity, comp);
      }
    };

    if (effectName === "screen_border_glow") {
      // Border glow mutates world state or renders directly via background drawer
      return null;
    }

    const entity = createEntity();

    addComp(entity, {
      type: "Transform",
      x,
      y,
      rotation: options?.rotation ?? 0,
      scaleX: scale,
      scaleY: scale,
      worldX: x,
      worldY: y,
      worldRotation: options?.rotation ?? 0,
      worldScaleX: scale,
      worldScaleY: scale,
      dirty: true
    });

    const renderComp: any = {
      type: "Render",
      shape: effectName,
      size: 20 * scale,
      color: tint,
      visible: true,
      opacity: state.lowStimulationMode ? 0.4 : 1.0,
      order: 100,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      vfxAnimDuration: typeof options?.animDuration === "number" && Number.isFinite(options.animDuration) && options.animDuration > 0
        ? options.animDuration
        : ttlSeconds
    };

    if (effectName === "floating_text" && options?.text) {
      renderComp.text = options.text;
    }

    addComp(entity, renderComp);

    addComp(entity, {
      type: "TTL",
      remaining: ttlSeconds,
      timeLeft: ttlSeconds
    });

    return entity;
  }

  /**
   * Dispatches a typed semantic effect through the existing Juice/ECS lifecycle.
   * The descriptor adds meaning and profile resolution; spawn remains the sole
   * entity, TTL, rollback and presentation-side-effect boundary.
   */
  public spawnEffect(descriptor: VFXEffectDescriptor): number | null {
    const profile = VFX_VISUAL_PROFILES[descriptor.profile];
    return this.spawn(descriptor.primitive, {
      ...resolveVFXPlacement(descriptor),
      tint: resolveVFXSemanticColor(profile, descriptor.family)
    });
  }

  /**
   * Triggers a semantic event mapped in `JuiceMap` for the specified game.
   * FR-4: Semantic per-game mapping.
   */
  public triggerEvent<G extends SupportedGameId>(
    gameId: G,
    eventName: GameJuiceEventMap[G],
    context?: { x?: number; y?: number; rotation?: number; overrideTint?: string }
  ): void {
    const gameMap = JUICE_CATALOG[gameId] as Record<string, JuiceProfile> | undefined;
    if (!gameMap) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[JuiceOrchestrator] Missing catalog for game "${gameId}"`);
      }
      return;
    }

    const profile = gameMap[eventName as string] as JuiceProfile | undefined;
    if (!profile) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[JuiceOrchestrator] Missing profile for event "${String(eventName)}" in game "${gameId}"`
        );
      }
      return;
    }

    this.spawn(profile.effect, {
      x: context?.x,
      y: context?.y,
      rotation: context?.rotation,
      tint: context?.overrideTint || profile.tint,
      scale: profile.scale,
      intensity: profile.intensity,
      ttl: profile.ttl,
      animDuration: profile.animDuration,
      text: profile.text,
      hitStopMs: profile.hitStopMs,
      hitStopPriority: profile.hitStopPriority,
      shakeIntensity: profile.shakeIntensity,
      shakeDurationMs: profile.shakeDurationMs
    });
  }

  /**
   * Configures global JuiceLevel (0% - 150%) and Low-Stimulation accessibility mode.
   * FR-6: Global accessibility & scaling.
   */
  public setJuiceLevel(level: number, lowStimulationMode = false): void {
    const state = getVFXState(this.world);
    state.juiceLevel = Math.max(0, Math.min(1.5, level));
    state.lowStimulationMode = lowStimulationMode || level === 0;
  }

  /**
   * Gets current VFX World State settings.
   */
  public getState(): VFXWorldState {
    return getVFXState(this.world);
  }
}
