/**
 * Combat HUD — health, weapon, wave, score, telegraphs, CLEAR banner.
 */
import type {
  EffectDrawer,
  CoreComponentRegistry,
  HealthComponent,
  RunState,
  Camera2DComponent
} from "@tiny-aster/core";
import type { HitRunWeaponState } from "../weapons/HitRunWeaponTypes";
import type { WaveDirectorState, WaveScript } from "../waves/HitRunWaveTypes";
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE
} from "../waves/HitRunWaveTypes";
import {
  WAVE_TELEGRAPHS_RESOURCE,
  WAVE_BANNER_RESOURCE,
  type WaveTelegraphMarker,
  type WaveBannerState
} from "../waves/HitRunWavePresentation";
import { HIT_PALETTE } from "./HitAndRunPalette";
import type { HitRunDeathFlowState } from "../systems/HitRunDeathFlowSystem";
import { DEATH_FLOW_RESOURCE } from "../systems/HitRunDeathFlowSystem";

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

function mainCam(world: {
  query: (t: string) => number[];
  getComponent: (e: number, t: string) => unknown;
}): { x: number; y: number } {
  const cams = world.query("Camera2D");
  for (let i = 0; i < cams.length; i++) {
    const cam = world.getComponent(cams[i], "Camera2D") as Camera2DComponent | undefined;
    if (cam?.isMain) return { x: cam.x ?? 0, y: cam.y ?? 0 };
  }
  return { x: 0, y: 0 };
}

export const drawHitRunHud: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { w, h } = resolveViewport(world);
    const cam = mainCam(world);
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
    const telegraphs = world.getResource(WAVE_TELEGRAPHS_RESOURCE) as WaveTelegraphMarker[] | undefined;
    const banner = world.getResource(WAVE_BANNER_RESOURCE) as WaveBannerState | null | undefined;
    const death = world.getResource(DEATH_FLOW_RESOURCE) as HitRunDeathFlowState | undefined;

    const score = rs
      ? rs.collectedTemporalIds.length * 10 + rs.collectedPermanentIds.length * 100
      : 0;

    if (telegraphs && telegraphs.length > 0) {
      for (let i = 0; i < telegraphs.length; i++) {
        const t = telegraphs[i];
        const sx = t.x - cam.x;
        const sy = t.y - cam.y;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
        const pulse = 0.5 + 0.5 * Math.sin((1 - t.remaining / t.lead) * Math.PI * 6);
        const r = 14 + pulse * 6;
        ctx.save();
        ctx.globalAlpha = 0.35 + pulse * 0.45;
        ctx.strokeStyle = HIT_PALETTE.hitRunRed;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.fillStyle = HIT_PALETTE.hitRunYellow;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();

    const barH = 36;
    const topGrad = ctx.createLinearGradient(0, 0, 0, barH + 12);
    topGrad.addColorStop(0, "rgba(5,4,12,0.75)");
    topGrad.addColorStop(1, "rgba(5,4,12,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, barH + 16);

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
      if (ctx.roundRect) ctx.roundRect(x, pipY, pipW, pipH, 2);
      else ctx.rect(x, pipY, pipW, pipH);
      ctx.fill();
      ctx.stroke();
    }

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

    ctx.textAlign = "right";
    ctx.font = "bold 14px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#e8e4f0";
    ctx.fillText(String(score).padStart(6, "0"), w - 16, 22);

    if (banner && banner.remaining > 0) {
      const a = Math.min(1, banner.remaining / 0.35);
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.font = "bold 42px 'Share Tech Mono', monospace";
      ctx.fillStyle = banner.text === "CLEAR" ? HIT_PALETTE.hitRunYellow : HIT_PALETTE.hitRunRed;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 18;
      ctx.fillText(banner.text, w * 0.5, h * 0.38);
      if (banner.sub) {
        ctx.shadowBlur = 0;
        ctx.font = "14px 'Share Tech Mono', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(banner.sub, w * 0.5, h * 0.38 + 28);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    if (death?.active) {
      ctx.fillStyle = "rgba(80,0,20,0.25)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = "bold 28px 'Share Tech Mono', monospace";
      ctx.fillStyle = HIT_PALETTE.hitRunRed;
      ctx.fillText("DOWN", w * 0.5, h * 0.5);
    }

    ctx.textAlign = "left";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillText("←→ MOVE  ↑↓ AIM  SPACE JUMP  F MELEE  C/X FIRE", 16, h - 12);

    ctx.restore();
  }
};
