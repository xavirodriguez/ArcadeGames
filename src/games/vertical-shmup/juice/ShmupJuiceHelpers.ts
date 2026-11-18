import {
  World,
  Juice,
  enterGameplayFreeze,
  isGameplayFrozen
} from "@tiny-aster/core";
import { createSharedParticle } from "../../shared/rendering/SharedVFX";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";

const FRAME = 1 / 60;

export interface DamageVignetteState {
  remaining: number;
  duration: number;
  intensity: number;
}

export function requestHitStop(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  frames: number
): void {
  if (world.isReSimulating) return;
  const seconds = Math.max(FRAME, frames * FRAME);
  // Stack: keep the longer freeze if already active.
  if (isGameplayFrozen(world)) {
    const current = world.getResource<{ remaining?: number }>("GameplayFreeze");
    if (current && typeof current.remaining === "number" && current.remaining >= seconds) {
      return;
    }
  }
  enterGameplayFreeze(world, seconds);
}

/**
 * Spawns a floating score label that rises and fades via TTL progress.
 * Render.shape = floating_text; optional render.text for the string.
 */
export function spawnFloatingText(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  x: number,
  y: number,
  text: string,
  color: string,
  ttl = 0.7
): void {
  if (world.isReSimulating) return;
  const core = world;
  const isUpdating = core.isUpdating === true;
  const id = isUpdating ? core.reserveEntityId() : core.createEntity();
  if (isUpdating) core.getCommandBuffer().createEntity(id);

  const add = (comp: unknown) => {
    if (isUpdating) core.getCommandBuffer().addComponent(id, comp as never);
    else core.addComponent(id, comp as never);
  };

  add({
    type: "Transform",
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
  add({
    type: "Render",
    shape: "floating_text",
    size: 14,
    color,
    visible: true,
    opacity: 1,
    order: 20,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0,
    text
  });
  add({ type: "TTL", remaining: ttl, timeLeft: ttl });
}

export function triggerDamageVignette(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  durationSec = 0.15,
  intensity = 0.85
): void {
  if (world.isReSimulating) return;
  const prev = world.getResource<DamageVignetteState>("ShmupDamageVignette");
  if (prev && prev.remaining > durationSec * 0.5) {
    prev.remaining = Math.max(prev.remaining, durationSec);
    prev.intensity = Math.max(prev.intensity, intensity);
    return;
  }
  world.setResource("ShmupDamageVignette", {
    remaining: durationSec,
    duration: durationSec,
    intensity
  } satisfies DamageVignetteState);
}

export function tickDamageVignette(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  dt: number
): void {
  const v = world.getResource<DamageVignetteState>("ShmupDamageVignette");
  if (!v) return;
  v.remaining -= dt;
  if (v.remaining <= 0) {
    world.deleteResource("ShmupDamageVignette");
  }
}

export function bumpPlayerCombo(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  playerEntity: number
): { combo: number; multiplier: number } {
  const existing = world.getComponent(playerEntity, "Combo");
  if (!existing) {
    world.addComponent(playerEntity, {
      type: "Combo",
      combo: 1,
      multiplier: 1.1,
      timerRemaining: 2.5,
      timerDuration: 2.5
    });
    return { combo: 1, multiplier: 1.1 };
  }
  let combo = 1;
  let multiplier = 1.1;
  world.mutateComponent(playerEntity, "Combo", (c) => {
    c.combo = (c.combo ?? 0) + 1;
    c.multiplier = 1 + c.combo * 0.1;
    c.timerRemaining = c.timerDuration || 2.5;
    combo = c.combo;
    multiplier = c.multiplier;
  });
  return { combo, multiplier };
}

export function getPlayerCombo(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>
): { combo: number; multiplier: number } {
  for (const e of world.query("ShmupPlayer", "Combo")) {
    const c = world.getComponent(e, "Combo");
    if (c) return { combo: c.combo, multiplier: c.multiplier };
  }
  return { combo: 0, multiplier: 1 };
}

export function spawnGrazeSparks(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  x: number,
  y: number
): void {
  if (world.isReSimulating) return;
  const pool = world.getResource<{ acquire: (w: unknown, p: unknown) => number }>("ParticlePool");
  if (!pool) return;
  const rng = world.gameplayRandom;
  for (let i = 0; i < 5; i++) {
    const angle = rng.next() * Math.PI * 2;
    const speed = 40 + rng.next() * 80;
    createSharedParticle(
      world,
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      SHMUP_COLOR_TOKENS.player.primary,
      pool as never,
      2 + rng.next() * 2,
      0.25 + rng.next() * 0.2
    );
  }
}

export function comboScaledShake(
  world: World<ShmupComponentRegistry, ShmupEventRegistry>,
  baseIntensity: number,
  baseDurationMs: number,
  combo: number
): void {
  const scale = 1 + Math.min(1.5, combo * 0.08);
  Juice.shake(world, baseIntensity * scale, baseDurationMs * Math.min(1.4, 1 + combo * 0.03));
}

export function comboSfxPitch(combo: number): number {
  // pitchRange used as slight upward bias via playback; callers pass as pitchRange.
  return Math.min(0.18, 0.04 + combo * 0.012);
}

export function comboParticleColor(combo: number): string | undefined {
  if (combo >= 15) return SHMUP_COLOR_TOKENS.gold.sunlight;
  if (combo >= 8) return SHMUP_COLOR_TOKENS.player.primary;
  if (combo >= 4) return SHMUP_COLOR_TOKENS.warning;
  return undefined;
}
