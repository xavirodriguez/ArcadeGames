/* eslint-disable @typescript-eslint/no-explicit-any */
import { World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { fragmentAsteroid } from "../EntityFactory";
import { spawnScorePopup } from "@tiny-aster/gameplay-kit";
import { createSharedParticle, EXPLOSION_PROFILES } from "../../shared/rendering/SharedVFX";
import { getLogsForLevel } from "../story/StoryBeats";

/**
 * Pure helper module to resolve score, combo, particle explosion, popup, and sfx reward effects
 * on combat death (bullet/asteroid destruction) and ship destruction.
 * @internal
 */
export function applyAsteroidCombatDeathEffects(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  asteroid: number,
  bullet: number | undefined,
  findPlayerByOwnerId: (world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, ownerId: string) => number | undefined
): void {
  if (!world.hasComponent(asteroid, "Asteroid")) {
    return;
  }

  const asteroidComp = world.getComponent(asteroid, "Asteroid");
  const size = (asteroidComp?.size || "large") as "large" | "medium" | "small";

  let points = 20;
  if (size === "medium") points = 50;
  else if (size === "small") points = 100;

  const config = world.getResource<any>("GameConfig") || {};
  let nextCombo = 0;
  let nextMultiplier = 1;

  let comboEntityTarget: number | undefined;
  if (bullet !== undefined && world.hasComponent(bullet, "Bullet")) {
    const bulletComp = world.getComponent(bullet, "Bullet");
    const ownerId = bulletComp?.ownerId;
    if (ownerId) {
      const playerEntity = findPlayerByOwnerId(world, ownerId);
      if (playerEntity !== undefined && world.hasComponent(playerEntity, "Combo")) {
        comboEntityTarget = playerEntity;
      }
    }
  }

  if (comboEntityTarget === undefined) {
    const comboEntities = world.query("Combo");
    comboEntityTarget = comboEntities[0];
  }

  if (comboEntityTarget !== undefined) {
    world.mutateComponent(comboEntityTarget, "Combo", (c) => {
      c.combo++;
      c.timerRemaining = (config.COMBO_TIMEOUT ?? 2000) / 1000;
      c.multiplier = Math.min(config.MAX_MULTIPLIER ?? 10, 1 + Math.floor(c.combo / 5));
      nextCombo = c.combo;
      nextMultiplier = c.multiplier;
    });
  }

  const scoreGain = points * nextMultiplier;
  let newScore = scoreGain;
  world.mutateSingleton("GameState", (state) => {
    state.score += scoreGain;
    newScore = state.score;
  });

  // Score synchronization logic by owner
  if (bullet !== undefined && world.hasComponent(bullet, "Bullet")) {
    const bulletComp = world.getComponent(bullet, "Bullet");
    const ownerId = bulletComp?.ownerId;
    if (ownerId) {
      const playerEntity = findPlayerByOwnerId(world, ownerId);
      if (playerEntity !== undefined) {
        if (!world.hasComponent(playerEntity, "PlayerScore")) {
          world.getCommandBuffer().addComponent(playerEntity, {
            type: "PlayerScore",
            score: scoreGain
          });
        } else {
          world.mutateComponent(playerEntity, "PlayerScore", (ps) => {
            ps.score = (ps.score || 0) + scoreGain;
          });
        }
      }
    }
  }

  const asteroidTransform = world.getComponent(asteroid, "Transform");
  if (asteroidTransform) {
    const gameState = world.getSingleton("GameState");
    const isStory = gameState?.mode === "story";
    const level = gameState?.level ?? 1;

    const storyColor = resolveThemeColorWithFallback(world, "#00FFDD", "story-fragment-popup", "system", "primary");
    const scoreColor = resolveThemeColorWithFallback(world, "#FFFF00", "score-popup", "warning", "boss");

    if (isStory && size === "large" && world.gameplayRandom.next() < 0.1) {
      const logs = getLogsForLevel(level);
      if (logs && logs.length > 0) {
        const logIndex = world.gameplayRandom.nextInt(0, logs.length);
        const logText = logs[logIndex];
        spawnScorePopup(world, asteroidTransform.x, asteroidTransform.y - 20, logText, storyColor);
      }
    }

    spawnScorePopup(world, asteroidTransform.x, asteroidTransform.y, `x${nextMultiplier}`, scoreColor);
  }

  // Spawn particles
  const particlePool = world.getResource<any>("ParticlePool");
  if (asteroidTransform && particlePool) {
    const ax = asteroidTransform.x;
    const ay = asteroidTransform.y;
    const particleCount = size === "large" ? EXPLOSION_PROFILES["enemy"].particleCount : EXPLOSION_PROFILES["small"].particleCount;
    const rng = world.gameplayRandom;
    const colors = EXPLOSION_PROFILES["enemy"].colorSequence;
    for (let i = 0; i < particleCount; i++) {
      const angle = rng.next() * Math.PI * 2;
      const speed = rng.nextRange(40, 150);
      const px = ax + (rng.next() - 0.5) * 8;
      const py = ay + (rng.next() - 0.5) * 8;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[rng.nextInt(0, colors.length)];
      const pSize = rng.nextRange(1.5, 4.5);
      const ttl = rng.nextRange(0.4, 0.9);
      createSharedParticle(world, px, py, vx, vy, color, particlePool, pSize, ttl);
    }
  }

  // Fragment asteroid
  fragmentAsteroid(world, asteroid);

  // Remove entity
  world.getCommandBuffer().removeEntity(asteroid);

  // Emit deferred events
  const eventBus = world.getEventBus();
  if (eventBus) {
    const sfxName = size === "large" ? "explosion_large" : "explosion_small";
    eventBus.emitDeferred("PlaySFX", { name: sfxName, pitchRange: 0.06 });
    eventBus.emitDeferred("asteroid:destroyed", { entity: asteroid, size });
    eventBus.emitDeferred("score:changed", { newScore, delta: scoreGain });
  }
}

/**
 * Pure helper module to trigger explosion particle VFX when player ship is destroyed.
 * @internal
 */
export function triggerShipExplosionParticles(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  ship: number,
  shipExplosionColors: readonly string[]
): void {
  const shipTransform = world.getComponent(ship, "Transform");
  const shipParticlePool = world.getResource<any>("ParticlePool");
  if (shipTransform && shipParticlePool) {
    const sx = shipTransform.x;
    const sy = shipTransform.y;
    const rng = world.gameplayRandom;
    for (let i = 0; i < 24; i++) {
      const angle = rng.next() * Math.PI * 2;
      const speed = rng.nextRange(60, 200);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = shipExplosionColors[rng.nextInt(0, shipExplosionColors.length)];
      const pSize = rng.nextRange(2.0, 5.5);
      const ttl = rng.nextRange(0.5, 1.2);
      createSharedParticle(world, sx, sy, vx, vy, color, shipParticlePool, pSize, ttl);
    }
  }
}
