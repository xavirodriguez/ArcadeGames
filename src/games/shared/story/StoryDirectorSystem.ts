import { System, World, ComponentRegistry, EventBus, EventRegistry, StoryRuntime } from "@tiny-aster/core";
import { StoryBeatComponent } from "./StoryBeatComponent";

/**
 * StoryDirectorSystem orchestrates the firing of story beats based on events,
 * seamlessly integrating with StoryRuntime while maintaining legacy StoryBeatComponent support.
 * @public
 */
export class StoryDirectorSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {

  private storyRuntime?: StoryRuntime;

  constructor(storyRuntime?: StoryRuntime) {
    super();
    this.storyRuntime = storyRuntime;
  }

  public override onRegister(world: World<TComponents, TEvents>): void {
    const eventBus = world.getEventBus();

    // Check if StoryRuntime is stored as resource in World
    if (!this.storyRuntime) {
      this.storyRuntime = world.getResource<StoryRuntime>("StoryRuntime");
    }

    if (this.storyRuntime) {
      this.storyRuntime.bindWorld(world as unknown as World);
    }

    if (!eventBus) return;

    // Listen to "level:completed"
    eventBus.on("level:completed", (event: unknown) => {
      this.evaluateBeats(world, "level:completed", event);
    });

    // Listen to "spawn:wave_complete"
    eventBus.on("spawn:wave_complete", (event: unknown) => {
      this.evaluateBeats(world, "spawn:wave_complete", event);
    });

    // Listen to "CollectiblePickedUp"
    eventBus.on("CollectiblePickedUp", (event: unknown) => {
      const e = event as { collectible?: { kind?: string } } | undefined;
      if (e?.collectible?.kind === "story_fragment") {
        this.evaluateBeats(world, "collectible:picked", event);
      }
    });
  }

  private evaluateBeats(world: World<TComponents, TEvents>, trigger: string, eventPayload: unknown): void {
    const beats = world.query("StoryBeat" as Extract<keyof TComponents, string>);
    const eventBus = world.getEventBus() as EventBus;

    for (const entity of beats) {
      const beat = world.getComponent(entity, "StoryBeat" as Extract<keyof TComponents, string>) as unknown as StoryBeatComponent;
      if (!beat || beat.isTriggered) continue;

      if (beat.conditionTrigger === trigger) {
        let shouldTrigger = true;

        if (shouldTrigger) {
          world.mutateComponent(entity, "StoryBeat" as Extract<keyof TComponents, string>, (b: unknown) => {
            (b as StoryBeatComponent).isTriggered = true;
          });

          if (eventBus) {
            eventBus.emit("story:beat_reached", {
              beatId: beat.beatId,
              dialogueReference: beat.dialogueReference,
              payload: eventPayload
            });
          }
        }
      }
    }
  }

  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    // Evaluation is purely event-driven
  }
}
