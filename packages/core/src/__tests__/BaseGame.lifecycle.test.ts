import { BaseGame, BaseGameConfig } from "../runtime/BaseGame";

class TestGame extends BaseGame<any, any, any, any, any> {
  public systemDisposeMock = jest.fn();
  public accumulateHandler = jest.fn();

  constructor(config: BaseGameConfig<any, any> = {}) {
    super(config);
    // Mock loop as requested: start, stop, pause, resume
    this.loop = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      subscribeUpdate: jest.fn(),
      subscribeRender: jest.fn()
    } as any;
  }

  public update(_dt: number): void {}
  public getGameState(): any { return {}; }
  public isGameOver(): boolean { return false; }

  protected override async onRegisterSystems(): Promise<void> {
    this.world.addSystem({
      update: () => {},
      onRegister: () => {},
      dispose: this.systemDisposeMock
    });
    // Register handler on the real event bus during registerSystems
    this.eventBus.on("test-accumulate" as any, this.accumulateHandler);
  }
}

class LifecycleGuardGame extends BaseGame<any, any, any, any, any> {
  public onRegisterSystemsDelay = 10;
  public onInitializeEntitiesDelay = 10;
  public onBeforeRestartDelay = 10;

  constructor(config: BaseGameConfig<any, any> = {}) {
    super(config);
    this.loop = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      subscribeUpdate: jest.fn(),
      subscribeRender: jest.fn()
    } as any;
  }

  public update(_dt: number): void {}
  public getGameState(): any { return {}; }
  public isGameOver(): boolean { return false; }

  protected override async onRegisterSystems(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.onRegisterSystemsDelay));
  }

  protected override async onInitializeEntities(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.onInitializeEntitiesDelay));
  }

  protected override async onBeforeRestart(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.onBeforeRestartDelay));
  }
}

