/**
 * Closed-form, deterministic secondary motion for procedural VFX.
 * Values are sampled from normalized progress and a stable seed; no frame state or RNG stream.
 */
import { clamp, finiteNumber, deriveSeed } from "./vfx-core";

/** Small anticipation compression followed by a damped overshoot/settle. */
export function sampleVFXRecoil(progress: number, seed: number): number {
  const t = clamp(finiteNumber(progress, "progress"), 0, 1);
  const stableSeed = deriveSeed(seed >>> 0, 0x5245434f);
  const variation = (stableSeed / 0x100000000 - 0.5) * 0.16;
  if (t < 0.1) return -Math.sin((t / 0.1) * Math.PI) * (0.08 + variation);
  const settleT = t - 0.1;
  return Math.sin(settleT * 15) * Math.exp(-5.5 * settleT) * (0.16 + variation);
}
