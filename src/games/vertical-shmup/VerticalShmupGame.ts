import { BaseGame, ConfigService, NetworkManager, NetworkController, NullBaseGame, WebAudioPlayer, preloadSharedAudioManifest, SHARED_AUDIO_MANIFEST, GameDefinition, BaseGameConfig, SystemPhase } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { loadAndMutateConfig } from "../shared/configHelper";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { ShmupConfigSchema, ShmupConfig } from "./types/ShmupConfigSchema";
import { ShmupComponentRegistry, ShmupEventRegistry, ShmupInputState, ShmupGameStateComponent } from "./types/ShmupTypes";
import { PlayerBulletPool, EnemyBulletPool } from "./EntityPool";
import { ShmupGameScene } from "./scenes/ShmupGameScene";
import configRaw from "./config/vertical-shmup.json";

export class VerticalShmupGame extends BaseGame<ShmupGameStateComponent, ShmupInputState, ShmupComponentRegistry, ShmupEventRegistry> {
  public readonly gameId = "vertical-shmup";
  private config: ShmupConfig;
  private readonly network: NetworkController<ShmupComponentRegistry>;
  constructor(config: BaseGameConfig<ShmupComponentRegistry, ShmupEventRegistry, ShmupInputState> = {}) {
    const loaded = ConfigService.load<ShmupConfig>("vertical-shmup", ShmupConfigSchema, config.gameOptions?.rawConfig ?? configRaw);
    super({ pauseKey: "Escape", restartKey: "KeyR", isMultiplayer: config.isMultiplayer, headless: config.headless, theme: config.theme ?? createThemeFromGameAccents("vertical-shmup"), gameOptions: config.gameOptions, audio: config.audio ?? new WebAudioPlayer() });
    this.config = loaded;
    this.network = new NetworkController<ShmupComponentRegistry>(this.world);
  }
  protected override async onRegisterSystems(): Promise<void> {
    this.config = loadAndMutateConfig(this.gameId, ShmupConfigSchema, configRaw, this._config.gameOptions);
    this.world.setResource("GameConfig", this.config);
    this.world.setResource("IsHeadless", this.isHeadless);
    this.world.setResource("NetworkManager", NetworkManager.registerGame(this.gameId, this, {}));
    const scene = new ShmupGameScene(this.config, new PlayerBulletPool(), new EnemyBulletPool());
    scene.onEnter();
    // Keep the scene's world as the simulation world for this game.
    this._world = scene.world;
  }
  protected override async onPreloadAssets(): Promise<void> { await preloadSharedAudioManifest(this.audio); }
  public setInputState(input: Partial<ShmupInputState>): void {
    const player = this.world.query("ShmupPlayer", "Input")[0];
    if (player === undefined) return;
    this.world.mutateComponent(player, "Input", i => {
      if (input.axes) i.axes = { ...i.axes, ...input.axes };
      if (input.actions) i.actions = input.actions;
    });
  }
  public getGameState(): ShmupGameStateComponent { return this.world.getSingleton("ShmupGameState") ?? { type: "ShmupGameState", score: 0, wave: 1, scrollDistance: 0, isGameOver: false, spawnTimer: 0 }; }
  public isGameOver(): boolean { return this.getGameState().isGameOver; }
}
export class NullVerticalShmupGame extends NullBaseGame<ShmupGameStateComponent, ShmupInputState, ShmupComponentRegistry> {
  public readonly gameId = "vertical-shmup";
  public getGameState(): ShmupGameStateComponent { return { type: "ShmupGameState", score: 0, wave: 1, scrollDistance: 0, isGameOver: false, spawnTimer: 0 }; }
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
