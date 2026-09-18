import {
  EventBus,
  StoryRuntime,
  MidGameNarrativeDirector,
  BaseGame,
  MiniGameRunContext,
  MiniGameResult
} from "@tiny-aster/core";
import { setupStoryEventBridge } from "../useStoryEventBridge";

describe("useStoryEventBridge isolated unit test", () => {
  let eventBus: EventBus;
  let runtime: StoryRuntime;
  let midGameDirector: MidGameNarrativeDirector;

  beforeEach(() => {
    eventBus = new EventBus();
    runtime = new StoryRuntime();
    midGameDirector = new MidGameNarrativeDirector();
  });

  it("subscribes to story:scene_change and game:over and triggers callbacks correctly", () => {
    const onSceneChange = jest.fn();
    const onGameOver = jest.fn();

    const activeGameIdRef = { current: "asteroids" };
    const activeRunContextRef = { current: { runId: "test_run_1" } as MiniGameRunContext };
    const sessionStartTimeRef = { current: Date.now() - 5000 };

    const mockGetMiniGameResult = jest.fn().mockReturnValue({
      runId: "test_run_1",
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 5000,
      metrics: {},
      secretsFound: []
    } as MiniGameResult);

    const mockGame: Partial<BaseGame> = {
      getMiniGameResult: mockGetMiniGameResult
    };

    const currentGameRef = { current: mockGame as BaseGame };

    const cleanup = setupStoryEventBridge({
      eventBus,
      runtime,
      midGameDirector,
      activeGameIdRef,
      activeRunContextRef,
      sessionStartTimeRef,
      currentGameRef,
      onSceneChange,
      onGameOver
    });

    // 1. Emit story:scene_change
    eventBus.emit("story:scene_change", { sceneToLoad: "space-invaders" });
    expect(onSceneChange).toHaveBeenCalledTimes(1);
    expect(onSceneChange).toHaveBeenCalledWith("space-invaders");

    // 2. Emit game:over
    eventBus.emit("game:over", {});
    expect(mockGetMiniGameResult).toHaveBeenCalledWith({
      runId: "test_run_1",
      gameId: "asteroids"
    });
    expect(onGameOver).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith({
      runId: "test_run_1",
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 5000,
      metrics: {},
      secretsFound: []
    });

    // 3. Test cleanup unsubscription
    cleanup();
    eventBus.emit("story:scene_change", { sceneToLoad: "flappybird" });
    expect(onSceneChange).toHaveBeenCalledTimes(1);
  });
});
