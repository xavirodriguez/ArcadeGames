import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { createBeltInputComponent, type BeltInputComponent } from "../../belt/BeltMovementTypes";
import { ComboMeleeSystem } from "../ComboMeleeSystem";
import { createMeleeAttackComponent } from "../HitRunMeleeSystem";
import type { ComboMeleeComponent } from "../ComboMeleeTypes";

function createPlayerWorld(): {
  world: World<CoreComponentRegistry>;
  player: number;
} {
  const world = new World<CoreComponentRegistry>();
  const player = world.createEntity();

  world.addComponent(player, {
    type: "Transform",
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: 100,
    worldY: 100,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
  world.addComponent(player, createBeltInputComponent());
  world.addComponent(player, createMeleeAttackComponent());
  world.addComponent(player, {
    type: "ComboMelee",
    chainStep: 0,
    chainTimer: 0,
    attackBufferRemaining: 0,
    facing: 1,
    activeStep: "idle"
  } satisfies ComboMeleeComponent);

  return { world, player };
}

const readCombo = (world: World<CoreComponentRegistry>, player: number) =>
  world.getComponent(player, "ComboMelee") as ComboMeleeComponent | undefined;
const readInput = (world: World<CoreComponentRegistry>, player: number) =>
  world.getComponent(player, "BeltInput") as BeltInputComponent | undefined;

describe("ComboMeleeSystem attack buffering", () => {
  it("preserves a melee press through hitstun and starts jab1 after control unlocks", () => {
    const { world, player } = createPlayerWorld();
    const system = new ComboMeleeSystem();

    world.addComponent(player, {
      type: "HitReaction",
      hitstunRemaining: 0.05,
      staggerRemaining: 0,
      blinkElapsed: 0
    });
    world.mutateComponent(player, "BeltInput", (input) => {
      input.attackHeld = true;
      input.attackPressed = true;
    });

    system.update(world, 1 / 60);
    expect(readCombo(world, player)?.attackBufferRemaining).toBeGreaterThan(0);
    expect(readCombo(world, player)?.activeStep).toBe("idle");

    // BeltInputSystem recomputes this edge as false while the key remains held.
    world.mutateComponent(player, "BeltInput", (input) => {
      input.attackPressed = false;
    });
    system.update(world, 1 / 60);
    expect(readCombo(world, player)?.attackBufferRemaining).toBeGreaterThan(0);

    world.mutateComponent(player, "HitReaction", (reaction) => {
      reaction.hitstunRemaining = 0;
    });
    system.update(world, 1 / 60);

    expect(readCombo(world, player)?.activeStep).toBe("jab1");
    expect(readCombo(world, player)?.attackBufferRemaining).toBe(0);
    expect(readInput(world, player)?.attackPressed).toBe(true);
  });

  it("expires a buffered press instead of attacking after a long control lock", () => {
    const { world, player } = createPlayerWorld();
    const system = new ComboMeleeSystem();

    world.addComponent(player, {
      type: "HitReaction",
      hitstunRemaining: 1,
      staggerRemaining: 0,
      blinkElapsed: 0
    });
    world.mutateComponent(player, "BeltInput", (input) => {
      input.attackHeld = true;
      input.attackPressed = true;
    });

    system.update(world, 1 / 60);
    world.mutateComponent(player, "BeltInput", (input) => {
      input.attackPressed = false;
    });
    for (let i = 0; i < 15; i++) {
      system.update(world, 1 / 60);
    }

    world.mutateComponent(player, "HitReaction", (reaction) => {
      reaction.hitstunRemaining = 0;
    });
    system.update(world, 1 / 60);

    expect(readCombo(world, player)?.activeStep).toBe("idle");
    expect(readInput(world, player)?.attackPressed).toBe(false);
  });
});
