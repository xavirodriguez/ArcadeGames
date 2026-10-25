import {
  System,
  World,
  CoreComponentRegistry,
  enterGameplayFreeze,
  getGameplayFreezeRemaining,
  isGameplayFrozen
} from "@tiny-aster/core";
import type { EventBus } from "@tiny-aster/core";
import {
  CombatHitPayload,
  CombatDeathPayload,
  HitRunFeedbackConfig,
  HitFeedbackProfile,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG
} from "./HitRunFeedbackTypes";

/**
 * HitRunFeedbackSystem — combat juice (Paso B).
 *
 * - Hit-stop canónico: utiliza `GameplayFreeze` del motor core vía `enterGameplayFreeze`.
 * - Screen shake: presentation only — skipped when world.isReSimulating.
 *   Writes core ScreenShake on main Camera2D so ScreenShakeSystem can drive VisualOffset.
 * - hitFlashFrames on victim Render (also skipped on re-sim).
 */
import { CombatHitListenerSystem } from "../combat/CombatHitListenerSystem";

export class HitRunFeedbackSystem extends CombatHitListenerSystem<CombatHitPayload> {
  private config: HitRunFeedbackConfig;
  private pendingDeaths: CombatDeathPayload[] = [];

  constructor(config: Partial<HitRunFeedbackConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_HIT_RUN_FEEDBACK_CONFIG,
      ...config,
      byCategory: {
        ...DEFAULT_HIT_RUN_FEEDBACK_CONFIG.byCategory,
        ...(config.byCategory ?? {})
      }
    };
  }

  protected override onSubscribe(eventBus: EventBus): void {
    eventBus.on("combat:death", (payload: unknown) => {
      this.pendingDeaths.push(payload as CombatDeathPayload);
    });
  }

  /** Test helper: enqueue without going through the bus. */
  public enqueueHitForTest(payload: CombatHitPayload): void {
    this.pendingHits.push(payload);
  }

  public enqueueDeathForTest(payload: CombatDeathPayload): void {
    this.pendingDeaths.push(payload);
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const reSim = world.isReSimulating === true;

    if (this.pendingHits.length > 0) {
      this.processHits(world, reSim);
      this.pendingHits.length = 0;
    }
    if (this.pendingDeaths.length > 0) {
      this.processDeaths(world, reSim);
      this.pendingDeaths.length = 0;
    }
  }

  private applyHitStop(world: World<CoreComponentRegistry>, seconds: number): void {
    if (seconds <= 0) return;
    const current = getGameplayFreezeRemaining(world) ?? 0;
    const next = Math.min(
      this.config.maxHitStopSeconds,
      Math.max(current, seconds)
    );
    enterGameplayFreeze(world, next);
  }

  private applyScreenShake(
    world: World<CoreComponentRegistry>,
    intensity: number,
    duration: number
  ): void {
    if (intensity <= 0 || duration <= 0) return;

    const capped = Math.min(intensity, this.config.maxShakeIntensity);
    this.applyCoreCameraShake(world, capped, duration);
  }

  private applyCoreCameraShake(
    world: World<CoreComponentRegistry>,
    intensity: number,
    duration: number
  ): void {
    const cameras = world.query("Camera2D");
    const len = cameras.length;
    let mainCam: number | undefined;

    for (let i = 0; i < len; i++) {
      const cam = world.getComponent(cameras[i], "Camera2D") as
        | { isMain?: boolean }
        | undefined;
      if (cam?.isMain) {
        mainCam = cameras[i];
        break;
      }
    }
    if (mainCam === undefined && len > 0) {
      mainCam = cameras[0];
    }
    if (mainCam === undefined) return;

    if (world.hasComponent(mainCam, "ScreenShake")) {
      const existing = world.getComponent(mainCam, "ScreenShake") as
        | { intensity: number; duration: number; remaining: number }
        | undefined;
      if (existing && existing.intensity > intensity && existing.remaining > 0) {
        return;
      }
      const mut = world.getMutableComponent(mainCam, "ScreenShake") as
        | { intensity: number; duration: number; remaining: number }
        | undefined;
      if (mut) {
        mut.intensity = intensity;
        mut.duration = duration;
        mut.remaining = duration;
      }
    } else {
      world.getCommandBuffer().addComponent(mainCam, {
        type: "ScreenShake",
        intensity,
        duration,
        remaining: duration
      });
    }
  }

  private resolveProfile(category?: string): HitFeedbackProfile {
    if (category && this.config.byCategory[category]) {
      return this.config.byCategory[category];
    }
    return this.config.defaultHit;
  }

  private processHits(world: World<CoreComponentRegistry>, reSim: boolean): void {
    const len = this.pendingHits.length;
    for (let i = 0; i < len; i++) {
      const hit = this.pendingHits[i];
      const profile = this.resolveProfile(hit.category);

      this.applyHitStop(world, profile.hitStopSeconds);

      if (reSim) continue;

      this.applyScreenShake(world, profile.shakeIntensity, profile.shakeDuration);
      this.applyHitFlash(world, hit.targetEntity, profile.hitFlashFrames);
    }
  }

  private processDeaths(world: World<CoreComponentRegistry>, reSim: boolean): void {
    const len = this.pendingDeaths.length;
    const deathProfile = this.config.death;

    for (let i = 0; i < len; i++) {
      const death = this.pendingDeaths[i];

      this.applyHitStop(world, deathProfile.hitStopSeconds);

      if (reSim) continue;

      this.applyScreenShake(
        world,
        deathProfile.shakeIntensity,
        deathProfile.shakeDuration
      );
      this.applyHitFlash(world, death.entity, deathProfile.hitFlashFrames);
    }
  }

  private applyHitFlash(
    world: World<CoreComponentRegistry>,
    entity: number,
    frames: number
  ): void {
    if (frames <= 0) return;
    if (!world.hasEntity(entity)) return;
    if (!world.hasComponent(entity, "Render")) return;

    const render = world.getComponent(entity, "Render") as
      | { hitFlashFrames?: number }
      | undefined;
    if (render && (render.hitFlashFrames ?? 0) >= frames) return;

    const mutable = world.getMutableComponent(entity, "Render") as
      | { hitFlashFrames?: number }
      | undefined;
    if (mutable) {
      mutable.hitFlashFrames = frames;
    }
  }
}

export function isSimulationFrozen(world: World<CoreComponentRegistry>): boolean {
  return isGameplayFrozen(world);
}
