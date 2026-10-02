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
  EchoRunnerDefinition
} from "../echorunner/EchoRunnerGame";
import type { EchoRunnerConfig } from "../echorunner/EchoRunnerGame";
import { PlatformerArcadeGame } from "../shared/PlatformerArcadeGame";
import type {
  HitAndRunGameState,
  HitAndRunInput
} from "./types/HitAndRunTypes";
import {
  CoreComponentRegistry,
  EventRegistry,
  WebAudioPlayer,
  RunState,
  Renderer,
  RenderContext
} from "@tiny-aster/core";
import { EchoRunnerBlueprintMap } from "../echorunner/EchoRunnerGame";

export type HitAndRunConfig = EchoRunnerConfig;

/**
 * HitAndRunGame is an arcade platformer game based on EchoRunner with a distinct gameId "hitandrun".
 */
export class HitAndRunGame extends PlatformerArcadeGame<
  HitAndRunGameState,
  HitAndRunInput,
  CoreComponentRegistry,
  EventRegistry,
  EchoRunnerBlueprintMap
> {
  public readonly gameId = "hitandrun";
  private gameOver = false;

  constructor(config: HitAndRunConfig = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      audio: new WebAudioPlayer()
    });
  }

  public update(dt: number): void {
    this.world.update(dt);
  }

  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();
  }

  protected override async onInitializeEntities(): Promise<void> {
    // Scaffold initial entities
  }

  public initializeRenderer(_renderer: Renderer<CoreComponentRegistry, RenderContext>): void {
    // Initialize renderer
  }

  public getGameState(): HitAndRunGameState {
    const rs = this.world.getResource<RunState>("RunState");
    return {
      type: "HitAndRunGameState",
      score: rs ? rs.collectedTemporalIds.length * 10 + rs.collectedPermanentIds.length * 100 : 0,
      isGameOver: this.gameOver,
      attempts: rs?.attempt ?? 1,
      deaths: rs?.deaths ?? 0,
      fragments: rs?.collectedTemporalIds.length ?? 0,
      cores: rs?.collectedPermanentIds.length ?? 0,
      activeCheckpoint: rs?.activeCheckpoint ?? null,
      elapsedTime: rs?.elapsedTime ?? 0
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
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
