import { World } from "@tiny-aster/core";
import { resolveFroggerSlotColors } from "../FroggerRenderUtils";
import { FroggerComponentRegistry } from "../../types/FroggerTypes";

describe("resolveFroggerSlotColors unit tests", () => {
  it("returns fallback slot and occupied colors when Theme resource is missing", () => {
    const world = new World<FroggerComponentRegistry>();
    const slotColors = resolveFroggerSlotColors(world);

    expect(slotColors.slotColor).toBe("#00AA44");
    expect(slotColors.occupiedColor).toBe("#39FF14");
  });

  it("resolves theme colors when Theme resource defines color overrides", () => {
    const world = new World<FroggerComponentRegistry>();
    world.setResource("Theme", {
      colorMap: {
        home_slot: "#112233",
        home_slot_occupied: "#ff00bb",
      },
    });

    const slotColors = resolveFroggerSlotColors(world);
    expect(slotColors.slotColor).toBe("#112233");
    expect(slotColors.occupiedColor).toBe("#ff00bb");
  });
});
