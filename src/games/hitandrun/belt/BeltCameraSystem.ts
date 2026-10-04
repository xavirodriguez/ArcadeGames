/**
 * BeltCameraSystem — follow player on X, clamp at section gates until cleared.
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
} from "./BeltCameraTypes";

export class BeltCameraSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config =
      world.getResource<BeltCameraConfig>(BELT_CAMERA_CONFIG_RESOURCE) ??
      DEFAULT_BELT_CAMERA_CONFIG;

    let state = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    if (!state) {
      state = {
        cameraX: config.minCameraX,
        currentSectionIndex: 0,
        sectionCleared: false,
        gateLocked: true
      };
      world.setResource(BELT_CAMERA_STATE_RESOURCE, state);
    }

    const sectionEnemies = world.query("BeltSectionEnemy", "Health");
    let aliveInSection = 0;
    const sectionIndex = state.currentSectionIndex;
    for (let i = 0; i < sectionEnemies.length; i++) {
      const e = sectionEnemies[i];
      const tag = world.getComponent(e, "BeltSectionEnemy") as
        | { sectionIndex: number }
        | undefined;
      const health = world.getComponent(e, "Health") as
        | { current?: number; hp?: number }
        | undefined;
      if (!tag || tag.sectionIndex !== sectionIndex) continue;
      const hp = health?.current ?? health?.hp ?? 0;
      if (hp > 0) aliveInSection++;
    }

    state.sectionCleared = aliveInSection === 0;
    state.gateLocked = !state.sectionCleared;

    const section = config.sections[sectionIndex];
    const gateX = section?.gateX ?? Number.POSITIVE_INFINITY;

    const players = world.query("BeltMovement", "Transform");
    if (players.length === 0) return;
    const player = players[0];
    const transform = world.getComponent(player, "Transform") as
      | { x: number }
      | undefined;
    if (!transform) return;

    let desired =
      transform.x - config.viewportWidth * 0.35 + config.lookAhead;
    desired = Math.max(config.minCameraX, desired);

    if (state.gateLocked) {
      const maxCam = gateX - config.viewportWidth * 0.85;
      desired = Math.min(desired, Math.max(config.minCameraX, maxCam));
    }

    const t = 1 - Math.exp(-config.followSpeed * deltaTime);
    state.cameraX = state.cameraX + (desired - state.cameraX) * t;

    if (
      state.sectionCleared &&
      section &&
      transform.x >= section.gateX - 40 &&
      sectionIndex < config.sections.length - 1
    ) {
      state.currentSectionIndex = sectionIndex + 1;
      state.sectionCleared = false;
      state.gateLocked = true;
      const bus = world.getResource<{ emit?: (event: string, payload: unknown) => void }>("EventBus");
      bus?.emit?.("belt:section_advanced", {
        sectionIndex: state.currentSectionIndex
      });
    }

    world.setResource("CameraX", state.cameraX);
    world.setResource(BELT_CAMERA_STATE_RESOURCE, state);
  }
}
