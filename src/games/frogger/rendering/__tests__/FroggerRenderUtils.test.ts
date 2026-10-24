import { World } from "@tiny-aster/core";
import {
  resolveFroggerFacingRotation,
  resolveFroggerSlotColors,
  resolveFroggerTurtleVisualState,
  resolveFroggerVehicleDirection,
} from "../FroggerRenderUtils";
import { FroggerComponentRegistry } from "../../types/FroggerTypes";
import { FROGGER_VISUAL_TOKENS } from "../FroggerVisualTokens";

describe("resolveFroggerSlotColors unit tests", () => {
  it("uses the fixed art-direction palette when Theme resource is missing", () => {
    const world = new World<FroggerComponentRegistry>();
    const slotColors = resolveFroggerSlotColors(world);

    expect(slotColors.slotColor).toBe(FROGGER_VISUAL_TOKENS.lilyPads.free);
    expect(slotColors.occupiedColor).toBe(FROGGER_VISUAL_TOKENS.lilyPads.occupied);
  });

  it("keeps the Frogger art palette stable when a global Theme tries to override it", () => {
    const world = new World<FroggerComponentRegistry>();
    world.setResource("Theme", {
      colorMap: {
        home_slot: "#112233",
        home_slot_occupied: "#ff00bb",
      },
    });

    const slotColors = resolveFroggerSlotColors(world);
    expect(slotColors.slotColor).toBe("#2F8F7A");
    expect(slotColors.occupiedColor).toBe("#B6F23C");
  });
});


describe("resolveFroggerVehicleDirection", () => {
  it("keeps right-facing geometry for right-moving traffic", () => {
    expect(resolveFroggerVehicleDirection(1)).toBe(1);
    expect(resolveFroggerVehicleDirection(120)).toBe(1);
  });

  it("mirrors vehicle geometry for left-moving traffic", () => {
    expect(resolveFroggerVehicleDirection(-1)).toBe(-1);
    expect(resolveFroggerVehicleDirection(-120)).toBe(-1);
  });

  it("uses a stable right-facing fallback when direction is absent or zero", () => {
    expect(resolveFroggerVehicleDirection(undefined)).toBe(1);
    expect(resolveFroggerVehicleDirection(0)).toBe(1);
  });
});


describe("resolveFroggerFacingRotation", () => {
  it("maps the stored facing direction to a presentation-only rotation", () => {
    expect(resolveFroggerFacingRotation("up")).toBe(0);
    expect(resolveFroggerFacingRotation("right")).toBe(Math.PI / 2);
    expect(resolveFroggerFacingRotation("down")).toBe(Math.PI);
    expect(resolveFroggerFacingRotation("left")).toBe(-Math.PI / 2);
    expect(resolveFroggerFacingRotation(undefined)).toBe(0);
  });
});

describe("resolveFroggerTurtleVisualState", () => {
  it("keeps normal and warning turtle art distinct", () => {
    expect(resolveFroggerTurtleVisualState("float")).toEqual({
      bodyColor: FROGGER_VISUAL_TOKENS.turtles.body,
      shellColor: FROGGER_VISUAL_TOKENS.turtles.shell,
      opacity: 1,
    });
    expect(resolveFroggerTurtleVisualState("warning")).toEqual({
      bodyColor: FROGGER_VISUAL_TOKENS.turtles.warning,
      shellColor: FROGGER_VISUAL_TOKENS.turtles.shell,
      opacity: 1,
    });
  });

  it("uses a darker, lower-opacity presentation when submerged", () => {
    expect(resolveFroggerTurtleVisualState("submerged")).toEqual({
      bodyColor: FROGGER_VISUAL_TOKENS.turtles.submerged,
      shellColor: FROGGER_VISUAL_TOKENS.turtles.submerged,
      opacity: 0.62,
    });
  });
});
