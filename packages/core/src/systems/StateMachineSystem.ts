import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * Definition map of named finite state machine states.
 * @public
 */
export interface StateMachineDefinition {
  /** Map of state identifiers to state behavior definitions. */
  states: Record<string, StateDefinition>;
}

/**
 * Hook callbacks for entering, updating, and exiting a finite state machine state.
 * @public
 */
export interface StateDefinition {
  /**
   * Callback invoked every frame tick while entity remains in this state.
   *
   * @param world - Target ECS world.
   * @param entity - Target entity ID.
   * @param data - State machine context data.
   * @param elapsed - Elapsed time in milliseconds within current state.
   * @returns Optional next state name string to trigger state transition.
   */
  onUpdate?: (world: World<CoreComponentRegistry>, entity: number, data: Record<string, unknown>, elapsed: number) => string | void;
  /** Callback invoked when transitioning into this state. */
  onEnter?: (world: World<CoreComponentRegistry>, entity: number, data: Record<string, unknown>) => void;
  /** Callback invoked when transitioning out of this state. */
  onExit?: (world: World<CoreComponentRegistry>, entity: number, data: Record<string, unknown>) => void;
}

/**
 * System that manages entity state machines.
 *
 * @remarks
 * This system updates the state of entities based on defined transitions and behaviors.
 * State definitions can include `onEnter`, `onUpdate`, and `onExit` hooks.
 *
 * Warning: State transitions and hook execution may involve complex logic.
 * Ensure that hooks do not perform unauthorized structural changes to the world
 * while the system is iterating over entities.
 * @public
 */
export class StateMachineSystem extends System<CoreComponentRegistry> {
  /**
   * Evaluates active state machines, executes state update hooks, and manages state transitions.
   *
   * @param world - The ECS world containing active entities and state machine definitions.
   * @param deltaTime - Elapsed frame duration in seconds.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const entities = world.query("StateMachine");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const smCheck = world.getComponent(entity, "StateMachine");
      if (!smCheck) continue;

      const registry = world.getResource<Record<string, StateMachineDefinition>>("StateMachineRegistry");
      const definition = registry ? registry[smCheck.machineId] : undefined;

      if (!definition) continue;

      const stateDef = definition.states[smCheck.currentState];

      // Safe for determinism/rollback. Direct getMutableComponent avoids per-tick closure allocations while triggering identical stateVersion updates.
      const sm = world.getMutableComponent(entity, "StateMachine");
      if (!sm) continue;

      sm.elapsedMs += deltaTime;
      const elapsedMs = sm.elapsedMs;

      if (stateDef?.onUpdate) {
        const nextState = stateDef.onUpdate(world, entity, sm.data, elapsedMs);
        if (nextState && nextState !== sm.currentState) {
          this.transition(world, entity, nextState, definition);
        }
      }
    }
  }

  private transition(world: World<CoreComponentRegistry>, entity: number, nextState: string, definition: StateMachineDefinition): void {
    const smCheck = world.getComponent(entity, "StateMachine");
    if (!smCheck) return;

    const oldStateDef = definition.states[smCheck.currentState];
    const newStateDef = definition.states[nextState];

    if (oldStateDef?.onExit) {
      oldStateDef.onExit(world, entity, smCheck.data);
    }

    // Safe for determinism/rollback. Direct getMutableComponent avoids closure allocations while maintaining deterministic state updates.
    const sm = world.getMutableComponent(entity, "StateMachine");
    if (sm) {
      sm.previousState = sm.currentState;
      sm.currentState = nextState;
      sm.elapsedMs = 0;
    }

    if (newStateDef?.onEnter && sm) {
      newStateDef.onEnter(world, entity, sm.data);
    }
  }
}
