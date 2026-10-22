import { System, SystemPhase, World } from "@tiny-aster/core";
import type { OutrunComponentRegistry, OutrunEventRegistry, RaceStateComponent, RoadData } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { OutrunParallaxState } from "../types/OutrunVisualTypes";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { computeParallaxState } from "../rendering/OutrunScenery";

/** Presentation-only parallax; writes only visual parallax offsets. */
export class ParallaxSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public readonly phase = SystemPhase.Presentation;
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    _deltaTime: number
  ): void {
    const state = world.getSingleton("RaceState") as RaceStateComponent | undefined;
    const roadData = world.getResource<RoadData>("RoadData");
    const config = world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
    if (!state || !roadData || roadData.trackLength <= 0) return;
    const parallax: OutrunParallaxState = computeParallaxState(state, roadData, config);
    world.setResource("ParallaxState", parallax);
  }
}
