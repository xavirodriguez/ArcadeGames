import { World } from "@tiny-aster/core";
import { resolveFlappyVfxColors } from "../FlappyBirdRenderUtils";
import { hexToRgba } from "../../../shared/rendering/CosmicPalette";
import { colors } from "../../../../theme/colors";

describe("resolveFlappyVfxColors unit tests", () => {
  it("returns theme effects colors when Theme resource is present", () => {
    const world = new World();
    world.setResource("Theme", {
      effects: {
        scanlineColor: "rgba(255, 0, 0, 0.1)",
        vignetteOuterColor: "rgba(0, 0, 0, 0.8)",
      },
    });

    const vfxColors = resolveFlappyVfxColors(world);
    expect(vfxColors.scanlineColor).toBe("rgba(255, 0, 0, 0.1)");
    expect(vfxColors.vignetteOuter).toBe("rgba(0, 0, 0, 0.8)");
  });

  it("returns fallback rgba colors derived from surface color when Theme or Theme effects are missing", () => {
    const world = new World();
    const vfxColors = resolveFlappyVfxColors(world);

    expect(vfxColors.scanlineColor).toBe(hexToRgba(colors.surface, 0.06));
    expect(vfxColors.vignetteOuter).toBe(hexToRgba(colors.surface, 0.45));
  });
});
