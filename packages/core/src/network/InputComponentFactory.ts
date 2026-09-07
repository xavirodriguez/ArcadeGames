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
  if (!world.hasComponent(entityId, inputType)) {
    world.addComponent(entityId, {
      type: "Input",
      actions: new Set<string>(),
      axes: {}
    } as unknown as TComponents[Extract<keyof TComponents, string>] & { type: Extract<keyof TComponents, string> });
  }
  world.mutateComponent(entityId, inputType, ((inputComp: { actions: Set<string>; axes: Record<string, number> }) => {
    inputComp.actions = new Set<string>(input.actions || []);
    inputComp.axes = { ...input.axes };
  }) as unknown as (component: TComponents[Extract<keyof TComponents, string>]) => void);
}
