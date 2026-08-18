import { StoryRuntime } from "./StoryRuntime";
import { StoryEffect } from "./StoryTypes";

/**
 * Sole authorized service responsible for applying declarative StoryEffects to StoryRuntime.
 *
 * @remarks
 * Decouples game outcome engines, UI handlers, and network message processors from direct
 * story runtime mutations by providing a unified, validated entry point.
 *
 * @public
 */
export class StoryEffectApplier {
  /**
   * Applies a single declarative `StoryEffect` command to the active `StoryRuntime`.
   *
   * @param runtime - Target StoryRuntime instance.
   * @param effect - Declarative StoryEffect object to execute.
   */
  public applyEffect(runtime: StoryRuntime, effect: StoryEffect): void {
    if (!runtime || !effect) return;
    runtime.applyEffect(effect);
  }

  /**
   * Sequentially applies an array of declarative `StoryEffect` commands to `StoryRuntime`.
   *
   * @param runtime - Target StoryRuntime instance.
   * @param effects - Array of StoryEffect descriptors to execute.
   */
  public applyEffects(
    runtime: StoryRuntime,
    effects: ReadonlyArray<StoryEffect>
  ): void {
    if (!runtime || !effects || effects.length === 0) return;
    for (const effect of effects) {
      this.applyEffect(runtime, effect);
    }
  }
}
