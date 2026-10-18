/**
 * BeltCameraSystem — follow player on X, clamp at section gates until cleared.
 */

import {
  System,
  World,
  CoreComponentRegistry,
  Camera2DComponent
} from "@tiny-aster/core";
import {
  BELT_CAMERA_CONFIG_RESOURCE,
  BELT_CAMERA_STATE_RESOURCE,
  DEFAULT_BELT_CAMERA_CONFIG,
  type BeltCameraConfig,
  type BeltCameraState
} from "./BeltCameraTypes";
import {
  WAVE_DIRECTOR_RESOURCE,
  type WaveDirectorState
} from "../waves/HitRunWaveTypes";

/** Resource: living enemy count used by HUD / debug. */
export const BELT_ALIVE_ENEMIES_RESOURCE = "BeltAliveEnemies";

function isPlayerEntity(world: World<CoreComponentRegistry>, e: number): boolean {
  return (
    world.hasComponent(e, "BeltInput") || world.hasComponent(e, "PlatformerInput")
  );
}

function isEnemyFaction(world: World<CoreComponentRegistry>, e: number): boolean {
  if (world.hasComponent(e, "Enemy")) return true;
  const faction = world.getComponent(e, "Faction") as
    | { value?: string; faction?: string }
    | undefined;
  const f = faction?.value ?? faction?.faction;
  if (f === "enemy") return true;
  const tag = world.getComponent(e, "Tag") as { tags?: string[] } | undefined;
  if (tag?.tags?.includes("Enemy")) return true;
  return false;
}

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
        gateLocked: true,
        hadEnemiesThisSection: false
      };
      world.setResource(BELT_CAMERA_STATE_RESOURCE, state);
    }
    if (state.hadEnemiesThisSection === undefined) {
      state.hadEnemiesThisSection = false;
    }

    const sectionIndex = state.currentSectionIndex;

    const withHealth = world.query("Health");
    let aliveInSection = 0;

    for (let i = 0; i < withHealth.length; i++) {
      const e = withHealth[i];
      if (isPlayerEntity(world, e)) continue;
      if (world.hasComponent(e, "Dead")) continue;
      if (!isEnemyFaction(world, e)) continue;

      const sectionTag = world.getComponent(e, "BeltSectionEnemy") as
        | { sectionIndex: number }
        | undefined;
      if (sectionTag && sectionTag.sectionIndex !== sectionIndex) continue;

      const health = world.getComponent(e, "Health") as
        | { current?: number; hp?: number }
        | undefined;
      const hp = health?.current ?? health?.hp ?? 0;
      if (hp > 0) aliveInSection++;
    }

    world.setResource(BELT_ALIVE_ENEMIES_RESOURCE, aliveInSection);

    if (aliveInSection > 0) {
      state.hadEnemiesThisSection = true;
    }

    const wave = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    if (wave && wave.totalSpawned > 0) {
      state.hadEnemiesThisSection = true;
    }

    const spawning = (wave?.pendingStaggers?.length ?? 0) > 0;

    state.sectionCleared =
      state.hadEnemiesThisSection && aliveInSection === 0 && !spawning;
    state.gateLocked = !state.sectionCleared;

    const section = config.sections[sectionIndex];
    const gateX = section?.gateX ?? Number.POSITIVE_INFINITY;

    const players = world.query("BeltMovement", "Transform");
    if (players.length === 0) {
      world.setResource(BELT_CAMERA_STATE_RESOURCE, state);
      return;
    }
    const player = players[0];
    const transform = world.getMutableComponent(player, "Transform") as
      | { x: number; worldX?: number }
      | undefined;
    if (!transform) {
      world.setResource(BELT_CAMERA_STATE_RESOURCE, state);
      return;
    }

    if (state.gateLocked && Number.isFinite(gateX)) {
      const maxPlayerX = gateX - 24;
      if (transform.x > maxPlayerX) {
        transform.x = maxPlayerX;
        if (transform.worldX !== undefined) transform.worldX = maxPlayerX;
        const vel = world.getMutableComponent(player, "Velocity") as
          | { vx: number }
          | undefined;
        if (vel && vel.vx > 0) vel.vx = 0;
      }
    }

    let desired =
      transform.x - config.viewportWidth * 0.35 + config.lookAhead;
    desired = Math.max(config.minCameraX, desired);

    if (state.gateLocked && Number.isFinite(gateX)) {
      const maxCam = Math.max(
        config.minCameraX,
        gateX - config.viewportWidth * 0.75
      );
      desired = Math.min(desired, maxCam);
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
      state.hadEnemiesThisSection = false;
      world.setResource(BELT_ALIVE_ENEMIES_RESOURCE, 0);
      const bus = world.getResource<{ emit?: (event: string, payload: unknown) => void }>("EventBus");
      bus?.emit?.("belt:section_advanced", {
        sectionIndex: state.currentSectionIndex
      });
    }

    world.setResource("CameraX", state.cameraX);
    world.setResource(BELT_CAMERA_STATE_RESOURCE, state);

    const cams = world.query("Camera2D");
    for (let i = 0; i < cams.length; i++) {
      const camComp = world.getComponent(cams[i], "Camera2D") as
        | Camera2DComponent
        | undefined;
      if (!camComp?.isMain) continue;
      world.mutateComponent(cams[i], "Camera2D", (c: Camera2DComponent) => {
        c.followEntity = undefined;
        c.x = state.cameraX;
        c.targetX = state.cameraX;
      });
      break;
    }
  }
}
