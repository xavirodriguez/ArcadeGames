/**
 * Hit&Run — platformer run-and-gun / melee on @tiny-aster/core.
 * Branch feature/hit-and-run.
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
import { registerHitRunMelee } from "./melee/registerHitRunMelee";
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";

export type HitAndRunConfig = EchoRunnerConfig;

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
    registerHitRunFeedback(this.world);
    registerHitRunMelee(this.world);
  }

  protected override async onInitializeEntities(): Promise<void> {
    // Scaffold — player with MeleeAttack from level/blueprint wiring.
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
    actions: ["left", "right", "jump", "pulse", "attack"]
  },
  assets: EchoRunnerDefinition.assets
};

export type { HitAndRunGameState, HitAndRunInput };
