import { World, CoreComponentRegistry, Entity, Juice } from "@tiny-aster/core";
import { getVFXState, VFXWorldState } from "./SharedVFXInternal";
import { requestHitStop, HitStopPriority } from "./HitStopSystem";

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
  | "warp_lines";

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/JuiceOrchestrator.ts:32-44. Considerar extraer a función compartida. Ref: 1fa91b1e
export interface JuiceSpawnOptions {
  x?: number;
  y?: number;
  tint?: string;
  scale?: number;
  intensity?: number;
  ttl?: number;
  text?: string;
  hitStopMs?: number;
  hitStopPriority?: HitStopPriority | number;
  shakeIntensity?: number;
  shakeDurationMs?: number;
}

export interface JuiceProfile {
  effect: SharedVFXPrimitiveName;
  tint?: string;
  scale?: number;
  intensity?: number;
  ttl?: number;
  text?: string;
  hitStopMs?: number;
  hitStopPriority?: HitStopPriority | number;
  shakeIntensity?: number;
  shakeDurationMs?: number;
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

export const JUICE_CATALOG: Record<SupportedGameId, Record<string, JuiceProfile>> = {
  pong: {
    "ball:rally": { effect: "warp_lines", tint: "#00f3ff", intensity: 1.0, scale: 1.0 },
    "paddle:hit": { effect: "shockwave", tint: "#00f3ff", scale: 0.8, ttl: 0.2, hitStopMs: 30, hitStopPriority: HitStopPriority.LOW, shakeIntensity: 1.5, shakeDurationMs: 40 },
    "goal:scored": { effect: "shockwave", tint: "#ff0055", scale: 1.5, ttl: 0.5, hitStopMs: 100, hitStopPriority: HitStopPriority.HIGH, shakeIntensity: 4.0, shakeDurationMs: 120 }
  },
  asteroids: {
    "rock:destroyed": { effect: "shockwave", tint: "#ffaa00", scale: 1.2, ttl: 0.4, hitStopMs: 40, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 2.5, shakeDurationMs: 80 },
    "ship:damage": { effect: "screen_border_glow", tint: "#ff0000", scale: 1.0, ttl: 0.3, hitStopMs: 150, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 5.0, shakeDurationMs: 150 },
    "ship:fire": { effect: "thruster_flame", tint: "#00f3ff", scale: 0.7, ttl: 0.15 }
  },
  "space-invaders": {
    "shield:degraded": { effect: "hologram_glitch", tint: "#39ff14", scale: 1.0, ttl: 0.3, hitStopMs: 30, hitStopPriority: HitStopPriority.LOW },
    "alien:destroyed": { effect: "shockwave", tint: "#ff00ff", scale: 1.0, ttl: 0.3, hitStopMs: 40, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 2.0, shakeDurationMs: 60 },
    "ufo:destroyed": { effect: "shockwave", tint: "#ffff00", scale: 1.8, ttl: 0.6, hitStopMs: 120, hitStopPriority: HitStopPriority.HIGH, shakeIntensity: 4.5, shakeDurationMs: 140 }
  },
  arkanoid: {
    "brick:shatter": { effect: "shockwave", tint: "#ff0055", scale: 0.8, ttl: 0.25, hitStopMs: 30, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 1.5, shakeDurationMs: 50 },
    "paddle:bounce": { effect: "shield_bubble", tint: "#00f3ff", scale: 0.9, ttl: 0.2 },
    "boss:hit": { effect: "hologram_glitch", tint: "#ff3300", scale: 1.5, ttl: 0.4, hitStopMs: 80, hitStopPriority: HitStopPriority.HIGH, shakeIntensity: 3.5, shakeDurationMs: 100 }
  },
  flappybird: {
    "pipe:passed": { effect: "floating_text", tint: "#ffff00", scale: 1.0, ttl: 0.5, text: "+1" },
    "bird:flap": { effect: "comet_trail", tint: "#00f3ff", scale: 0.6, ttl: 0.2 },
    "bird:crash": { effect: "shockwave", tint: "#ff0000", scale: 1.4, ttl: 0.4, hitStopMs: 150, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 5.0, shakeDurationMs: 150 }
  },
  frogger: {
    "goal:reached": { effect: "shield_bubble", tint: "#00f3ff", scale: 1.4, ttl: 0.6, hitStopMs: 80, hitStopPriority: HitStopPriority.HIGH },
    "frog:hop": { effect: "comet_trail", tint: "#39ff14", scale: 0.5, ttl: 0.15 },
    "frog:splat": { effect: "shockwave", tint: "#ff0000", scale: 1.2, ttl: 0.4, hitStopMs: 150, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 4.0, shakeDurationMs: 120 }
  },
  "geometry-wars": {
    "enemy:destroyed": { effect: "shockwave", tint: "#ff00ff", scale: 1.5, ttl: 0.4, hitStopMs: 50, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 3.0, shakeDurationMs: 80 },
    "bomb:trigger": { effect: "singularity", tint: "#00f3ff", scale: 2.5, ttl: 0.8, hitStopMs: 200, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 7.0, shakeDurationMs: 200 },
    "player:death": { effect: "shockwave", tint: "#ff0000", scale: 2.0, ttl: 0.6, hitStopMs: 250, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 8.0, shakeDurationMs: 250 }
  },
  platformer: {
    "player:damage": { effect: "screen_border_glow", tint: "#ff0000", scale: 1.0, ttl: 0.3, hitStopMs: 120, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 4.0, shakeDurationMs: 120 },
    "coin:collected": { effect: "floating_text", tint: "#ffff00", scale: 0.9, ttl: 0.4, text: "+10" },
    "enemy:stomp": { effect: "shockwave", tint: "#39ff14", scale: 1.0, ttl: 0.3, hitStopMs: 40, hitStopPriority: HitStopPriority.NORMAL, shakeIntensity: 2.0, shakeDurationMs: 60 }
  },
  "echo-runner": {
    "echo:ghost": { effect: "hologram_glitch", tint: "#00f3ff", scale: 1.0, ttl: 0.3 },
    "dash:boost": { effect: "comet_trail", tint: "#ff00ff", scale: 1.2, ttl: 0.25 },
    "obstacle:hit": { effect: "screen_border_glow", tint: "#ff0000", scale: 1.0, ttl: 0.3, hitStopMs: 100, hitStopPriority: HitStopPriority.CRITICAL, shakeIntensity: 3.5, shakeDurationMs: 100 }
  }
};

export class JuiceOrchestrator {
  private world: World<CoreComponentRegistry>;

