/**
 * Belt camera + section gates for progressive scroll.
 * Scroll only advances when the current section's enemies are cleared
 * (classic arcade belt-scroll feel).
 */

import type { Component } from "@tiny-aster/core";

export interface BeltSection {
  id: string;
  startX: number;
  gateX: number;
  waveId?: string;
  isBoss?: boolean;
}

export interface BeltCameraConfig {
  viewportWidth: number;
  lookAhead: number;
  followSpeed: number;
  minCameraX: number;
  sections: BeltSection[];
}

/**
 * Section gates sized for an ~800px viewport so the first fight stays on-screen
 * and later sections leave room to scroll after clear.
 */
export const DEFAULT_BELT_CAMERA_CONFIG: BeltCameraConfig = {
  viewportWidth: 800,
  lookAhead: 40,
  followSpeed: 6,
  minCameraX: 0,
  sections: [
    { id: "forest_gate", startX: 0, gateX: 720, waveId: "wave_goblins" },
    { id: "ruins", startX: 720, gateX: 1400, waveId: "wave_skeletons" },
    { id: "bridge", startX: 1400, gateX: 2100, waveId: "wave_orcs" },
    { id: "citadel", startX: 2100, gateX: 2800, waveId: "wave_boss", isBoss: true }
  ]
};

export interface BeltCameraState {
  cameraX: number;
  currentSectionIndex: number;
  sectionCleared: boolean;
  gateLocked: boolean;
  /** True once at least one section enemy has been alive this section. */
  hadEnemiesThisSection: boolean;
}

export const BELT_CAMERA_CONFIG_RESOURCE = "BeltCameraConfig";
export const BELT_CAMERA_STATE_RESOURCE = "BeltCameraState";

export interface BeltSectionEnemyTag extends Component {
  type: "BeltSectionEnemy";
  sectionIndex: number;
}
