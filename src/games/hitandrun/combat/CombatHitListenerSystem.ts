import { System, EventBus, ComponentRegistry, EventRegistry, CoreComponentRegistry } from "@tiny-aster/core";
import type { CombatHitPayload } from "../systems/HitRunFeedbackTypes";

export abstract class CombatHitListenerSystem<
  THitPayload = CombatHitPayload,
  TRegistry extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TRegistry, TEvents> {
  protected subscribed = false;
  protected pendingHits: THitPayload[] = [];

  public subscribe(eventBus: EventBus): void {
    if (this.subscribed) return;
    this.subscribed = true;

    eventBus.on("combat:hit", (payload: unknown) => {
      this.pendingHits.push(payload as THitPayload);
    });

    this.onSubscribe(eventBus);
  }

  /**
   * Hook for subclasses to register additional event listeners.
   */
  protected onSubscribe(_eventBus: EventBus): void {}
}