  constructor(world: World<CoreComponentRegistry>) {
    this.world = world;
  }

  /**
   * Spawns a visual effect primitive with zero-allocation deferral during system ticks.
   * FR-1: High-level single-line API.
   */
  public spawn(effectName: SharedVFXPrimitiveName, options?: JuiceSpawnOptions): number | null {
    const state = getVFXState(this.world);
    const juiceLevel = state.juiceLevel ?? 1.0;

    // FR-6: Low stimulation mode disables shake & flashes and suppresses background screen-filling effects
    const scale = (options?.scale ?? 1.0) * juiceLevel;
    const ttlSeconds = (options?.ttl ?? 0.4) * Math.max(0.2, juiceLevel);
    const tint = options?.tint;
    const x = options?.x ?? 0;
    const y = options?.y ?? 0;

    // Trigger hit-stop if requested
    if (options?.hitStopMs && options.hitStopMs > 0) {
      const scaledHitStop = state.lowStimulationMode ? Math.min(options.hitStopMs, 30) : options.hitStopMs * juiceLevel;
      requestHitStop(this.world, scaledHitStop, options.hitStopPriority ?? HitStopPriority.NORMAL);
    }

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
      rotation: 0,
      scaleX: scale,
      scaleY: scale,
      worldX: x,
      worldY: y,
      worldRotation: 0,
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
      hitFlashFrames: 0
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
   * Triggers a semantic event mapped in `JuiceMap` for the specified game.
   * FR-4: Semantic per-game mapping.
   */
  public triggerEvent(gameId: SupportedGameId, eventName: string, context?: { x?: number; y?: number; overrideTint?: string }): void {
    const gameMap = JUICE_CATALOG[gameId];
    if (!gameMap) return;

    const profile = gameMap[eventName];
    if (!profile) return;

    this.spawn(profile.effect, {
      x: context?.x,
      y: context?.y,
      tint: context?.overrideTint || profile.tint,
      scale: profile.scale,
      intensity: profile.intensity,
      ttl: profile.ttl,
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
