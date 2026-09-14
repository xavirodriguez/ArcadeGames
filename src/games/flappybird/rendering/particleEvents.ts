import { World } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry, BirdComponent } from "../types/FlappyBirdTypes";
import { VisualParticlePool } from "../../shared/rendering/VisualParticlePool";

export interface InterceptorRenderState {
  lastVy: number;
  lastIsAlive: boolean;
  lastNearMissTimer: number;
}

const shipStates = new Map<number, InterceptorRenderState>();

export function getOrCreateShipState(entity: number, birdComp: BirdComponent): InterceptorRenderState {
  let state = shipStates.get(entity);
  if (!state) {
    state = {
      lastVy: 0,
      lastIsAlive: birdComp.isAlive,
      lastNearMissTimer: birdComp.nearMissTimer
    };
    shipStates.set(entity, state);
  }
  return state;
}

/**
 * Process particle triggers for FlappyBird (near-miss, flap, death)
 * using deterministic World renderRandom and spawning particles directly into the pool.
 */
export function processFlappyBirdParticleEvents(
  world: World<FlappyBirdComponentRegistry>,
  entity: number,
  birdComp: BirdComponent,
  pool: VisualParticlePool,
  x: number,
  y: number,
  size: number
): InterceptorRenderState {
  const state = getOrCreateShipState(entity, birdComp);
  const vy = birdComp.velocityY;
  const isAlive = birdComp.isAlive;

  // 1. NEAR-MISS CYAN SPARKS
  const hasNearMissTriggered = birdComp.nearMissTimer > 0 && state.lastNearMissTimer <= 0;
  if (hasNearMissTriggered && isAlive) {
    const nmSparkCount = birdComp.nearMissParticleCount ?? world.renderRandom.nextInt(5, 9);
    const minS = birdComp.nearMissMinSpeed ?? 60;
    const maxS = birdComp.nearMissMaxSpeed ?? 120;
    for (let i = 0; i < nmSparkCount; i++) {
      const angleVal = world.renderRandom.next() * Math.PI * 2;
      const speedVal = world.renderRandom.nextRange(minS, maxS);
      const pVx = Math.cos(angleVal) * speedVal;
      const pVy = Math.sin(angleVal) * speedVal;
      const lifeVal = world.renderRandom.nextRange(0.25, 0.45);
      const sizeVal = world.renderRandom.nextRange(2, 4);
      pool.spawn(x, y, pVx, pVy, lifeVal, sizeVal, "#00F3FF", { type: "spark", angle: angleVal });
    }
  }

  // 2. SPARKS ON BOOST THRUST (FLAP)
  const flapStrength = FLAPPY_CONFIG.FLAP_STRENGTH;
  const hasFlapped = (vy < -150 && state.lastVy >= -150) || (vy === flapStrength && state.lastVy !== flapStrength);
  if (hasFlapped && isAlive) {
    const pCount = 4 + world.renderRandom.nextInt(0, 3);
    for (let i = 0; i < pCount; i++) {
      const angleVal = world.renderRandom.nextRange(160, 200) * (Math.PI / 180);
      const speedVal = world.renderRandom.nextRange(80, 160);
      const pVx = Math.cos(angleVal) * speedVal;
      const pVy = Math.sin(angleVal) * speedVal;
      const lifeVal = world.renderRandom.nextRange(0.2, 0.45);
      const sizeVal = world.renderRandom.nextRange(2, 4);
      const randColor = world.renderRandom.next() > 0.5 ? "#FFFFFF" : "#FFC000";
      pool.spawn(x - size * 0.5, y, pVx, pVy, lifeVal, sizeVal, randColor, { type: "spark", angle: angleVal });
    }
  }

  // 3. SHARDS & SPARKS ON DEATH
  const hasDied = !isAlive && state.lastIsAlive;
  if (hasDied) {
    const sCount = 8 + world.renderRandom.nextInt(0, 4);
    for (let i = 0; i < sCount; i++) {
      const angleVal = world.renderRandom.next() * Math.PI * 2;
      const speedVal = world.renderRandom.nextRange(40, 120);
      const pVx = Math.cos(angleVal) * speedVal;
      const pVy = Math.sin(angleVal) * speedVal;
      const lifeVal = world.renderRandom.nextRange(0.6, 1.1);
      const sizeVal = world.renderRandom.nextRange(3, 6);
      pool.spawn(x, y, pVx, pVy, lifeVal, sizeVal, "#5A6173", {
        type: "shard",
        angle: angleVal,
        angularVelocity: world.renderRandom.nextRange(-4, 4)
      });
    }
    for (let i = 0; i < 12; i++) {
      const angleVal = world.renderRandom.next() * Math.PI * 2;
      const speedVal = world.renderRandom.nextRange(80, 200);
      const pVx = Math.cos(angleVal) * speedVal;
      const pVy = Math.sin(angleVal) * speedVal;
      const lifeVal = world.renderRandom.nextRange(0.25, 0.5);
      const sizeVal = world.renderRandom.nextRange(2, 5);
      pool.spawn(x, y, pVx, pVy, lifeVal, sizeVal, "#FF3300", { type: "spark", angle: angleVal });
    }
  }

  state.lastVy = vy;
  state.lastIsAlive = isAlive;
  state.lastNearMissTimer = birdComp.nearMissTimer;

  return state;
}

/**
 * Shared physics tick for FlappyBird particles (drag on sparks, gravity on shards).
 */
export function applyFlappyParticlePhysics(p: any, dt: number): void {
  if (p.type === "spark") {
    p.vx *= 0.96;
    p.vy *= 0.96;
  } else if (p.type === "shard") {
    p.vy += 45 * dt; // Gravity drop on hull debris
  }
}
