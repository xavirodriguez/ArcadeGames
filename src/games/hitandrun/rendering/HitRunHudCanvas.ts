/**
 * Combat HUD — health, weapon, section/wave, score, telegraphs, CLEAR banner.
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
import {
  BELT_CAMERA_CONFIG_RESOURCE,
  BELT_CAMERA_STATE_RESOURCE,
  type BeltCameraConfig,
  type BeltCameraState
} from "../belt/BeltCameraTypes";
import { BELT_ALIVE_ENEMIES_RESOURCE } from "../belt/BeltCameraSystem";
import { HIT_PALETTE } from "./HitAndRunPalette";
import { colors } from "../../../theme/colors";
import type { HitRunDeathFlowState } from "../systems/HitRunDeathFlowSystem";
import { DEATH_FLOW_RESOURCE } from "../systems/HitRunDeathFlowSystem";
import type { HitRunScoreState } from "../systems/HitRunScoreSystem";

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
  query: (...tags: string[]) => readonly number[];
  getComponent: (e: number, t: string) => unknown;
}): { x: number; y: number } {
  const cams = world.query("Camera2D");
  for (let i = 0; i < cams.length; i++) {
    const cam = world.getComponent(cams[i], "Camera2D") as Camera2DComponent | undefined;
    if (cam?.isMain) return { x: cam.x ?? 0, y: cam.y ?? 0 };
  }
  return { x: 0, y: 0 };
}

/** Fallback count when BeltCameraSystem has not published yet. */
function countAliveEnemies(world: {
  query: (...tags: string[]) => readonly number[];
  getComponent: (e: number, t: string) => unknown;
  hasComponent: (e: number, t: string) => boolean;
}): number {
  const withHealth = world.query("Health");
  let n = 0;
  for (let i = 0; i < withHealth.length; i++) {
    const e = withHealth[i];
    if (world.hasComponent(e, "BeltInput") || world.hasComponent(e, "PlatformerInput")) {
      continue;
    }
    if (world.hasComponent(e, "Dead")) continue;
    const faction = world.getComponent(e, "Faction") as
      | { value?: string; faction?: string }
      | undefined;
    const f = faction?.value ?? faction?.faction;
    const isEnemy =
      world.hasComponent(e, "Enemy") ||
      f === "enemy" ||
      ((world.getComponent(e, "Tag") as { tags?: string[] } | undefined)?.tags?.includes(
        "Enemy"
      ) ??
        false);
    if (!isEnemy) continue;
    const health = world.getComponent(e, "Health") as
      | { current?: number; hp?: number }
      | undefined;
    const hp = health?.current ?? health?.hp ?? 0;
    if (hp > 0) n++;
  }
  return n;
}

