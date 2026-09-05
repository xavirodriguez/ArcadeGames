import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState } from "../ecs/CoreComponents";
import { EventBus } from "../events/EventBus";

/**
 * Context object returned by `getGameplaySystemContext`.
 * @public
 */
export interface GameplaySystemContext {
  runState: RunState | undefined;
  eventBus: EventBus<any> | undefined;
}

/**
 * Helper to retrieve common gameplay system context (RunState, EventBus)
 * while checking if simulation is currently paused.
 *
 * @returns `null` if the world is paused, or `{ runState, eventBus }`.
 * @public
 */
export function getGameplaySystemContext<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TRegistry>
): GameplaySystemContext | null {
  if (world.getResource("IsPaused") === true) return null;
  const runState = world.getResource<RunState>("RunState");
  const eventBus = world.getEventBus();
  return { runState, eventBus };
}
