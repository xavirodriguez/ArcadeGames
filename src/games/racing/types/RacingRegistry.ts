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
  car: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, { x: number; y: number; rotation?: number; isAI?: boolean; color?: string }>;
  wall: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, { x: number; y: number; width: number; height: number }>;
  checkpoint: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, {
    index: number; x: number; y: number; width?: number; height?: number; isFinish?: boolean;
  }>;
  state: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, Record<string, never>>;
  track_surface: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, {
    width: number; height: number;
  }>;
  track_ribbon: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, Record<string, never>>;
  skid_marks: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, Record<string, never>>;
  smoke: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, Record<string, never>>;
  track_zone: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, {
    id: string; x: number; y: number; width: number; height: number; surface: string;
  }>;
  track_obstacle: BlueprintDefinition<RacingComponentRegistry, RacingEventRegistry, {
    id: string; x: number; y: number; radius: number; kind: string;
  }>;
}

export type { RacingInputState, RacingGameState };
