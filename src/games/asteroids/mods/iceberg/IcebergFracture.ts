import type { World } from "@tiny-aster/core";
import { createSharedParticle } from "../../shared/rendering/SharedVFX";
import { ICEBERG_PALETTE } from "./IcebergPalette";

const ICE_SHARD_COLORS = [
  ICEBERG_PALETTE.iceLight,
  ICEBERG_PALETTE.iceMid,
  ICEBERG_PALETTE.iceDark,
  ICEBERG_PALETTE.hudText
] as const;

/** Particle counts by destruction mass. */
const SHARD_COUNT: Record<"large" | "medium" | "small" | "ship", number> = {
  large: 18,
  medium: 12,
  small: 7,
  ship: 16
};

type ParticlePool = {
  acquire: (
    world: World,
    params: {
      x: number;
      y: number;
      dx?: number;
      dy?: number;
      vx?: number;
      vy?: number;
      size: number;
      color: string;
      ttl: number;
    }
  ) => number;
};

/**
 * Crystalline fracture burst for Borealis — no fire/smoke.
 * Cream flash + rigid thermal ring (particle ring) + ice shards.
 *
 * @public
 */
export function spawnIceShardFracture(
  world: World,
  x: number,
  y: number,
  size: "large" | "medium" | "small" | "ship"
): void {
  const pool = world.getResource("ParticlePool") as ParticlePool | undefined;
  if (!pool) return;

  const rng = world.gameplayRandom ?? world.renderRandom;
  const next = () => (rng && typeof rng.next === "function" ? rng.next() : 0.5);
  const count = SHARD_COUNT[size] ?? 10;
  const speedBase = size === "large" ? 140 : size === "ship" ? 160 : size === "medium" ? 110 : 90;

  // Central cream flash
  createSharedParticle(
    world,
    x,
    y,
    0,
    0,
    ICEBERG_PALETTE.hudText,
    pool,
    size === "large" ? 7 : 4.5,
    0.22
  );

  // Rigid expanding ring — short-lived particles on a circle (thermalBeam)
  const ringCount = size === "small" ? 8 : size === "medium" ? 12 : 16;
  const ringSpeed = size === "large" ? 90 : 70;
  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;
    createSharedParticle(
      world,
      x,
      y,
      Math.cos(angle) * ringSpeed,
      Math.sin(angle) * ringSpeed,
      ICEBERG_PALETTE.thermalBeam,
      pool,
      2.2,
      0.28
    );
  }

  // Facet shards
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + next() * 0.4;
    const speed = speedBase * (0.55 + next() * 0.7);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const color = ICE_SHARD_COLORS[i % ICE_SHARD_COLORS.length];
    const pSize = 2 + next() * (size === "small" ? 2 : 4);
    const ttl = 0.45 + next() * 0.55;
    createSharedParticle(world, x, y, dx, dy, color, pool, pSize, ttl);
  }
}
