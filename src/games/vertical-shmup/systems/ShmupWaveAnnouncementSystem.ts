import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import {
  createWaveAnnouncement,
  DEFAULT_WAVE_ANNOUNCEMENT_DURATION,
  WAVE_ANNOUNCEMENT_RESOURCE,
  type ShmupWaveAnnouncement
} from "../presentation/ShmupWaveAnnouncement";

/**
 * Turns `shmup:wave_complete` into a short, presentation-only banner.
 * Gameplay state is never touched; rollback resimulation never creates a banner.
 */
export class ShmupWaveAnnouncementSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  /** Banners must keep expiring during hit-stop / gameplay freeze. */
  public readonly runsWhileFrozen = true;

  private subscribed = false;

  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    if (!this.subscribed) {
      this.subscribed = true;
      world.getEventBus()?.on("shmup:wave_complete", (event) => {
        if (world.isReSimulating) return;
        if (!event || typeof event.wave !== "number") return;
        const current = world.getResource<ShmupWaveAnnouncement>(WAVE_ANNOUNCEMENT_RESOURCE);
        // The banner stays in the resource with remaining = 0 after expiry, so
        // its wave number keeps deduplicating deferred/repeated events.
        if (current?.wave === event.wave) return;
        const duration = world.getResource<ShmupConfig>("GameConfig")?.WAVE_ANNOUNCEMENT_DURATION
          ?? DEFAULT_WAVE_ANNOUNCEMENT_DURATION;
        world.setResource(WAVE_ANNOUNCEMENT_RESOURCE, createWaveAnnouncement(event.wave, duration));
      });
    }

    const announcement = world.getResource<ShmupWaveAnnouncement>(WAVE_ANNOUNCEMENT_RESOURCE);
    if (!announcement) return;
    announcement.remaining = Math.max(0, announcement.remaining - deltaTime);
  }
}
