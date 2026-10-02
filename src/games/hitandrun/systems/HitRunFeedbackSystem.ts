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
 * HitRunFeedbackSystem — juice de combate para Hit&Run.
 *
 * Fase recomendada: SystemPhase.GameRules
 *
 * Responsabilidades:
 *  1. Escuchar combat:hit / combat:death (emitidos diferidos por CombatSystem).
 *  2. Aplicar hit-stop global (resource "HitStopRemaining").
 *  3. Escribir screen-shake singleton (resource "HitRunScreenShake").
 *  4. Setear Render.hitFlashFrames en la víctima.
 *
 * NO muta Health, Damage, ni destruye entidades.
 * NO usa Math.random ni gameplayRandom (valores fijos desde config).
 *
 * @public
 */
export class HitRunFeedbackSystem extends System<CoreComponentRegistry> {
  private config: HitRunFeedbackConfig;
  private subscribed = false;

  /** Buffers reutilizables — cero allocs en el hot path. */
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

  /**
   * Llamar una vez tras registrar el sistema (p.ej. en onRegisterSystems).
   * Los handlers solo encolan; el trabajo real ocurre en update().
   */
  public subscribe(eventBus: EventBus): void {
    if (this.subscribed) return;
    this.subscribed = true;

    eventBus.on("combat:hit" as any, (payload: unknown) => {
      this.pendingHits.push(payload as CombatHitPayload);
    });

    eventBus.on("combat:death" as any, (payload: unknown) => {
      this.pendingDeaths.push(payload as CombatDeathPayload);
    });
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    // Visual juice se omite en rollback re-sim (evita doble shake/flash).
    // Hit-stop sí se aplica/decrementa para pacing determinista.
    const reSim = world.isReSimulating === true;

    // 1) Decrementar hit-stop SIEMPRE (sim pausada, reloj sigue).
    this.tickHitStop(world, deltaTime);

    // 2) Tick de screen-shake (elapsed); la capa de render lee intensity residual.
    this.tickScreenShake(world, deltaTime);

    // 3) Consumir eventos pendientes de este tick.
    if (this.pendingHits.length > 0) {
      this.processHits(world, reSim);
      this.pendingHits.length = 0;
    }
    if (this.pendingDeaths.length > 0) {
      this.processDeaths(world, reSim);
      this.pendingDeaths.length = 0;
    }
  }

  // ─── Hit-stop ───────────────────────────────────────────────

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
    const current = (world.getResource<number>("HitStopRemaining") as number) || 0;
    // Nos quedamos con el mayor (no apilar a ciegas).
    const next = Math.min(
      this.config.maxHitStopSeconds,
      Math.max(current, seconds)
    );
    world.setResource("HitStopRemaining", next);
  }

  // ─── Screen shake (singleton de presentación) ───────────────

  private tickScreenShake(world: World<CoreComponentRegistry>, dt: number): void {
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

    let shake = world.getResource<HitRunScreenShake>("HitRunScreenShake");
    if (!shake) {
      shake = { intensity: 0, duration: 0, elapsed: 0 };
      world.setResource("HitRunScreenShake", shake);
    }

    // Si ya hay un shake más fuerte, no lo degradamos.
    const capped = Math.min(intensity, this.config.maxShakeIntensity);
    if (capped >= shake.intensity) {
      shake.intensity = capped;
      shake.duration = duration;
      shake.elapsed = 0;
    }
  }

  // ─── Event processing ───────────────────────────────────────

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

      this.applyScreenShake(world, deathProfile.shakeIntensity, deathProfile.shakeDuration);
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

    const render = world.getComponent(entity, "Render");
    // Evitar bump de stateVersion si ya tiene un flash igual o mayor
    if (render && (render.hitFlashFrames ?? 0) >= frames) return;

    const mutable = world.getMutableComponent(entity, "Render");
    if (mutable) {
      mutable.hitFlashFrames = frames;
    }
  }
}

/**
 * Helper para sistemas de SIMULACIÓN.
 * Usar al inicio de update():
 *   if (isSimulationFrozen(world)) return;
 */
export function isSimulationFrozen(world: World<CoreComponentRegistry>): boolean {
  if (world.getResource("IsPaused") === true) return true;
  const hitStop = world.getResource<number>("HitStopRemaining");
  return typeof hitStop === "number" && hitStop > 0;
}
