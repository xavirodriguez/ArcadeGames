import { System, World, ComponentRegistry, StoryRuntime } from "@tiny-aster/core";
import { StoryBeatComponent } from "./StoryBeatComponent";

/**
 * StoryDirectorSystem orchestrates the firing of story beats based on events,
 * seamlessly integrating with StoryRuntime while maintaining legacy StoryBeatComponent support.
 * @public
 */
export class StoryDirectorSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends Record<string, any> = Record<string, any>
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
      this.storyRuntime.bindWorld(world as any);
    }

    if (!eventBus) return;

    // Listen to "level:completed"
    eventBus.on("level:completed" as any, (event: any) => {
      this.evaluateBeats(world, "level:completed", event);
    });

    // Listen to "spawn:wave_complete"
    eventBus.on("spawn:wave_complete" as any, (event: any) => {
      this.evaluateBeats(world, "spawn:wave_complete", event);
    });

    // Listen to "CollectiblePickedUp"
    eventBus.on("CollectiblePickedUp" as any, (event: any) => {
      if (event && event.collectible && event.collectible.kind === "story_fragment") {
        this.evaluateBeats(world, "collectible:picked", event);
      }
    });
  }

  private evaluateBeats(world: World<TComponents, TEvents>, trigger: string, eventPayload: any): void {
    const beats = world.query("StoryBeat" as any);
    const eventBus = world.getEventBus();

    for (const entity of beats) {
      const beat = world.getComponent(entity, "StoryBeat" as any) as any as StoryBeatComponent;
      if (!beat || beat.isTriggered) continue;

      if (beat.conditionTrigger === trigger) {
        let shouldTrigger = true;

        if (shouldTrigger) {
          world.mutateComponent(entity, "StoryBeat" as any, (b: any) => {
            b.isTriggered = true;
          });

          if (eventBus) {
            eventBus.emit("story:beat_reached" as any, {
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
    // Evaluation is purely event-driven
  }
}
