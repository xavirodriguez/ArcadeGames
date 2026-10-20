/**
 * Module C — Juice systems for Synthwave Arkanoid (Imp. 16, 17, 20).
 * Deterministic: uses world.tick / gameplayRandom; no Math.random in update.
 */
import { System, World, SystemPhase } from "@tiny-aster/core";
import {
  ArkanoidComponentRegistry,
  ArkanoidEventRegistry,
} from "../types/ArkanoidTypes";
import { ArkanoidConfig, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";
import type { AmbientVFXResource, DustParticle } from "../types/ArkanoidVFXTypes";

/** Imp. 16 — push ball position into pre-allocated ring buffer each tick. */
export class BallTrailSystem extends System<
  ArkanoidComponentRegistry,
  ArkanoidEventRegistry
> {
  public override update(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>
  ): void {
    const entities = world.query("Ball", "BallTrail", "Transform");
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const t = world.getComponent(e, "Transform");
      const trail = world.getComponent(e, "BallTrail");
      if (!t || !trail || trail.maxLength <= 0) continue;

      const idx = trail.writeIndex % trail.maxLength;
      const pt = trail.history[idx];
      pt.x = t.x;
      pt.y = t.y;
      pt.tick = world.tick;
      trail.writeIndex = (idx + 1) % trail.maxLength;
      if (trail.count < trail.maxLength) trail.count++;
    }
  }
}

/** Imp. 17 — decay paddle reflection intensity (GameRules phase). */
export class PaddleReflectionDecaySystem extends System<
  ArkanoidComponentRegistry,
  ArkanoidEventRegistry
> {
  public override update(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
    dt: number
  ): void {
    const entities = world.query("Paddle", "PaddleReflection");
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const r = world.getComponent(e, "PaddleReflection");
      if (!r || r.intensity <= 0) continue;
      r.intensity = Math.max(0, r.intensity - dt * 4);
    }
  }
}

/**
 * Imp. 20 — initialise ambient dust once (call from onRegisterSystems / onInitializeEntities).
 * Uses gameplayRandom for determinism.
 */
export function initAmbientVFX(
  world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
  count: number = 40
): void {
  const existing = world.getResource<AmbientVFXResource>("AmbientVFX");
  if (existing?.initialized) return;

  const cfg =
    world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
  const rng = world.gameplayRandom;
  const dust: DustParticle[] = [];

  for (let i = 0; i < count; i++) {
    dust.push({
      x: rng.next() * cfg.worldWidth,
      y: rng.next() * cfg.worldHeight,
      vx: (rng.next() - 0.5) * 8,
      vy: -2 - rng.next() * 6,
      radius: 0.5 + rng.next(),
      phase: rng.next() * Math.PI * 2,
    });
  }

  world.setResource("AmbientVFX", { dust, initialized: true } satisfies AmbientVFXResource);
}

/** Drift dust particles each frame (Transform phase). Wrap in world bounds. */
export class AmbientDustSystem extends System<
  ArkanoidComponentRegistry,
  ArkanoidEventRegistry
> {
  public override update(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
    dt: number
  ): void {
    const res = world.getResource<AmbientVFXResource>("AmbientVFX");
    if (!res?.initialized) return;

    const cfg =
      world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
    const w = cfg.worldWidth;
    const h = cfg.worldHeight;

    for (let i = 0; i < res.dust.length; i++) {
      const p = res.dust[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -4) p.y = h + 4;
      if (p.y > h + 4) p.y = -4;
      if (p.x < -4) p.x = w + 4;
      if (p.x > w + 4) p.x = -4;
    }
  }
}

/**
 * Helper: write paddle reflection on ball↔paddle impact (call from collision, no physics change).
 * hitOffsetX in -1..1 relative to paddle centre.
 */
export function triggerPaddleReflection(
  world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>,
  paddleEntity: number,
  hitOffsetX: number
): void {
  const refl = world.getComponent(paddleEntity, "PaddleReflection");
  if (!refl) return;
  refl.hitOffsetX = Math.max(-1, Math.min(1, hitOffsetX));
  refl.intensity = 1;
}

/** Recommended registration helper for ArkanoidGame.onRegisterSystems */
export function registerArkanoidVFXSystems(
  world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry>
): void {
  world.addSystem(new BallTrailSystem(), { phase: SystemPhase.Transform });
  world.addSystem(new AmbientDustSystem(), { phase: SystemPhase.Transform });
  world.addSystem(new PaddleReflectionDecaySystem(), {
    phase: SystemPhase.GameRules,
  });
}
