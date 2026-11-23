import type { World } from "@tiny-aster/core";
import type { IDrawAdapter } from "../../shared/rendering/DrawAdapter";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

/**
 * Presentation-only resource. It is deliberately NOT registered as a snapshot
 * resource: a rollback must not rewind a wave banner, and the `wave` value is
 * the dedupe key that keeps repeated/deferred events from restarting it.
 */
export interface ShmupWaveAnnouncement {
  wave: number;
  remaining: number;
  duration: number;
}

export const WAVE_ANNOUNCEMENT_RESOURCE = "ShmupWaveAnnouncement";
export const DEFAULT_WAVE_ANNOUNCEMENT_DURATION = 2;

export function createWaveAnnouncement(wave: number, duration: number): ShmupWaveAnnouncement {
  const safeDuration = duration > 0 ? duration : DEFAULT_WAVE_ANNOUNCEMENT_DURATION;
  return { wave: Math.max(1, Math.floor(wave)), remaining: safeDuration, duration: safeDuration };
}

/** Fades out over the final 40% of the banner lifetime. */
export function resolveWaveAnnouncementAlpha(announcement: ShmupWaveAnnouncement): number {
  if (!(announcement.duration > 0) || announcement.remaining <= 0) return 0;
  const fadeWindow = announcement.duration * 0.4;
  return Math.max(0, Math.min(1, announcement.remaining / fadeWindow));
}

/** Draws the banner through a platform-neutral draw adapter. */
export function drawWaveAnnouncement(
  adapter: IDrawAdapter,
  world: World<ShmupComponentRegistry>
): void {
  const announcement = world.getResource<ShmupWaveAnnouncement>(WAVE_ANNOUNCEMENT_RESOURCE);
  if (!announcement || announcement.remaining <= 0) return;
  const alpha = resolveWaveAnnouncementAlpha(announcement);
  if (alpha <= 0) return;

  const config = world.getResource<{ WORLD_WIDTH?: number; WORLD_HEIGHT?: number }>("GameConfig");
  const centerX = (config?.WORLD_WIDTH ?? 480) / 2;
  const centerY = (config?.WORLD_HEIGHT ?? 854) * 0.32;

  adapter.fillRect(centerX - 92, centerY - 34, 184, 54, SHMUP_COLOR_TOKENS.sky.deep, alpha * 0.7);
  adapter.strokeRect(centerX - 92, centerY - 34, 184, 54, SHMUP_COLOR_TOKENS.gold.sunlight, 2, alpha);
  adapter.drawText(`WAVE ${announcement.wave}`, centerX, centerY, SHMUP_COLOR_TOKENS.ui.primary, alpha, 32);
}
