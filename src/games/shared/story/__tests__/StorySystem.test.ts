import { World, SystemPhase, EventBus, CutsceneScene, SceneManager } from "@tiny-aster/core";
import { StoryDirectorSystem } from "../StoryDirectorSystem";
import { StoryBeatComponent } from "../StoryBeatComponent";
import { RunStoryChoices } from "../RunStoryChoices";
import { DialogueBoxComponent } from "../DialogueBoxComponent";

describe("Story Mode Infrastructure Tests", () => {
  let world: World<any>;
  let directorSystem: StoryDirectorSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World<any>();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);
    directorSystem = new StoryDirectorSystem();
    world.addSystem(directorSystem, { phase: SystemPhase.GameRules });
  });

  describe("StoryDirectorSystem & StoryBeatComponent", () => {
    it("should trigger story:beat_reached when level:completed event is fired", () => {
      // 1. Create a StoryBeat entity
      const beatEntity = world.createEntity();
      const beat: StoryBeatComponent = {
        type: "StoryBeat",
        beatId: "beat_lvl_1",
        conditionTrigger: "level:completed",
        dialogueReference: "story.chapter_1_title",
        isTriggered: false
      };
      world.addComponent(beatEntity, beat);

      // 2. Track emitted events
      let emittedEvent: any = null;
      eventBus.on("story:beat_reached", (event: any) => {
        emittedEvent = event;
      });

      // 3. Register and trigger
      world.update(0.016);
      eventBus.emit("level:completed", { level: 1 });

      // Verify triggered
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.beatId).toBe("beat_lvl_1");
      expect(emittedEvent.dialogueReference).toBe("story.chapter_1_title");

      // Verify component state updated
      const updatedBeat = world.getComponent(beatEntity, "StoryBeat") as any;
      expect(updatedBeat.isTriggered).toBe(true);
    });

    it("should trigger story:beat_reached when CollectiblePickedUp event occurs for a story_fragment", () => {
      // 1. Create a StoryBeat entity
      const beatEntity = world.createEntity();
      const beat: StoryBeatComponent = {
        type: "StoryBeat",
        beatId: "beat_fragment_collected",
        conditionTrigger: "collectible:picked",
        dialogueReference: "story.chapter_1_fragment_1",
        isTriggered: false
      };
      world.addComponent(beatEntity, beat);

      // 2. Track emitted events
      let emittedEvent: any = null;
      eventBus.on("story:beat_reached", (event: any) => {
        emittedEvent = event;
      });

      // 3. Register and trigger PickUp
      world.update(0.016);
      eventBus.emit("CollectiblePickedUp", {
        collectible: { kind: "story_fragment", id: "fragment_1" }
      });

      // Verify triggered
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent.beatId).toBe("beat_fragment_collected");

      // Verify component state updated
      const updatedBeat = world.getComponent(beatEntity, "StoryBeat") as any;
      expect(updatedBeat.isTriggered).toBe(true);
    });
  });

  describe("CutsceneScene via SceneManager", () => {
    it("should manage dialogues, line advancement, and completion cleanly", async () => {
      const cutsceneWorld = new World<any>();
      cutsceneWorld.setResource("EventBus", eventBus);

      let startedEvent = false;
      let lineAdvancedEvent: any = null;
      let completedEvent = false;

      eventBus.on("cutscene:started", () => { startedEvent = true; });
      eventBus.on("cutscene:line_advanced", (e: any) => { lineAdvancedEvent = e; });
      eventBus.on("cutscene:completed", () => { completedEvent = true; });

      const lines = ["line1", "line2", "line3"];
      let completedCallbackCalled = false;

      const scene = new CutsceneScene(cutsceneWorld, lines, () => {
        completedCallbackCalled = true;
      });

      // Enter cutscene
      await scene.onEnter(cutsceneWorld);
      expect(startedEvent).toBe(true);
      expect(scene.getCurrentLine()).toBe("line1");
      expect(scene.getCurrentIndex()).toBe(0);

      // Advance to line 2
      scene.advance();
      expect(lineAdvancedEvent).toBeDefined();
      expect(lineAdvancedEvent.index).toBe(1);
      expect(lineAdvancedEvent.line).toBe("line2");
      expect(scene.getCurrentLine()).toBe("line2");

      // Advance to line 3
      scene.advance();
      expect(scene.getCurrentLine()).toBe("line3");

      // Advance to finish
      scene.advance();
      expect(completedEvent).toBe(true);
      expect(completedCallbackCalled).toBe(true);
    });
  });

  describe("RunStoryChoices Determinism", () => {
    it("should generate deterministic choices based on gameplayRandom seed", () => {
      const worldA = new World<any>();
      const worldB = new World<any>();

      worldA.gameplayRandom.setSeed(12345);
      worldB.gameplayRandom.setSeed(12345);

      worldA.gameplayRandom.unlock();
      worldB.gameplayRandom.unlock();

      const choicesA = RunStoryChoices.generateChoices(worldA);
      const choicesB = RunStoryChoices.generateChoices(worldB);

      expect(choicesA.active).toBe(true);
      expect(choicesB.active).toBe(true);
      expect(choicesA.choices.length).toBe(3);
      expect(choicesB.choices.length).toBe(3);

      // Deterministic choice list matching
      expect(choicesA.choices).toEqual(choicesB.choices);
    });
  });

  describe("DialogueBoxComponent Structure", () => {
    it("should initialize component state with correct typing, queue, and speed parameters", () => {
      const entity = world.createEntity();
      const dialogue: DialogueBoxComponent = {
        type: "DialogueBox",
        lines: ["text1", "text2"],
        currentLineIndex: 0,
        typingSpeed: 30,
        elapsedTime: 0,
        isLineFinished: false,
        advanceKey: "Space"
      };

      world.addComponent(entity, dialogue);

      const retrieved = world.getComponent(entity, "DialogueBox") as any;
      expect(retrieved).toBeDefined();
      expect(retrieved.lines).toEqual(["text1", "text2"]);
      expect(retrieved.typingSpeed).toBe(30);
      expect(retrieved.isLineFinished).toBe(false);
    });
  });
});
