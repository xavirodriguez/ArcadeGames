import { EventBus, Scene, StoryRuntime, World } from "@tiny-aster/core";

export interface AsteroidsStoryEvents {
  [key: string]: unknown;
  "story:beat_reached": { dialogueReference?: string; beatId?: string };
  "story:objective_completed": Record<string, unknown>;
  "story:node_changed": { node?: { dialogue?: { lines?: Array<{ speakerName?: string; textKey: string }> } } };
}

export interface AsteroidsStorySceneOptions {
  storyRuntime: StoryRuntime;
  actLevel?: number;
}

/**
 * Scene controller for story-mode Asteroids levels.
 * Manages ECS world updates, narrative dialogue overlays, beat listeners, and level objective triggers.
 */
export class AsteroidsStoryScene extends Scene {
  private storyRuntime: StoryRuntime;
  private actLevel: number;
  private eventUnsubscribers: Array<() => void> = [];
  public activeDialogueText: string | null = null;
  public isDialogueActive: boolean = false;

  constructor(world: World, options: AsteroidsStorySceneOptions) {
    super(world);
    this.name = `AsteroidsStoryScene_Act${options.actLevel ?? 1}`;
    this.storyRuntime = options.storyRuntime;
    this.actLevel = options.actLevel ?? 1;
  }

  public override async onEnter(world: World): Promise<void> {
    const rawBus = world.getEventBus();

    if (rawBus) {
      const eventBus = rawBus as EventBus<AsteroidsStoryEvents>;

      const unsubBeat = eventBus.on("story:beat_reached", (payload) => {
        this.isDialogueActive = true;
        this.activeDialogueText = payload?.dialogueReference || payload?.beatId || "Story dialogue active";
      });

      const unsubObj = eventBus.on("story:objective_completed", () => {
        this.activeDialogueText = "Objective Completed!";
        this.isDialogueActive = true;
      });

      const unsubNode = eventBus.on("story:node_changed", (payload) => {
        const node = payload?.node;
        if (node?.dialogue) {
          const firstLine = node.dialogue.lines?.[0];
          if (firstLine) {
            this.activeDialogueText = `${firstLine.speakerName || "AI"}: ${firstLine.textKey}`;
            this.isDialogueActive = true;
          }
        }
      });

      this.eventUnsubscribers.push(unsubBeat, unsubObj, unsubNode);
    }
  }

  public override onExit(_world: World): void {
    for (const unsub of this.eventUnsubscribers) {
      unsub();
    }
    this.eventUnsubscribers = [];
    this.isDialogueActive = false;
    this.activeDialogueText = null;
  }

  public override onUpdate(dt: number, world: World): void {
    super.onUpdate(dt, world);
  }
}

/**
 * Convenience constructors for the three Act scenes of POC campaign.
 */
export class AsteroidsStoryScene_Act1Lv1 extends AsteroidsStoryScene {
  constructor(world: World, storyRuntime: StoryRuntime) {
    super(world, { storyRuntime, actLevel: 1 });
  }
}

export class AsteroidsStoryScene_Act1Lv3 extends AsteroidsStoryScene {
  constructor(world: World, storyRuntime: StoryRuntime) {
    super(world, { storyRuntime, actLevel: 3 });
  }
}

export class AsteroidsStoryScene_Act3Lv4 extends AsteroidsStoryScene {
  constructor(world: World, storyRuntime: StoryRuntime) {
    super(world, { storyRuntime, actLevel: 4 });
  }
}
