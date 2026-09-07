import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { InputFrame } from "./NetTypes";

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
    actions: Set<string>;
    axes: Record<string, number>;
  };

  if (!world.hasComponent(entityId, inputType)) {
    const defaultInput = {
      type: "Input",
      actions: new Set<string>(),
      axes: {}
    } as InputComponentType;
    world.addComponent(entityId, defaultInput);
  }

  world.mutateComponent(entityId, inputType, (inputComp) => {
    const comp = inputComp as InputComponentType;
    comp.actions = new Set<string>(input.actions || []);
    comp.axes = { ...input.axes };
  });
}
