import { World, EventBus, StoryRuntime, CYOAScene } from "../src";
import { caveAdventureGraph } from "../../../src/games/shared/story/TheCaveAdventure";

describe("The Cave Adventure CYOA Story Mechanics", () => {
  let world: World;
  let eventBus: EventBus;
  let runtime: StoryRuntime;
  let scene: CYOAScene;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    runtime = new StoryRuntime(caveAdventureGraph);
    scene = new CYOAScene(world, runtime);
    scene.onEnter(world);
  });

  it("should start at cave entrance with initial choices available", () => {
    expect(scene.getCurrentNode()?.id).toBe("cave_entrance");

    const choices = scene.getAvailableChoices();
    expect(choices.map((c) => c.id)).toEqual([
      "choice_search_camp",
      "choice_enter_tunnel"
    ]);
  });

  it("should prevent player WITHOUT torch from taking the torch transition to dark tunnel", () => {
    // Navigate to dark tunnel check
    scene.selectChoice("choice_enter_tunnel");
    expect(scene.getCurrentNode()?.id).toBe("dark_tunnel_check");

    // Check available choices when has_torch is false
    const choices = scene.getAvailableChoices();
    const choiceIds = choices.map((c) => c.id);

    expect(choiceIds).toContain("choice_proceed_dark");
    expect(choiceIds).not.toContain("choice_proceed_with_torch");

    // Attempting to select proceed_with_torch directly must fail
    const success = scene.selectChoice("choice_proceed_with_torch");
    expect(success).toBe(false);
    expect(scene.getCurrentNode()?.id).toBe("dark_tunnel_check");

    // Proceeding in dark leads to trap room (failure)
    scene.selectChoice("choice_proceed_dark");
    expect(scene.getCurrentNode()?.id).toBe("trap_room");
  });

  it("should mutate state when acquiring torch and allow transition to victory treasure room", () => {
    // Go to campsite
    scene.selectChoice("choice_search_camp");
    expect(scene.getCurrentNode()?.id).toBe("campsite");

    // Listen for custom torch acquired event and mutate runtime state
    eventBus.on("adventure:torch_acquired", () => {
      runtime.setFlag("has_torch", true);
    });

    // Pick up torch
    scene.selectChoice("choice_take_torch");
    expect(scene.getCurrentNode()?.id).toBe("take_torch_node");
    expect(runtime.getState().flags["has_torch"]).toBe(true);

    // Return to entrance and go to dark tunnel check
    scene.selectChoice("choice_return_to_entrance");
    expect(scene.getCurrentNode()?.id).toBe("cave_entrance");

    scene.selectChoice("choice_enter_tunnel");
    expect(scene.getCurrentNode()?.id).toBe("dark_tunnel_check");

    // Choices must now enable choice_proceed_with_torch and disable choice_proceed_dark
    const choices = scene.getAvailableChoices();
    const choiceIds = choices.map((c) => c.id);

    expect(choiceIds).toContain("choice_proceed_with_torch");
    expect(choiceIds).not.toContain("choice_proceed_dark");

    // Proceed with torch to victory room
    const victorySuccess = scene.selectChoice("choice_proceed_with_torch");
    expect(victorySuccess).toBe(true);
    expect(scene.getCurrentNode()?.id).toBe("treasure_room");
    expect(scene.getCurrentNode()?.isEndNode).toBe(true);
  });

  it("should allow restarting story graph from terminal nodes", async () => {
    // Navigate directly to trap room
    scene.selectChoice("choice_enter_tunnel");
    scene.selectChoice("choice_proceed_dark");
    expect(scene.getCurrentNode()?.id).toBe("trap_room");

    // Restart adventure
    await scene.restart();
    expect(scene.getCurrentNode()?.id).toBe("cave_entrance");
  });
});
