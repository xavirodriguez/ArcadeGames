/**
 * Hit&Run — fantasy belt-scroll beat'em-up (melee + ranged) on @tiny-aster/core.
 * Conversion from platformer run-and-gun toward classic belt-scroll feel.
 * Branch feature/hit-and-run → belt systems live under ./belt and ./fantasy.
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
import { registerHitRunHurt } from "./hurt/registerHitRunHurt";
import { registerBeltSystems } from "./belt/registerBeltSystems";
import { DEFAULT_COMBO_MELEE_CONFIG, COMBO_MELEE_CONFIG_RESOURCE } from "./melee/ComboMeleeTypes";

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

    registerBeltSystems(this.world);

    registerHitRunFeedback(this.world);
    registerHitRunHurt(this.world);
    registerHitRunMelee(this.world);

    this.world.setResource(COMBO_MELEE_CONFIG_RESOURCE, {
      ...DEFAULT_COMBO_MELEE_CONFIG
    });
  }

  protected override async onInitializeEntities(): Promise<void> {
    // Scaffold — player should receive BeltMovement + BeltInput + ComboMelee
    // + HitRunWeapon when level/blueprint wiring is completed.
  }

  public initializeRenderer(_renderer: Renderer<CoreComponentRegistry, RenderContext>): void {
    // Fantasy drawers: goblin, skeleton, orc, wraith, arrows, fireballs…
  }

  public getGameState(): HitAndRunGameState {
    const rs = this.world.getResource<RunState>("RunState");
    return {
      type: "HitAndRunGameState",
      score: rs
        ? rs.collectedTemporalIds.length * 10 + rs.collectedPermanentIds.length * 100
        : 0,
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
    actions: ["left", "right", "up", "down", "jump", "attack", "fire", "special"]
  },
  assets: EchoRunnerDefinition.assets
};

export type { HitAndRunGameState, HitAndRunInput };
