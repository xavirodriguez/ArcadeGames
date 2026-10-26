/* eslint-disable @typescript-eslint/no-require-imports */
import { BaseGame, ConfigService, NetworkManager, NetworkController, NullBaseGame, WebAudioPlayer, preloadSharedAudioManifest, SHARED_AUDIO_MANIFEST, GameDefinition, BaseGameConfig, World, AssetLoader } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { loadAndMutateConfig } from "../shared/configHelper";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { ShmupConfigSchema, ShmupConfig } from "./types/ShmupConfigSchema";
import { ShmupComponentRegistry, ShmupEventRegistry, ShmupInputState, ShmupInputUpdate, ShmupKeyboardInputState, ShmupGameStateComponent } from "./types/ShmupTypes";
import { PlayerBulletPool, EnemyBulletPool } from "./EntityPool";
import { initializeShmupRenderer } from "./rendering/ShmupRenderer";
import { registerSharedVFX } from "../shared/rendering/SharedVFX";
import { Renderer, RenderContext } from "@tiny-aster/core";
import { ShmupGameScene } from "./scenes/ShmupGameScene";
import configRaw from "./config/vertical-shmup.json";
import { Asset } from "expo-asset";

export class VerticalShmupGame extends BaseGame<ShmupGameStateComponent, ShmupInputState, ShmupComponentRegistry, ShmupEventRegistry> {
  public readonly gameId = "vertical-shmup";
  private config: ShmupConfig;
  private readonly network: NetworkController<ShmupComponentRegistry>;
  private readonly assetLoader: AssetLoader;

  constructor(config: BaseGameConfig<ShmupComponentRegistry, ShmupEventRegistry, ShmupInputState> = {}) {
    const loaded = ConfigService.load<ShmupConfig>("vertical-shmup", ShmupConfigSchema, config.gameOptions?.rawConfig ?? configRaw);
    super({ pauseKey: "Escape", restartKey: "KeyR", isMultiplayer: config.isMultiplayer, headless: config.headless, theme: config.theme ?? createThemeFromGameAccents("vertical-shmup"), gameOptions: config.gameOptions, audio: config.audio ?? new WebAudioPlayer() });
    this.config = loaded;
    this.assetLoader = new AssetLoader({
      async loadImage(path: string): Promise<unknown> {
        if (path !== "shmup_sumi_e_player") return undefined;
        const asset = Asset.fromModule(require("../../../assets/shmup/sumi-e/player_ship.png"));
        await asset.downloadAsync();
        return { uri: asset.localUri ?? asset.uri };
      },
      async loadAudio(path: string): Promise<unknown> { return path; },
      async loadFont(path: string): Promise<unknown> { return path; }
    });
    this.network = new NetworkController<ShmupComponentRegistry>(this.world);
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = loadAndMutateConfig(this.gameId, ShmupConfigSchema, configRaw, this._config.gameOptions);
    this.world.setResource("GameConfig", this.config);
    this.world.setResource("IsHeadless", this.isHeadless);
    NetworkManager.registerGame(this.gameId, this, {});
    new ShmupGameScene(this.config, new PlayerBulletPool(), new EnemyBulletPool(), this.world, this._config.gameOptions).onEnter();
  }

  protected override async onPreloadAssets(): Promise<void> {
    this.world.setResource("AssetLoader", this.assetLoader);
    if (!this.isHeadless) {
      try {
        await this.assetLoader.load([{ id: "shmup_sumi_e_player", type: "image", path: "shmup_sumi_e_player" }]);
        this.world.setResource("ShmupSumiEPlayerSpriteReady", true);
      } catch {
        this.world.setResource("ShmupSumiEPlayerSpriteReady", false);
      }
    }
    await preloadSharedAudioManifest(this.audio);
  }

  public setInputState(input: ShmupInputUpdate): void {
    const player = this.world.query("ShmupPlayer", "Input")[0];
    if (player === undefined) return;

    const hasStructuredInput = "axes" in input || "actions" in input;
    const structuredAxes = "axes" in input ? input.axes : undefined;
    const structuredActions = "actions" in input ? input.actions : undefined;
    const keyboardInput = input as ShmupKeyboardInputState;

    this.world.mutateComponent(player, "Input", i => {
      if (hasStructuredInput) {
        if (structuredAxes) i.axes = { ...i.axes, ...structuredAxes };
        if (structuredActions !== undefined) i.actions = [...structuredActions];
        return;
      }

      if (typeof keyboardInput.moveX === "number") {
        i.axes.moveX = keyboardInput.moveX;
      } else if (keyboardInput.moveLeft !== undefined || keyboardInput.moveRight !== undefined) {
        i.axes.moveX = (keyboardInput.moveRight ? 1 : 0) - (keyboardInput.moveLeft ? 1 : 0);
      }

      if (typeof keyboardInput.moveY === "number") {
        i.axes.moveY = keyboardInput.moveY;
      } else if (keyboardInput.moveUp !== undefined || keyboardInput.moveDown !== undefined) {
        i.axes.moveY = (keyboardInput.moveDown ? 1 : 0) - (keyboardInput.moveUp ? 1 : 0);
      }

      if (typeof keyboardInput.shoot === "boolean") {
        i.actions = keyboardInput.shoot
          ? (i.actions.includes("shoot") ? [...i.actions] : [...i.actions, "shoot"])
          : i.actions.filter((action: string) => action !== "shoot");
      }
    });
  }

  public getGameState(): ShmupGameStateComponent {
    return this.world.getSingleton("ShmupGameState") ?? { type: "ShmupGameState", score: 0, wave: 1, lives: 3, scrollDistance: 0, isGameOver: false, spawnTimer: 0 };
  }

  public isGameOver(): boolean { return this.getGameState().isGameOver; }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public initializeRenderer(renderer: Renderer<ShmupComponentRegistry, RenderContext>): void {
    registerSharedVFX(renderer);
    initializeShmupRenderer(renderer);
  }
}

export class NullVerticalShmupGame extends NullBaseGame<ShmupGameStateComponent, ShmupInputState, ShmupComponentRegistry> {
  public readonly gameId = "vertical-shmup";
  public getGameState(): ShmupGameStateComponent {
    return { type: "ShmupGameState", score: 0, wave: 1, lives: 3, scrollDistance: 0, isGameOver: false, spawnTimer: 0 };
  }
}

export const VerticalShmupDefinition: GameDefinition = {
  name: "vertical-shmup",
  createSimulation: (seed: number) => new VerticalShmupGame({ gameOptions: { seed } }),
  inputSchema: { actions: ["shoot", "pause"], axes: ["moveX", "moveY"] },
  assets: { sprites: [], sounds: SHARED_AUDIO_MANIFEST }
};

registerMutatorHook("shmup_speed", (world: World<ShmupComponentRegistry>) => {
  const state = world.getSingleton("ShmupGameState");
  if (state) state.wave += 1;
});
