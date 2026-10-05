/**
 * Bridge from UI / setInputState partial actions → BeltInput on the player.
 */

import { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { BeltInputComponent, BeltInputPartial } from "./BeltMovementTypes";

export function mutateBeltInputState(
  world: World<CoreComponentRegistry>,
  input: BeltInputPartial
): void {
  const players = world.query("BeltInput");
  if (players.length === 0) return;

  const entity = players[0];
  world.mutateComponent(entity, "BeltInput", (comp: unknown) => {
    const c = comp as BeltInputComponent;

    const left = !!(input.moveLeft ?? input.left);
    const right = !!(input.moveRight ?? input.right);
    const up = !!(input.moveUp ?? input.up);
    const down = !!(input.moveDown ?? input.down);

    if (
      input.moveLeft !== undefined ||
      input.moveRight !== undefined ||
      input.left !== undefined ||
      input.right !== undefined
    ) {
      c.moveX = left && right ? 0 : left ? -1 : right ? 1 : 0;
    }

    if (
      input.moveUp !== undefined ||
      input.moveDown !== undefined ||
      input.up !== undefined ||
      input.down !== undefined
    ) {
      c.moveY = up && down ? 0 : up ? -1 : down ? 1 : 0;
    }

    if (input.jump !== undefined) {
      c.jumpHeld = !!input.jump;
    }
    if (input.attack !== undefined) {
      c.attackHeld = !!input.attack;
    }
    if (input.pulse !== undefined && input.attack === undefined) {
      c.attackHeld = !!input.pulse;
    }
    if (input.fire !== undefined) {
      c.fireHeld = !!input.fire;
    }
    if (input.special !== undefined) {
      c.specialHeld = !!input.special;
    }
  });
}
