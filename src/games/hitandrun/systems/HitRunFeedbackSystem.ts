import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import type { EventBus } from "@tiny-aster/core";
import {
  CombatHitPayload,
  CombatDeathPayload,
  HitRunFeedbackConfig,
  HitFeedbackProfile,
  HitRunScreenShake,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG
} from "./HitRunFeedbackTypes";

/**
 * HitRunFeedbackSystem — combat juice (Paso B).
 *
 * - Hit-stop: resource "HitStopRemaining" (sim reads via isSimulationFrozen).
 *   Always decremented; applied on combat:hit / combat:death.
 * - Screen shake: presentation only — skipped when world.isReSimulating.
 *   Writes HitRunScreenShake resource AND core ScreenShake on main Camera2D
 *   so ScreenShakeSystem can drive VisualOffset.
 * - hitFlashFrames on victim Render (also skipped on re-sim).
 */
export class HitRunFeedbackSystem extends System<CoreComponentRegistry> {
  private config: HitRunFeedbackConfig;
  private subscribed = false;

  private pendingHits: CombatHitPayload[] = [];
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

  public subscribe(eventBus: EventBus): void {
    if (this.subscribed) return;
    this.subscribed = true;

    eventBus.on("combat:hit", (payload: unknown) => {
      this.pendingHits.push(payload as CombatHitPayload);
    });

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

    this.tickHitStop(world, deltaTime);
    this.tickScreenShakeResource(world, deltaTime);

    if (this.pendingHits.length > 0) {
      this.processHits(world, reSim);
      this.pendingHits.length = 0;
    }
    if (this.pendingDeaths.length > 0) {
      this.processDeaths(world, reSim);
      this.pendingDeaths.length = 0;
    }
  }

  private tickHitStop(world: World<CoreComponentRegistry>, dt: number): void {
    const remaining = world.getResource<number>("HitStopRemaining");
    if (remaining === undefined || remaining === null) {
      world.setResource("HitStopRemaining", 0);
      return;
    }
    if (remaining > 0) {
      const next = remaining - dt;
      world.setResource("HitStopRemaining", next > 0 ? next : 0);
    }
  }

  private applyHitStop(world: World<CoreComponentRegistry>, seconds: number): void {
    if (seconds <= 0) return;
    const current = world.getResource<number>("HitStopRemaining") ?? 0;
    const next = Math.min(
      this.config.maxHitStopSeconds,
      Math.max(current, seconds)
    );
    world.setResource("HitStopRemaining", next);
  }

  private tickScreenShakeResource(
    world: World<CoreComponentRegistry>,
    dt: number
  ): void {
    const shake = world.getResource<HitRunScreenShake>("HitRunScreenShake");
    if (!shake || shake.duration <= 0) return;

    shake.elapsed += dt;
    if (shake.elapsed >= shake.duration) {
      shake.intensity = 0;
      shake.duration = 0;
      shake.elapsed = 0;
    }
  }

  /**
   * Presentation-only. Must not run meaningful camera writes during re-sim
   * (caller skips). Bridges to core ScreenShake for ScreenShakeSystem.
   */
  private applyScreenShake(
    world: World<CoreComponentRegistry>,
    intensity: number,
    duration: number
  ): void {
    if (intensity <= 0 || duration <= 0) return;

    const capped = Math.min(intensity, this.config.maxShakeIntensity);

    let shake = world.getResource<HitRunScreenShake>("HitRunScreenShake");
    if (!shake) {
      shake = { intensity: 0, duration: 0, elapsed: 0 };
      world.setResource("HitRunScreenShake", shake);
    }
    if (capped >= shake.intensity) {
      shake.intensity = capped;
      shake.duration = duration;
      shake.elapsed = 0;
    }

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
  if (world.getResource("IsPaused") === true) return true;
  const hitStop = world.getResource<number>("HitStopRemaining");
  return typeof hitStop === "number" && hitStop > 0;
}
