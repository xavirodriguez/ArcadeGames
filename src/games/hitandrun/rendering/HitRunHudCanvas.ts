/**
 * Hit & Run HUD snapshots and backend-neutral theme rendering.
 * ECS reads stop at this module; themes receive immutable presentation data.
 */
import type {
  CoreComponentRegistry,
  EffectDrawer,
  HealthComponent,
  RenderContext,
  RunState,
  Camera2DComponent
} from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import { CanvasPresentationPainter } from "../../shared/presentation/backends/CanvasPresentationPainter";
import { SkiaPresentationPainter } from "../../shared/presentation/backends/SkiaPresentationPainter";
import type { PresentationFrame, PresentationPainter } from "../../shared/presentation/PresentationContracts";
import type {
  HitRunPresentationHudSnapshot,
  HitRunPresentationBannerSnapshot
} from "./theme/HitRunPresentationSnapshots";
import { getHitRunPresentationSession } from "./theme/HitRunPresentationSession";
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

export interface HitRunHudWorld {
  readonly tick?: number;
  query(...tags: string[]): ReadonlyArray<number>;
  getComponent(entity: number, component: string): unknown;
  hasComponent(entity: number, component: string): boolean;
  getResource<T = unknown>(key: string): T | undefined;
}

export interface HitRunHudPresentationData {
  readonly hud: HitRunPresentationHudSnapshot;
  readonly banner?: HitRunPresentationBannerSnapshot;
  readonly frame: PresentationFrame;
}

function resolveViewport(world: HitRunHudWorld): { readonly width: number; readonly height: number } {
  const config = world.getResource<{
    readonly viewportWidth?: number;
    readonly viewportHeight?: number;
    readonly worldWidth?: number;
    readonly worldHeight?: number;
  }>("GameConfig");
  return {
    width: config?.viewportWidth ?? config?.worldWidth ?? 800,
    height: config?.viewportHeight ?? config?.worldHeight ?? 600
  };
}

function resolveCamera(world: HitRunHudWorld): { readonly x: number; readonly y: number } {
  const cameras = world.query("Camera2D");
  for (let index = 0; index < cameras.length; index++) {
    const camera = world.getComponent(cameras[index], "Camera2D") as Camera2DComponent | undefined;
    if (camera?.isMain) return { x: camera.x ?? 0, y: camera.y ?? 0 };
  }
  return { x: 0, y: 0 };
}

function countAliveEnemies(world: HitRunHudWorld): number {
  const entities = world.query("Health");
  let alive = 0;
  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index];
    if (world.hasComponent(entity, "BeltInput") || world.hasComponent(entity, "PlatformerInput")) continue;
    if (world.hasComponent(entity, "Dead")) continue;
    const health = world.getComponent(entity, "Health") as { readonly current?: number; readonly hp?: number } | undefined;
    if ((health?.current ?? health?.hp ?? 0) > 0) alive++;
  }
  return alive;
}

export function createHitRunHudPresentationData(world: HitRunHudWorld): HitRunHudPresentationData {
  const viewport = resolveViewport(world);
  const camera = resolveCamera(world);
  let players = world.query("BeltInput", "Health");
  if (players.length === 0) players = world.query("PlatformerInput", "Health");
  const player = players[0];

  const health = player !== undefined
    ? world.getComponent(player, "Health") as HealthComponent | undefined
    : undefined;
  const weapon = player !== undefined
    ? world.getComponent(player, "HitRunWeapon") as HitRunWeaponState | undefined
    : undefined;
  const runState = world.getResource<RunState>("RunState");
  const wave = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
  const script = world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);
  const telegraphs = world.getResource<WaveTelegraphMarker[]>(WAVE_TELEGRAPHS_RESOURCE) ?? [];
  const bannerState = world.getResource<WaveBannerState | null>(WAVE_BANNER_RESOURCE);
  const cameraState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
  const cameraConfig = world.getResource<BeltCameraConfig>(BELT_CAMERA_CONFIG_RESOURCE);
  const publishedAlive = world.getResource<number>(BELT_ALIVE_ENEMIES_RESOURCE);
  const aliveEnemies = typeof publishedAlive === "number" ? publishedAlive : countAliveEnemies(world);
  const section = cameraState && cameraConfig
    ? cameraConfig.sections[cameraState.currentSectionIndex]
    : undefined;
  const scoreState = world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
  const tick = world.tick ?? 0;
  const elapsedSeconds = tick / 60;

  const hud: HitRunPresentationHudSnapshot = {
    score: scoreState?.score ?? (runState ? runState.collectedTemporalIds.length * 10 : 0),
    health: player !== undefined
      ? { current: health?.current ?? 0, max: health?.max ?? 3 }
      : undefined,
    combo: scoreState?.comboMultiplier ?? 1,
    isPaused: world.getResource<boolean>("IsPaused") ?? false,
    isGameOver: false,
    metrics: {
      weaponId: weapon?.weaponId ?? "longbow",
      ammoCurrent: weapon?.ammoCurrent ?? Number.POSITIVE_INFINITY,
      ammoMax: weapon?.ammoMax ?? Number.POSITIVE_INFINITY,
      cooldownRemaining: weapon?.cooldownRemaining ?? 0,
      wave: {
        sectionLabel: section?.id ? section.id.replace(/_/g, " ").toUpperCase() : "—",
        waveName: script?.name ?? wave?.scriptId ?? "—",
        gateLocked: cameraState?.gateLocked !== false && !cameraState?.sectionCleared,
        sectionCleared: cameraState?.sectionCleared ?? false,
        aliveEnemies,
        totalSpawned: wave?.totalSpawned ?? 0
      },
      telegraphs: telegraphs.map(marker => ({
        x: marker.x,
        y: marker.y,
        lead: marker.lead,
        remaining: marker.remaining
      }))
    }
  };

  const banner: HitRunPresentationBannerSnapshot | undefined =
    bannerState && bannerState.remaining > 0
      ? {
          text: bannerState.text,
          subtext: bannerState.sub,
          remainingSeconds: bannerState.remaining,
          totalDurationSeconds: 2
        }
      : undefined;

  const frame: PresentationFrame = {
    frameId: tick,
    tick,
    elapsedSeconds,
    deltaSeconds: 0,
    viewport: { ...viewport, pixelRatio: 1 },
    camera: {
      x: camera.x,
      y: camera.y,
      zoom: 1,
      visualOffsetX: 0,
      visualOffsetY: 0
    },
    reduceMotion: false,
    highContrast: false
  };

  return { hud, banner, frame };
}

function renderHitRunHud(world: HitRunHudWorld, painter: PresentationPainter): void {
  const session = getHitRunPresentationSession(world);
  const data = createHitRunHudPresentationData(world);
  session.theme.renderHud?.(painter, data.hud, data.frame);
  if (data.banner) session.theme.renderBanner?.(painter, data.banner, data.frame);
}

export const drawHitRunHud: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(context, world) {
    renderHitRunHud(world, new CanvasPresentationPainter(context));
  }
};

export const drawHitRunHudSkia: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(context, world) {
    const canvas = context as never as SkCanvas;
    if (!canvas || typeof canvas.drawRect !== "function") return;
    renderHitRunHud(world, new SkiaPresentationPainter(canvas));
  }
};
