import { CoreComponentRegistry, CoreEvents, BlueprintDefinition } from "@tiny-aster/core";
import type {
  RacingComponentRegistry as LocalRacingComponentRegistry,
  RacingEventRegistry as LocalRacingEventRegistry,
  RacingInputState,
  RacingGameState
} from "./RacingTypes";

export interface RacingComponentRegistry extends CoreComponentRegistry, LocalRacingComponentRegistry {}
export interface RacingEventRegistry extends CoreEvents, LocalRacingEventRegistry {}

export interface RacingBlueprintMap extends Record<string, BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, unknown>> {
  car: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, { x: number; y: number; rotation?: number }>;
  wall: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, { x: number; y: number; width: number; height: number }>;
  checkpoint: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, {
    index: number; x: number; y: number; width?: number; height?: number; isFinish?: boolean;
  }>;
  state: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, Record<string, never>>;
}

export type { RacingInputState, RacingGameState };
