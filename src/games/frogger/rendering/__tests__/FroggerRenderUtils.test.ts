import { World } from "@tiny-aster/core";
import { resolveFroggerSlotColors } from "../FroggerRenderUtils";
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