describe("BaseGame lifecycle", () => {
  test("destroy() clears all registered systems", async () => {
    const game = new TestGame();
    await game.init();
    expect(game.world.schedule.getSystems().length).toBe(1);

    game.destroy();
    expect(game.world.schedule.getSystems().length).toBe(0);
    expect(game.systemDisposeMock).toHaveBeenCalled();
  });

  test("destroy() clears eventBus handlers", async () => {
    const game = new TestGame();
    await game.init();

    const handler = jest.fn();
    game.eventBus.on("test-event" as any, handler);

    game.destroy();
    game.eventBus.emit("test-event" as any, {});
    expect(handler).not.toHaveBeenCalled();
  });

  test("restart() does not accumulate eventBus handlers", async () => {
    const game = new TestGame();
    await game.init();

    // Call restart 3 times
    await game.restart();
    await game.restart();
    await game.restart();

    // Reset calls to be absolutely sure we only count the final emit
    game.accumulateHandler.mockClear();

    // Emit the event
    game.eventBus.emit("test-accumulate" as any, {});

    // Must be called exactly 1 time, not 4 (1 from init + 3 from restarts) or 3
    expect(game.accumulateHandler).toHaveBeenCalledTimes(1);
  });

  test("pause() is idempotent", () => {
    const game = new TestGame();
    // Initially not paused
    expect(game.isPausedState()).toBe(false);

    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.getGameLoop().pause).toHaveBeenCalledTimes(1);

    // Call pause() again
    game.pause();
    expect(game.isPausedState()).toBe(true);
    // Should NOT call loop.pause() again
    expect(game.getGameLoop().pause).toHaveBeenCalledTimes(1);
  });

  test("resume() is idempotent", () => {
    const game = new TestGame();
    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(0);

    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(1);

    // Call resume() again
    game.resume();
    expect(game.isPausedState()).toBe(false);
    // Should NOT call loop.resume() again
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(1);
  });

  test("resume() without prior pause() is a no-op", () => {
    const game = new TestGame();
    expect(game.isPausedState()).toBe(false);

    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.getGameLoop().resume).not.toHaveBeenCalled();
  });

  test("init() aborts if destroyed during onRegisterSystems()", async () => {
    const game = new LifecycleGuardGame();
    const initPromise = game.init();

    // Destroy immediately before onRegisterSystems resolves
    game.destroy();

    await initPromise;
    expect(game.getLifecycleState()).toBe("DESTROYED");
    expect(game.getGameLoop().start).not.toHaveBeenCalled();
  });

  test("init() aborts if destroyed during onInitializeEntities()", async () => {
    const game = new LifecycleGuardGame();
    // Make onRegisterSystems fast so it resolves before we destroy, but keep onInitializeEntities slow
    game.onRegisterSystemsDelay = 1;
    game.onInitializeEntitiesDelay = 50;

    const initPromise = game.init();

    // Wait a little bit for onRegisterSystems to finish
    await new Promise(resolve => setTimeout(resolve, 5));
    // Destroy now, which is during onInitializeEntities
    game.destroy();

    await initPromise;
    expect(game.getLifecycleState()).toBe("DESTROYED");
    expect(game.getGameLoop().start).not.toHaveBeenCalled();
  });

  test("restart() aborts if destroyed during onBeforeRestart()", async () => {
    const game = new LifecycleGuardGame();
    await game.init();

    // Clear calls
    const startMock = game.getGameLoop().start as jest.Mock;
    startMock.mockClear();

    // Trigger restart
    const restartPromise = game.restart();

    // Destroy during onBeforeRestart
    game.destroy();

    await restartPromise;
    // It should have remained DESTROYED and not resurrected back to UNINITIALIZED / READY / RUNNING
    expect(game.getLifecycleState()).toBe("DESTROYED");
    expect(game.getGameLoop().start).not.toHaveBeenCalled();
  });

  test("init() times out and sets lifecycle state to ERROR when initialization hangs", async () => {
    class HangingGame extends BaseGame<any, any, any, any, any> {
      public update(_dt: number): void {}
      public getGameState(): any { return {}; }
      public isGameOver(): boolean { return false; }

      protected override async onRegisterSystems(): Promise<void> {
        // Never resolves
        return new Promise(() => {});
      }
    }

    const game = new HangingGame({ initTimeout: 50 });

    await expect(game.init()).rejects.toThrow("Game initialization timed out");
    expect(game.getLifecycleState()).toBe("ERROR");
  });

  test("allows custom inputSystem and sceneManagerFactory injection, falling back to defaults", async () => {
    // 1. Without injecting anything:
    const gameDefault = new TestGame();
    expect(gameDefault.getInputSystem()).toBeDefined();
    expect(gameDefault.sceneManager).toBeDefined();

    // 2. With injecting custom implementations:
    const mockInputSystem = {
      setOverride: jest.fn(),
      clearOverride: jest.fn(),
      getAction: jest.fn(),
      bind: jest.fn()
    };
    const mockSceneManager = { dummy: true } as any;
    const mockSceneManagerFactory = jest.fn().mockReturnValue(mockSceneManager);

    const gameCustom = new TestGame({
      inputSystem: mockInputSystem,
      sceneManagerFactory: mockSceneManagerFactory
    });

    expect(gameCustom.getInputSystem()).toBe(mockInputSystem);
    expect(gameCustom.sceneManager).toBe(mockSceneManager);
    expect(mockSceneManagerFactory).toHaveBeenCalledWith(gameCustom.world, gameCustom.eventBus);

    // Verify it propagates to restart()
    await gameCustom.restart();
    expect(gameCustom.getInputSystem()).toBe(mockInputSystem);
    expect(gameCustom.sceneManager).toBe(mockSceneManager);
  });

  test("verifies the exact invocation order of lifecycle hooks during init() and restart()", async () => {
    const invocationOrder: string[] = [];

    class OrderTestGame extends BaseGame<any, any, any, any, any> {
      constructor() {
        super();
        this.loop = {
          start: jest.fn(),
          stop: jest.fn(),
          pause: jest.fn(),
          resume: jest.fn(),
          subscribeUpdate: jest.fn(),
          subscribeRender: jest.fn()
        } as any;
      }

      public update(_dt: number): void {}
      public getGameState(): any { return {}; }
      public isGameOver(): boolean { return false; }

      protected override async onRegisterSystems(): Promise<void> {
        invocationOrder.push("onRegisterSystems");
      }

      protected override async onInitializeEntities(): Promise<void> {
        invocationOrder.push("onInitializeEntities");
      }

      protected override async onBeforeRestart(): Promise<void> {
        invocationOrder.push("onBeforeRestart");
      }
    }

    const game = new OrderTestGame();
    expect(invocationOrder).toEqual([]);

    await game.init();
    expect(invocationOrder).toEqual(["onRegisterSystems", "onInitializeEntities"]);

    // Clear and test restart
    invocationOrder.length = 0;
    await game.restart();
    expect(invocationOrder).toEqual([
      "onBeforeRestart",
      "onRegisterSystems",
      "onInitializeEntities"
    ]);
  });

  test("PlaySFX events propagate and trigger audio.playSFX", () => {
    const mockAudioPlayer = {
      loadSFX: jest.fn(),
      playSFX: jest.fn(),
      playBGM: jest.fn(),
      stopBGM: jest.fn(),
      pauseBGM: jest.fn(),
      setMasterVolume: jest.fn(),
      setSFXVolume: jest.fn(),
      setBGMVolume: jest.fn(),
      playSpatialSFX: jest.fn()
    };
    const game = new TestGame({ audio: mockAudioPlayer });
    game.getEventBus().emit("PlaySFX" as any, { name: "hit" });
    expect(mockAudioPlayer.playSFX).toHaveBeenCalledWith("hit");
  });
});
