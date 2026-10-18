import { World, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { resolveFlappyVfxColors } from "../../flappybird/rendering/FlappyBirdRenderUtils";
import { resolveFroggerSlotColors } from "../../frogger/rendering/FroggerRenderUtils";
import { resolveFinishCheckers, DEFAULT_FINISH_CHECKERS } from "../../racing/rendering/RacingVisualHelpers";
import type { FroggerComponentRegistry } from "../../frogger/types/FroggerTypes";

describe("Extracted Visual Color Helpers Unit Tests", () => {
  let world: World<FroggerComponentRegistry>;

  beforeEach(() => {
    world = new World<FroggerComponentRegistry>();
  });

  describe("resolveFlappyVfxColors", () => {
    it("returns default fallback colors when Theme resource is missing", () => {
      const colors = resolveFlappyVfxColors(world);
      expect(colors.scanlineColor).toBe("rgba(22, 22, 34, 0.06)");
      expect(colors.vignetteOuter).toBe("rgba(22, 22, 34, 0.45)");
    });

    it("returns theme effect colors when present in Theme resource", () => {
      const customTheme: Theme = {
        spriteMap: {},
        colorMap: {},
        effects: {
          scanlineColor: "rgba(0, 0, 0, 0.2)",
          vignetteOuterColor: "rgba(10, 10, 10, 0.8)"
        }
      };
      world.setResource(THEME_RESOURCE_KEY, customTheme);

      const colors = resolveFlappyVfxColors(world);
      expect(colors.scanlineColor).toBe("rgba(0, 0, 0, 0.2)");
      expect(colors.vignetteOuter).toBe("rgba(10, 10, 10, 0.8)");
    });
  });

  describe("resolveFroggerSlotColors", () => {
    it("returns default slot fallback colors when colorMap is empty", () => {
      const colors = resolveFroggerSlotColors(world);
      expect(colors.slotColor).toBe("#00AA44");
      expect(colors.occupiedColor).toBe("#39FF14");
    });

    it("resolves slot colors from Theme colorMap when configured", () => {
      const customTheme: Theme = {
        spriteMap: {},
        colorMap: {
          home_slot: "#123456",
          home_slot_occupied: "#654321"
        }
      };
      world.setResource(THEME_RESOURCE_KEY, customTheme);

      const colors = resolveFroggerSlotColors(world);
      expect(colors.slotColor).toBe("#123456");
      expect(colors.occupiedColor).toBe("#654321");
    });
  });

  describe("resolveFinishCheckers", () => {
    it("returns DEFAULT_FINISH_CHECKERS when skin or checkers array is missing or invalid", () => {
      expect(resolveFinishCheckers()).toEqual(DEFAULT_FINISH_CHECKERS);
      expect(resolveFinishCheckers({})).toEqual(DEFAULT_FINISH_CHECKERS);
      expect(resolveFinishCheckers({ finishCheckers: ["#111111"] })).toEqual(DEFAULT_FINISH_CHECKERS);
    });

    it("returns skin finishCheckers tuple when skin supplies at least two colors", () => {
      const result = resolveFinishCheckers({ finishCheckers: ["#000000", "#FFFFFF"] });
      expect(result).toEqual(["#000000", "#FFFFFF"]);
    });
  });
});
