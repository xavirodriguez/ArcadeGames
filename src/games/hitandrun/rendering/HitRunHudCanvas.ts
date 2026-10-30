/**
 * Combat HUD — delegates rendering to active ThemeRegistry theme.
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
import type { HitRunScoreState } from "../systems/HitRunScoreSystem";
import { HIT_RUN_SCORE_RESOURCE } from "../systems/HitRunScoreSystem";
import { getHitRunTheme } from "./theme/HitRunPresentationSession";
import type { HudRenderSnapshot, BannerRenderSnapshot } from "./theme/HitRunThemeTypes";

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
    const health = world.getComponent(e, "Health") as { current?: number; hp?: number } | undefined;
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
    const camState = world.getResource(BELT_CAMERA_STATE_RESOURCE) as BeltCameraState | undefined;
    const camCfg = world.getResource(BELT_CAMERA_CONFIG_RESOURCE) as BeltCameraConfig | undefined;
    const publishedAlive = world.getResource(BELT_ALIVE_ENEMIES_RESOURCE) as number | undefined;
    const aliveEnemies =
      typeof publishedAlive === "number" ? publishedAlive : countAliveEnemies(world);
    const section =
      camState && camCfg
        ? camCfg.sections[camState.currentSectionIndex]
        : undefined;

    const scoreState = world.getResource(HIT_RUN_SCORE_RESOURCE) as HitRunScoreState | undefined;
    const scoreVal = scoreState?.score ?? (rs ? rs.collectedTemporalIds.length * 10 : 0);

    const hudSnapshot: HudRenderSnapshot = {
      viewportWidth: w,
      viewportHeight: h,
      cameraX: cam.x,
      cameraY: cam.y,
      player: player !== undefined
        ? {
            currentHp: health?.current ?? 0,
            maxHp: health?.max ?? 3,
            weaponId: weapon?.weaponId ?? "longbow",
            ammoCurrent: weapon?.ammoCurrent ?? Number.POSITIVE_INFINITY,
            ammoMax: weapon?.ammoMax ?? Number.POSITIVE_INFINITY,
            cooldownRemaining: weapon?.cooldownRemaining ?? 0
          }
        : undefined,
      wave: {
        sectionLabel: section?.id ? section.id.replace(/_/g, " ").toUpperCase() : "—",
        waveName: script?.name ?? wave?.scriptId ?? "—",
        gateLocked: camState?.gateLocked !== false && !camState?.sectionCleared,
        sectionCleared: camState?.sectionCleared ?? false,
        aliveEnemies,
        totalSpawned: wave?.totalSpawned ?? 0
      },
      score: {
        score: scoreVal,
        comboMultiplier: scoreState?.comboMultiplier ?? 1
      },
      telegraphs: telegraphs?.map(t => ({
        x: t.x,
        y: t.y,
        lead: t.lead,
        remaining: t.remaining
      })),
      isGameOver: false
    };

    const elapsed = (world.tick ?? 0) / 60;
    const theme = getHitRunTheme(world);
    theme.renderHud(ctx, hudSnapshot, elapsed);

    if (banner && banner.remaining > 0) {
      const bannerSnapshot: BannerRenderSnapshot = {
        text: banner.text,
        sub: banner.sub,
        remaining: banner.remaining,
        totalDuration: 2.0
      };
      theme.renderSectionBanner(ctx, bannerSnapshot, w, h, elapsed);
    }
  }
};
