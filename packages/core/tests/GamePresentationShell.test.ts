import { GamePresentationShell, BaseGame, NullAudioPlayer } from "../src";

class TestGame extends BaseGame<any, any, any, any, any> {
  public update(_dt: number): void {}
  public getGameState(): any { return {}; }
  public isGameOver(): boolean { return false; }
}

describe("GamePresentationShell", () => {
  let game: TestGame;

  beforeEach(() => {
    game = new TestGame();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes audio player and scene manager from game instance", () => {
    const shell = new GamePresentationShell(game);
    expect(shell.game).toBe(game);
    expect(shell.audio).toBeDefined();
    expect(shell.sceneManager).toBe(game.sceneManager);
    expect(shell.canvas).toBeUndefined();
  });

  it("allows custom audio player override", () => {
    const customAudio = new NullAudioPlayer();
    const shell = new GamePresentationShell(game, { audio: customAudio });
    expect(shell.audio).toBe(customAudio);
  });

  it("calculates fallback screen config when no canvas or window is present", () => {
    const shell = new GamePresentationShell(game);
    const config = shell.calculateScreenConfig();
    expect(config.width).toBe(800);
    expect(config.height).toBe(600);
    expect(config.pixelRatio).toBe(1);
  });

  it("updates ScreenConfig resource on world when handling resize", () => {
    const shell = new GamePresentationShell(game);
    shell.handleScreenResize();
    const screenConfig = game.world.getResource<{ width: number; height: number; pixelRatio: number }>("ScreenConfig");
    expect(screenConfig).toEqual({ width: 800, height: 600, pixelRatio: 1 });
  });

  it("registers and unregisters window resize listeners idempotently", () => {
    const shell = new GamePresentationShell(game);
    expect(() => {
      shell.registerResizeListener();
      shell.setupCommonArcadeResources();
      shell.unregisterResizeListener();
      shell.destroy();
    }).not.toThrow();
  });
});
