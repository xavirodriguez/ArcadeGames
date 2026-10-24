import { World } from "@tiny-aster/core";
import { resolveFroggerSlotColors, resolveFroggerVehicleDirection } from "../FroggerRenderUtils";
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
