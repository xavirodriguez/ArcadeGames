import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { InputFrame } from "./NetTypes";
import { CanonicalActionName } from "../input/CanonicalInput";
import { normalizeInputActions } from "../input/normalizeInputActions";

/**
 * Ensures an entity possesses an Input component and applies the provided actions and axes.
 *
 * @param world - Simulation world instance.
 * @param entityId - Target entity identifier.
 * @param input - Input frame containing actions and axes.
 * @public
 */
export function applyInputFrameToEntity<TComponents extends ComponentRegistry = ComponentRegistry>(
  world: World<TComponents>,
  entityId: number,
  input: Pick<InputFrame, "actions" | "axes">
): void {
  const inputType = "Input" as Extract<keyof TComponents, string>;
  type InputComponentType = TComponents[Extract<keyof TComponents, string>] & {
    type: Extract<keyof TComponents, string>;
    actions: readonly CanonicalActionName[];
    axes: Record<string, number>;
  };

  if (!world.hasComponent(entityId, inputType)) {
    const defaultInput = {
      type: "Input",
      actions: [],
      axes: {}
    } as never as InputComponentType;
    world.addComponent(entityId, defaultInput);
  }

  world.mutateComponent(entityId, inputType, (inputComp) => {
    const comp = inputComp as InputComponentType;
    comp.actions = normalizeInputActions(input.actions);
    comp.axes = { ...input.axes };
  });
}
