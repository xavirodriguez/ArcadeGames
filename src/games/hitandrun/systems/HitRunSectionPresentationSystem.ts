/**
 * HitRunSectionPresentationSystem — SECTION / CLEAR banners + SFX hooks.
 * Reads BeltCameraState; writes WAVE_BANNER_RESOURCE.
 */

import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import {
  BELT_CAMERA_CONFIG_RESOURCE,
  BELT_CAMERA_STATE_RESOURCE,
  DEFAULT_BELT_CAMERA_CONFIG,
  type BeltCameraConfig,
  type BeltCameraState
} from "../belt/BeltCameraTypes";
import {
  WAVE_BANNER_RESOURCE,
  setWaveBanner,
  tickBanner,
  type WaveBannerState
} from "../waves/HitRunWavePresentation";

const SECTION_TITLES: Record<string, string> = {
  forest_gate: "FOREST GATE",
  ruins: "RUINS",
  bridge: "BRIDGE",
  citadel: "CITADEL"
};

export class HitRunSectionPresentationSystem extends System<CoreComponentRegistry> {
  private lastSectionIndex = -1;
  private lastCleared = false;

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    let banner =
      (world.getResource(WAVE_BANNER_RESOURCE) as WaveBannerState | null | undefined) ?? null;
    banner = tickBanner(banner, deltaTime);

    const camState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    if (!camState) {
      world.setResource(WAVE_BANNER_RESOURCE, banner);
      return;
    }

    const config =
      world.getResource<BeltCameraConfig>(BELT_CAMERA_CONFIG_RESOURCE) ??
      DEFAULT_BELT_CAMERA_CONFIG;
    const section = config.sections[camState.currentSectionIndex];
    const title =
      (section && SECTION_TITLES[section.id]) ||
      section?.id?.toUpperCase() ||
      `SECTION ${camState.currentSectionIndex + 1}`;

    // New section entered
    if (camState.currentSectionIndex !== this.lastSectionIndex) {
      this.lastSectionIndex = camState.currentSectionIndex;
      this.lastCleared = false;
      banner = setWaveBanner(
        banner,
        title,
        1.8,
        section?.isBoss ? "BOSS AHEAD" : `SECTION ${camState.currentSectionIndex + 1}`
      );
      if (!world.isReSimulating) {
        world.getEventBus()?.emit("PlaySFX", { name: "wave_start" });
      }
    }

    // Section cleared (gate unlocks)
    if (camState.sectionCleared && !this.lastCleared) {
      this.lastCleared = true;
      banner = setWaveBanner(banner, "CLEAR", 1.6, title);
      if (!world.isReSimulating) {
        world.getEventBus()?.emit("PlaySFX", { name: "wave_clear" });
      }
    }
    if (!camState.sectionCleared) {
      this.lastCleared = false;
    }

    world.setResource(WAVE_BANNER_RESOURCE, banner);
  }
}
