import {
  World,
  EventBus,
  SceneManager,
  Scene,
  StoryRuntime,
  StoryGraphValidator,
  MultiGameTestCampaign
} from "../src";

class MockGameScene extends Scene {
  public sceneName: string;

  constructor(name: string, world?: World) {
    super(world ?? new World());
    this.sceneName = name;
  }

  public override async onEnter(): Promise<void> {}
  public override async onExit(): Promise<void> {}
}

describe("Multi-Game Vertical Slice Campaign Integration Tests", () => {
  let world: World;
  let eventBus: EventBus;
  let sceneManager: SceneManager;
  let runtime: StoryRuntime;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    sceneManager = new SceneManager(world, eventBus);
    runtime = new StoryRuntime();
    runtime.bindWorld(world);

    // Bind runtime to SceneManager for data-driven scene switching
    sceneManager.bindStoryRuntime(runtime, (sceneName: string) => {
      return new MockGameScene(sceneName);
    });
  });

  it("should pass static graph validation for MultiGameTestCampaign", () => {
    const result = StoryGraphValidator.validate(MultiGameTestCampaign);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("should execute full multi-game vertical slice flow from intro through Asteroids objective to Space Invaders", async () => {
    const nodeChanges: string[] = [];
    const sceneSwitches: string[] = [];

    eventBus.on("story:node_changed", (e: any) => {
      nodeChanges.push(e.currentNodeId);
    });

    eventBus.on("story:scene_change", (e: any) => {
      sceneSwitches.push(e.sceneToLoad);
    });

    // 1. Load MultiGameTestCampaign -> Starts at Node 1 (intro cutscene dialogue)
    runtime.loadGraph(MultiGameTestCampaign);

    expect(runtime.getCurrentNode()?.id).toBe("node_1_intro");
    expect(runtime.getCurrentNode()?.dialogue?.lines[0].textKey).toBe("story.test.intro_cutscene");

    // 2. Complete intro cutscene dialogue -> Transitions to Node 2 (Asteroids stage)
    eventBus.emit("dialogue:completed", {});

    // Allow async scene switch promise to resolve
    await new Promise(r => setTimeout(r, 10));

    expect(runtime.getCurrentNode()?.id).toBe("node_2_asteroids");
    expect(sceneSwitches).toContain("asteroids");

    const currentScene = sceneManager.getCurrentScene() as MockGameScene;
    expect(currentScene).toBeDefined();
    expect(currentScene.sceneName).toBe("asteroids");

    // 3. Simulate destroying 5 rocks in gameplay
    for (let i = 1; i <= 5; i++) {
      eventBus.emit("rock:destroyed", { amount: 1 });
    }

    // Story runtime should automatically advance to Node 3 (Victory dialogue)
    expect(runtime.getCurrentNode()?.id).toBe("node_3_victory");
    expect(runtime.getCurrentNode()?.dialogue?.lines[0].textKey).toBe("story.test.mission_accomplished");

    // Objective should be marked as completed
    const objective = runtime.getState().objectives["obj_destroy_rocks"];
    expect(objective).toBeDefined();
    expect(objective.completed).toBe(true);
    expect(objective.currentCount).toBe(5);

    // 4. Complete victory dialogue -> Transitions directly to Node 4 (Space Invaders stage)
    eventBus.emit("dialogue:completed", {});

    await new Promise(r => setTimeout(r, 10));

    expect(runtime.getCurrentNode()?.id).toBe("node_4_space_invaders");
    expect(sceneSwitches).toContain("space_invaders");

    const newScene = sceneManager.getCurrentScene() as MockGameScene;
    expect(newScene).toBeDefined();
    expect(newScene.sceneName).toBe("space_invaders");

    // 5. Verify entire history and state persistence across minigames
    const state = runtime.getState();
    expect(state.history).toEqual([
      "node_1_intro",
      "node_2_asteroids",
      "node_3_victory",
      "node_4_space_invaders"
    ]);
  });
});
