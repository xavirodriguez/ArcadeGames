/**
 * BeltInputSystem — computes one-frame pressed edges from held flags.
 * Runs in SystemPhase.Input before movement / combat systems.
 */

import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import type { BeltInputComponent } from "./BeltMovementTypes";

const BIT_ATTACK = 1;
const BIT_FIRE = 2;
const BIT_SPECIAL = 4;
const BIT_JUMP = 8;

export class BeltInputSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const entities = world.query("BeltInput");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const input = world.getMutableComponent(entity, "BeltInput") as
        | BeltInputComponent
        | undefined;
      if (!input) continue;

      const prev = input._prevHeldMask ?? 0;

      const attackHeld = !!input.attackHeld;
      const fireHeld = !!input.fireHeld;
      const specialHeld = !!input.specialHeld;
      const jumpHeld = !!input.jumpHeld;

      input.attackPressed = attackHeld && (prev & BIT_ATTACK) === 0;
      input.firePressed = fireHeld && (prev & BIT_FIRE) === 0;
      input.specialPressed = specialHeld && (prev & BIT_SPECIAL) === 0;
      input.jumpPressed = jumpHeld && (prev & BIT_JUMP) === 0;

      let mask = 0;
      if (attackHeld) mask |= BIT_ATTACK;
      if (fireHeld) mask |= BIT_FIRE;
      if (specialHeld) mask |= BIT_SPECIAL;
      if (jumpHeld) mask |= BIT_JUMP;
      input._prevHeldMask = mask;
    }
  }
}
