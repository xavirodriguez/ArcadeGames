import { System, SystemPhase, World } from "@tiny-aster/core";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  RaceStateComponent,
  RoadData
} from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { paletteAtProgress, skyBandsForPalette, stageAtProgress } from "../utils/palette";

/**
 * Presentation-only daylight script. Reads race position and road length but
 * never mutates RaceState, RoadData, Racer or any gameplay component.
 */
export class ColorScriptSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public readonly phase = SystemPhase.Presentation;

  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    _deltaTime: number
  ): void {
    const raceState = world.getSingleton("RaceState") as RaceStateComponent | undefined;
    const roadData = world.getResource<RoadData>("RoadData");
    const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
    if (!raceState || !roadData || roadData.trackLength <= 0 || config.visual.stages.length === 0) return;

    const progress = ((raceState.playerZ % roadData.trackLength) + roadData.trackLength) % roadData.trackLength /
      roadData.trackLength;
    const stagePosition = stageAtProgress(config.visual.stages, progress);
    const current = stagePosition.stage;
    const next = config.visual.stages[(stagePosition.stageIndex + 1) % config.visual.stages.length];
    const tokens = paletteAtProgress({
      current,
      next,
      palette: config.visual.palette,
      paletteColorblind: config.visual.paletteColorblind,
      paletteMode: config.visual.paletteMode,
      transitionFraction: config.visual.transitionFraction
    }, stagePosition.stageProgress);

    const visualPalette: OutrunVisualPaletteResource = {
      stageIndex: stagePosition.stageIndex,
      stageProgress: stagePosition.stageProgress,
      hour: current.hour,
      decor: current.decor,
      tokens,
      shared: config.visual.palette.shared,
      skyBands: skyBandsForPalette(tokens),
      quality: config.visual.quality,
      paletteMode: config.visual.paletteMode,
      tuning: config.visual.tuning
    };
    world.setResource("VisualPalette", visualPalette);
  }
}
