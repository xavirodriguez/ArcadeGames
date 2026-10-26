import { StoryRuntime, GameLifecycleState, StoryGraph } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { keplersGhostStoryGraph } from "../story/KeplersGhostGraph";

describe("AsteroidsGame Dependency Inversion Tests", () => {
  let game: AsteroidsGame | null = null;

  afterEach(() => {
    if (game) {
      game.destroy();
      game = null;
    }
  });

  it("should initialize deathmatch mode without storyGraph", async () => {
    game = new AsteroidsGame({
      headless: true,
      gameOptions: {
        mode: "deathmatch"
      }
    });

    await expect(game.init()).resolves.not.toThrow();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    const world = game.getWorld();
    expect(world.getResource("StoryRuntime")).toBeUndefined();
  });

  it("should initialize story mode with injected storyGraph", async () => {
    game = new AsteroidsGame({
      headless: true,
      gameOptions: {
        mode: "story",
        storyGraph: keplersGhostStoryGraph
      }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    const world = game.getWorld();
    const storyRuntime = world.getResource<StoryRuntime>("StoryRuntime");
    expect(storyRuntime).toBeDefined();
    expect(storyRuntime?.getState().graphId).toBe(keplersGhostStoryGraph.id);
  });

  it("should fail initialization when mode is story but no storyGraph is provided", async () => {
    game = new AsteroidsGame({
      headless: true,
      gameOptions: {
        mode: "story"
      }
    });

    await expect(game.init()).rejects.toThrow(
      "AsteroidsGame requires gameOptions.storyGraph when mode is 'story'."
    );
    expect(game.getLifecycleState()).toBe(GameLifecycleState.ERROR);
  });

  it("should support a custom StoryGraph instance instead of a global default", async () => {
    const customGraph: StoryGraph = {
      id: "custom_test_campaign_graph",
      title: "Custom Test Campaign",
      entryNodeId: "start_node",
      nodes: {
        start_node: {
          id: "start_node",
          type: "dialogue",
          title: "Test Dialogue Node",
          isEndNode: true,
          dialogue: {
            id: "d1",
            lines: [{ textKey: "Hello Custom Campaign" }]
          }
        }
      }
    };

    game = new AsteroidsGame({
      headless: true,
      gameOptions: {
        mode: "story",
        storyGraph: customGraph
      }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    const world = game.getWorld();
    const storyRuntime = world.getResource<StoryRuntime>("StoryRuntime");
    expect(storyRuntime?.getState().graphId).toBe("custom_test_campaign_graph");
  });
});
