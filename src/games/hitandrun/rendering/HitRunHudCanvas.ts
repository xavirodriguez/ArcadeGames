/**
 * Combat HUD for Hit&Run — health, weapon, wave, score (screen-space overlay).
 */
import type {
  EffectDrawer,
  CoreComponentRegistry,
  HealthComponent,
  RunState
} from "@tiny-aster/core";
import type { HitRunWeaponState } from "../weapons/HitRunWeaponTypes";
import type { WaveDirectorState, WaveScript } from "../waves/HitRunWaveTypes";
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE
} from "../waves/HitRunWaveTypes";
import { HIT_PALETTE } from "./HitAndRunPalette";

function resolveViewport(world: {
  getResource: (k: string) => unknown;
}): { w: number; h: number } {
  const cfg = world.getResource("GameConfig") as
    | { viewportWidth?: number; viewportHeight?: number; worldWidth?: number; worldHeight?: number }
    | undefined;
  return {
    w: cfg?.viewportWidth ?? cfg?.worldWidth ?? 800,
    h: cfg?.viewportHeight ?? cfg?.worldHeight ?? 600
  };
}

export const drawHitRunHud: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { w, h } = resolveViewport(world);
    const players = world.query("PlatformerInput", "Health");
    const player = players[0];
    const health = player !== undefined
      ? (world.getComponent(player, "Health") as HealthComponent | undefined)
      : undefined;
    const weapon = player !== undefined
      ? (world.getComponent(player, "HitRunWeapon") as HitRunWeaponState | undefined)
      : undefined;
    const rs = world.getResource("RunState") as RunState | undefined;
    const wave = world.getResource(WAVE_DIRECTOR_RESOURCE) as WaveDirectorState | undefined;
    const script = world.getResource(WAVE_SCRIPT_RESOURCE) as WaveScript | undefined;

    const score = rs
      ? rs.collectedTemporalIds.length * 10 + rs.collectedPermanentIds.length * 100
      : 0;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Top bar backdrop
    const barH = 36;
    const topGrad = ctx.createLinearGradient(0, 0, 0, barH + 12);
    topGrad.addColorStop(0, "rgba(5,4,12,0.75)");
    topGrad.addColorStop(1, "rgba(5,4,12,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, barH + 16);

    // Health pips
    const maxHp = health?.max ?? 3;
    const curHp = health?.current ?? 0;
    const pipW = 18;
    const pipH = 10;
    const startX = 16;
    const pipY = 14;
    for (let i = 0; i < maxHp; i++) {
      const x = startX + i * (pipW + 6);
      ctx.fillStyle = i < curHp ? HIT_PALETTE.hitRunRed : "rgba(80,40,50,0.5)";
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, pipY, pipW, pipH, 2);
      } else {
        ctx.rect(x, pipY, pipW, pipH);
      }
      ctx.fill();
      ctx.stroke();
    }

    // Weapon label
    const weaponId = (weapon?.weaponId ?? "hmg").toUpperCase();
    const cd = weapon?.cooldownRemaining ?? 0;
    ctx.font = "bold 12px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = HIT_PALETTE.hitRunYellow;
    ctx.fillText(weaponId, startX + maxHp * (pipW + 6) + 16, 22);
    if (cd > 0.02) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(startX + maxHp * (pipW + 6) + 16, 26, 40 * Math.min(1, cd / 0.2), 3);
    }

    // Wave info (center)
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const waveName = script?.name ?? wave?.scriptId ?? "—";
    const waveT = wave?.elapsed != null ? wave.elapsed.toFixed(1) : "0.0";
    ctx.fillText(`WAVE  ${waveName}  ·  ${waveT}s`, w * 0.5, 20);
    if (wave) {
      ctx.font = "10px 'Share Tech Mono', monospace";
      ctx.fillStyle = "rgba(255,180,180,0.7)";
      ctx.fillText(`SPAWNED ${wave.totalSpawned}`, w * 0.5, 34);
    }

    // Score (right)
    ctx.textAlign = "right";
    ctx.font = "bold 14px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#e8e4f0";
    ctx.fillText(String(score).padStart(6, "0"), w - 16, 22);

    // Bottom hint
    ctx.textAlign = "left";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillText("← → MOVE   Z/↑ JUMP   X MELEE   C/ATK FIRE", 16, h - 12);

    ctx.restore();
  }
};
