import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { IHierarchicalComponent, CoreComponentRegistry } from "../ecs/CoreComponents";
import { ComponentRegistry, ComponentType } from "../ecs/Component";
import { EventRegistry, EventBus } from "../events/EventBus";

/**
 * Abstract system base providing topological sorting for entity hierarchy processing.
 * @public
 */
export abstract class AbstractHierarchySystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {
  /** Set of entities marked as dirty during previous ticks. */
  protected wasDirty = new Set<Entity>();

  // Safe for determinism/rollback. Internal structures reused across ticks to eliminate per-tick object allocations during hierarchy traversal.
  private orderBuffer: Entity[] = [];
  private visitedSet = new Set<Entity>();
  private processingSet = new Set<Entity>();
  private traversalStack: { entity: Entity; stage: 'enter' | 'exit' }[] = [];

  /**
   * Computes the depth-first / topological processing order for entities possessing hierarchical components.
   */
  protected getProcessingOrder(world: World<TComponents, TEvents>, componentType: ComponentType<TComponents>): Entity[] {
    const entities = world.query(componentType);
    if (entities.length === 0) return [];

    this.orderBuffer.length = 0;
    this.visitedSet.clear();
    this.processingSet.clear();
    this.traversalStack.length = 0;

    const order = this.orderBuffer;
    const visited = this.visitedSet;
    const processing = this.processingSet;
    const stack = this.traversalStack;

    for (let i = 0; i < entities.length; i++) {
      const startEntity = entities[i];
      if (visited.has(startEntity)) continue;

      stack.push({ entity: startEntity, stage: 'enter' });

      while (stack.length > 0) {
        const current = stack.pop()!;
        const { entity, stage } = current;

        if (stage === 'enter') {
          if (visited.has(entity)) continue;
          if (processing.has(entity)) {
            const eventBus = world.getEventBus() as EventBus | undefined;
            if (eventBus) {
              eventBus.emitDeferred("hierarchy:warning", { message: `Circular dependency detected at entity ${entity}.` });
            }
            continue;
          }

          processing.add(entity);
          stack.push({ entity, stage: 'exit' });

          const comp = world.getComponent(entity, componentType) as unknown as IHierarchicalComponent | undefined;
          if (comp && comp.parentEntity !== undefined) {
            stack.push({ entity: comp.parentEntity, stage: 'enter' });
          }
        } else {
          processing.delete(entity);
          visited.add(entity);
          order.push(entity);
        }
      }
    }

    return order;
  }
}
