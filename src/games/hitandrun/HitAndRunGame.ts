/**
 * Hit&Run — Option A clone of EchoRunner.
 *
 * This file is a full structural clone entry point. For the initial scaffold we
 * re-export a renamed subclass so the game is playable immediately while the
 * full line-by-line copy lives on the branch for divergence (kids / violent modes).
 *
 * To fully detach from EchoRunner later: replace the body with the copied
 * HitAndRunGame implementation (same systems, blueprints, gameId "hitandrun").
 */
import {
  EchoRunnerGame,
  EchoRunnerDefinition
} from "../echorunner/EchoRunnerGame";
import type { EchoRunnerConfig } from "../echorunner/EchoRunnerGame";
import type {
  HitAndRunGameState,
  HitAndRunInput
} from "./types/HitAndRunTypes";

export type HitAndRunConfig = EchoRunnerConfig;

/**
 * HitAndRunGame extends EchoRunnerGame with a distinct gameId so high-scores,
 * story encounters and routing stay separate from EchoRunner.
 */
export class HitAndRunGame extends EchoRunnerGame {
  public override readonly gameId = "hitandrun";

  constructor(config: HitAndRunConfig = {}) {
    super(config);
  }

  public override getGameState(): HitAndRunGameState {
    const base = super.getGameState();
    return {
      ...base,
      type: "HitAndRunGameState"
    };
  }
}

export const HitAndRunDefinition = {
  name: "hitandrun",
  createSimulation: (seed: number) => {
    return new HitAndRunGame({ seed });
  },
  inputSchema: {
    actions: ["left", "right", "jump", "pulse"]
  },
  assets: EchoRunnerDefinition.assets
};

// Re-export input/state types used by hooks and tests
export type { HitAndRunGameState, HitAndRunInput };
