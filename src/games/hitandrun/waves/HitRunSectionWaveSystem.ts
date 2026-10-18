/**
 * HitRunSectionWaveSystem — ties BeltCamera sections to WaveScript playback.
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
import { startWaveScript } from "./HitRunWaveSystem";
import {
  SAMPLE_WAVE_SCRIPTS,
  WAVE_OPENING,
  WAVE_PRESSURE,
  WAVE_BOSS_LEAD
} from "./sampleWaves";
import type { WaveScript } from "./HitRunWaveTypes";
import { WAVE_DIRECTOR_RESOURCE, type WaveDirectorState } from "./HitRunWaveTypes";

/** Map BeltSection.waveId → sample script (extend as content grows). */
const SECTION_WAVE_MAP: Record<string, WaveScript> = {
  wave_goblins: WAVE_OPENING,
  opening: WAVE_OPENING,
  wave_skeletons: WAVE_PRESSURE,
  pressure: WAVE_PRESSURE,
  wave_orcs: {
    ...WAVE_PRESSURE,
    id: "orcs",
    name: "ORCS"
  },
  wave_boss: WAVE_BOSS_LEAD,
  boss_lead: WAVE_BOSS_LEAD,
  ...SAMPLE_WAVE_SCRIPTS
};

function resolveSectionScript(waveId: string | undefined): WaveScript {
  if (waveId && SECTION_WAVE_MAP[waveId]) return SECTION_WAVE_MAP[waveId];
  return WAVE_OPENING;
}

/**
 * Offsets event X so the fight happens inside the current section corridor.
 */
function offsetScriptToSection(script: WaveScript, sectionStartX: number): WaveScript {
  const base = sectionStartX + 200;
  return {
    ...script,
    id: `${script.id}_s${sectionStartX}`,
    events: script.events.map((ev) => ({
      ...ev,
      x: (ev.x ?? 320) - 320 + base
    }))
  };
}

export class HitRunSectionWaveSystem extends System<CoreComponentRegistry> {
  private lastSectionIndex = -1;

  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    const camState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    if (!camState) return;

    const sectionIndex = camState.currentSectionIndex;
    if (sectionIndex === this.lastSectionIndex) return;

    this.lastSectionIndex = sectionIndex;

    const config =
      world.getResource<BeltCameraConfig>(BELT_CAMERA_CONFIG_RESOURCE) ??
      DEFAULT_BELT_CAMERA_CONFIG;
    const section = config.sections[sectionIndex];
    if (!section) return;

    const script = offsetScriptToSection(
      resolveSectionScript(section.waveId),
      section.startX
    );
    startWaveScript(world, script);
  }
}

/** Force restart of the current section wave (debug / death flow). */
export function restartCurrentSectionWave(world: World<CoreComponentRegistry>): void {
  const camState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
  const config =
    world.getResource<BeltCameraConfig>(BELT_CAMERA_CONFIG_RESOURCE) ??
    DEFAULT_BELT_CAMERA_CONFIG;
  if (!camState) return;
  const section = config.sections[camState.currentSectionIndex];
  if (!section) return;
  startWaveScript(
    world,
    offsetScriptToSection(resolveSectionScript(section.waveId), section.startX)
  );
}

export function isWaveDirectorIdle(world: World<CoreComponentRegistry>): boolean {
  const state = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
  return !state || !state.active;
}
