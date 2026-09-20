import { World, ComponentRegistry, CoreComponentRegistry, EventRegistry } from "@tiny-aster/core";
import { CombatHitEvent, CombatDeathEvent } from "../types/CombatTypes";

/**
 * Event registry requirement for combat event listeners.
 * @public
 */
export interface CombatEvents extends EventRegistry {
  "combat:hit": CombatHitEvent;
  "combat:death": CombatDeathEvent;
}

/**
 * Handlers for combat events.
 * @public
 */
export interface CombatEventListeners {
  /**
   * Callback invoked when a 'combat:hit' event is received.
   */
  onHit?: (event: CombatHitEvent) => void;
  /**
   * Callback invoked when a 'combat:death' event is received.
   */
  onDeath?: (event: CombatDeathEvent) => void;
}

/**
 * Subscribes callbacks to 'combat:hit' and 'combat:death' events on the World's EventBus.
 *
 * @param world - The ECS World instance.
 * @param listeners - Handlers for 'combat:hit' and/or 'combat:death' events.
 * @returns An unsubscribe function that removes the registered listeners.
 * @public
 */
export function subscribeToCombatEvents<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry & CombatEvents = CombatEvents
>(
  world: World<TComponents, TEvents>,
  listeners: CombatEventListeners
): () => void {
  const eventBus = world.getEventBus();
  if (!eventBus) return () => {};

  const unsubs: (() => void)[] = [];
  if (listeners.onHit) {
    unsubs.push(eventBus.on("combat:hit", listeners.onHit));
  }
  if (listeners.onDeath) {
    unsubs.push(eventBus.on("combat:death", listeners.onDeath));
  }
  return () => {
    unsubs.forEach(unsub => unsub());
  };
}
