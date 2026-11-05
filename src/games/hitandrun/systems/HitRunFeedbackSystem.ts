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
  HitRunScreenShake,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG
} from "./HitRunFeedbackTypes";

/**
 * HitRunFeedbackSystem — combat juice (Paso B).
 *
 * - Hit-stop canónico: utiliza `GameplayFreeze` del motor core vía `enterGameplayFreeze`.
 * - Screen shake: presentation only — skipped when world.isReSimulating.
 *   Writes HitRunScreenShake resource AND core ScreenShake on main Camera2D
 *   so ScreenShakeSystem can drive VisualOffset.
 * - hitFlashFrames on victim Render (also skipped on re-sim).
 */
import { CombatHitListenerSystem } from "../combat/CombatHitListenerSystem";
import { JuiceOrchestrator } from "../../shared/rendering/JuiceOrchestrator";
import { SUMI_E_THEME_RESOURCE } from "../presentation/ThemeAssetIds";

export class HitRunFeedbackSystem extends CombatHitListenerSystem<CombatHitPayload> {
  private config: HitRunFeedbackConfig;
  private pendingDeaths: CombatDeathPayload[] = [];
  private juice: JuiceOrchestrator<CoreComponentRegistry> | undefined;

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

  private applyHitStop(world: World<CoreComponentRegistry>, seconds: number): void {
    if (seconds <= 0) return;
    const current = getGameplayFreezeRemaining(world) ?? 0;
    const next = Math.min(
      this.config.maxHitStopSeconds,
      Math.max(current, seconds)
    );
    enterGameplayFreeze(world, next);
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

      const target = world.hasEntity(hit.targetEntity)
        ? world.getComponent(hit.targetEntity, "Transform")
        : undefined;
      const source = hit.sourceEntity !== undefined && world.hasEntity(hit.sourceEntity)
        ? world.getComponent(hit.sourceEntity, "Transform")
        : undefined;
      const isSumiE = world.getResource<boolean>(SUMI_E_THEME_RESOURCE) === true;

      if (target) {
        this.juice ??= new JuiceOrchestrator(world);
        const rotation = source
          ? Math.atan2(target.y - source.y, target.x - source.x)
          : target.rotation ?? 0;

        // The ordinary melee slash remains the baseline response for every sword hit.
        if ((hit.attackCategory === "melee" || hit.attackCategory === "combo-finisher" || hit.category === "melee") && !hit.blocked) {
          this.juice.spawn("pixelfx_slash", {
            x: target.x,
            y: target.y,
            rotation,
            scale: 1.05,
            tint: isSumiE ? "#151515" : "#f05a28",
            ttl: 0.24
          });
        }

        // Guard and armor flags come from the shared damage resolver, not from
        // presentation-side guesses about raw damage values.
        if (hit.blocked === true) {
          this.juice.spawn("pixelfx_shield_pulse", {
            x: target.x,
            y: target.y,
            rotation,
            scale: 0.9,
            tint: isSumiE ? "#151515" : "#4da3ff",
            ttl: 0.32
          });
        }

        if (hit.guardBroken === true || hit.category === "guard-break") {
          this.juice.spawn("pixelfx_guard_break", {
            x: target.x,
            y: target.y,
            rotation,
            scale: 1.1,
            tint: isSumiE ? "#151515" : "#e3a92f",
            ttl: 0.46
          });
        }
        if (hit.armorBroken === true || hit.category === "armor-break") {
          this.juice.spawn("pixelfx_armor_break", {
            x: target.x,
            y: target.y,
            rotation,
            scale: 1.1,
            tint: isSumiE ? "#151515" : "#b9a272",
            ttl: 0.48
          });
        }

        // A lethal melee hit is the concrete finisher transition currently
        // represented by Hit&Run's combat model (Health reaches zero).
        if (!hit.blocked && (
          hit.attackCategory === "combo-finisher" ||
          hit.category === "combo-finisher" ||
          ((hit.attackCategory === "melee" || hit.category === "melee") && hit.remainingHealth <= 0)
        )) {
          this.juice.spawn("pixelfx_combo_finisher", {
            x: target.x,
            y: target.y,
            rotation,
            scale: 1.2,
            tint: isSumiE ? "#151515" : "#d7473f",
            ttl: 0.58
          });
        }
      }
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

      // Lethal hits get a distinct radial ink burst; it is presentation-only.
      const transform = world.hasEntity(death.entity)
        ? world.getComponent(death.entity, "Transform")
        : undefined;
      if (transform) {
        this.juice ??= new JuiceOrchestrator(world);
        const isSumiE = world.getResource<boolean>(SUMI_E_THEME_RESOURCE) === true;
        this.juice.spawn("pixelfx_ink_burst", {
          x: transform.x,
          y: transform.y,
          scale: 1.15,
          tint: isSumiE ? "#151515" : "#d7473f",
          ttl: 0.44
        });
      }
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