export const drawHitRunHud: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { w, h } = resolveViewport(world);
    const cam = mainCam(world);
    let players = world.query("BeltInput", "Health");
    if (players.length === 0) {
      players = world.query("PlatformerInput", "Health");
    }
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
    const camState = world.getResource(BELT_CAMERA_STATE_RESOURCE) as BeltCameraState | undefined;
    const camCfg = world.getResource(BELT_CAMERA_CONFIG_RESOURCE) as BeltCameraConfig | undefined;
    const publishedAlive = world.getResource(BELT_ALIVE_ENEMIES_RESOURCE) as number | undefined;
    const aliveEnemies =
      typeof publishedAlive === "number" ? publishedAlive : countAliveEnemies(world);
    const section =
      camState && camCfg
        ? camCfg.sections[camState.currentSectionIndex]
        : undefined;

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
    topGrad.addColorStop(0, colors.panelStrong);
    topGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
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
      ctx.fillStyle = i < curHp ? HIT_PALETTE.hitRunRed : colors.surface;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, pipY, pipW, pipH, 2);
      else ctx.rect(x, pipY, pipW, pipH);
      ctx.fill();
      ctx.stroke();
    }

    const weaponId = (weapon?.weaponId ?? "longbow").toUpperCase();
    const cd = weapon?.cooldownRemaining ?? 0;
    const ammoCur = weapon?.ammoCurrent ?? Number.POSITIVE_INFINITY;
    const ammoMax = weapon?.ammoMax ?? Number.POSITIVE_INFINITY;
    const ammoText = ammoCur === Number.POSITIVE_INFINITY ? "∞" : `${ammoCur}/${ammoMax}`;

    ctx.font = "bold 12px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = HIT_PALETTE.hitRunYellow;
    ctx.fillText(`${weaponId} [${ammoText}]`, startX + maxHp * (pipW + 6) + 16, 22);
    if (cd > 0.02) {
      ctx.fillStyle = colors.textMuted;
      ctx.fillRect(startX + maxHp * (pipW + 6) + 16, 26, 40 * Math.min(1, cd / 0.2), 3);
    }

    ctx.textAlign = "center";
    ctx.font = "bold 12px 'Share Tech Mono', monospace";
    const sectionLabel = section?.id
      ? section.id.replace(/_/g, " ").toUpperCase()
      : "—";
    const waveName = script?.name ?? wave?.scriptId ?? "—";
    const locked = camState?.gateLocked !== false && !camState?.sectionCleared;
    const gateTag = locked
      ? `GATE LOCKED`
      : camState?.sectionCleared
        ? "GATE OPEN"
        : "GATE LOCKED";
    ctx.fillStyle = colors.neutral[100];
    ctx.fillText(`${sectionLabel}  ·  ${waveName}`, w * 0.5, 16);
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = locked ? HIT_PALETTE.hitRunRed : HIT_PALETTE.hitRunYellow;
    ctx.fillText(`${gateTag}  ·  ALIVE ${aliveEnemies}`, w * 0.5, 30);
    if (wave) {
      ctx.fillStyle = colors.textMuted;
      ctx.fillText(`SPAWNED ${wave.totalSpawned}`, w * 0.5, 42);
    }

    const scoreState = world.getResource<HitRunScoreState>("HitRunScoreState");
    const displayScore = scoreState?.score ?? score;
    const comboMult = scoreState?.comboMultiplier ?? 1;

    ctx.textAlign = "right";
    ctx.font = "bold 14px 'Share Tech Mono', monospace";
    ctx.fillStyle = colors.neutral[200];
    ctx.fillText(String(displayScore).padStart(6, "0"), w - 16, 22);

    if (comboMult > 1) {
      ctx.font = "bold 11px 'Share Tech Mono', monospace";
      ctx.fillStyle = HIT_PALETTE.hitRunRed;
      ctx.fillText(`COMBO x${comboMult.toFixed(1)}`, w - 16, 36);
    }

    // Floating score popups
    const popupPool = scoreState?.popupPool;
    if (popupPool && popupPool.length > 0) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 13px 'Share Tech Mono', monospace";
      for (let i = 0; i < popupPool.length; i++) {
        const p = popupPool[i];
        if (!p.active) continue;
        const sx = p.x - cam.x;
        const sy = p.y - cam.y;
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, sx, sy);
      }
      ctx.restore();
    }

    if (banner && banner.remaining > 0) {
      const a = Math.min(1, banner.remaining / 0.35);
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.font = "bold 42px 'Share Tech Mono', monospace";
      ctx.fillStyle =
        banner.text === "CLEAR" ? HIT_PALETTE.hitRunYellow : HIT_PALETTE.hitRunRed;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 18;
      ctx.fillText(banner.text, w * 0.5, h * 0.38);
      if (banner.sub) {
        ctx.shadowBlur = 0;
        ctx.font = "14px 'Share Tech Mono', monospace";
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText(banner.sub, w * 0.5, h * 0.38 + 28);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    if (death?.active) {
      ctx.fillStyle = colors.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = "bold 28px 'Share Tech Mono', monospace";
      ctx.fillStyle = HIT_PALETTE.hitRunRed;
      ctx.fillText("DOWN", w * 0.5, h * 0.5);
    }

    ctx.textAlign = "left";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = colors.textMuted;
    ctx.fillText("←→ MOVE  ↑↓ DEPTH  SPACE JUMP  F MELEE  Q SPECIAL  C/X FIRE", 16, h - 12);

    ctx.restore();
  }
};
