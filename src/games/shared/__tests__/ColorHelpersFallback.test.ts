import { World } from "@tiny-aster/core";
import { resolveFlappyVfxColors } from "../../flappybird/rendering/FlappyBirdRenderUtils";
import { resolveFroggerSlotColors } from "../../frogger/rendering/FroggerRenderUtils";
import { resolveFinishCheckers, DEFAULT_FINISH_CHECKERS } from "../../racing/rendering/RacingVisualHelpers";
import { FroggerComponentRegistry } from "../../frogger/types/FroggerTypes";

describe("Front 3 Color Helpers Fallback Unit Tests", () => {
  it("resolveFlappyVfxColors falls back when no theme effects are defined", () => {
    const world = new World();
    const result = resolveFlappyVfxColors(world);
    expect(result.scanlineColor).toBeDefined();
    expect(result.vignetteOuter).toBeDefined();
  });

  it("resolveFlappyVfxColors uses theme effects when present", () => {
    const world = new World();
    world.setResource("Theme", {
      effects: {
        scanlineColor: "#112233",
        vignetteOuterColor: "#445566"
      }
    });
    const result = resolveFlappyVfxColors(world);
    expect(result.scanlineColor).toBe("#112233");
    expect(result.vignetteOuter).toBe("#445566");
  });

  it("resolveFroggerSlotColors resolves default slot and occupied colors", () => {
    const world = new World<FroggerComponentRegistry>();
    const result = resolveFroggerSlotColors(world);
    expect(result.slotColor).toBe("#00AA44");
    expect(result.occupiedColor).toBe("#39FF14");
  });

  it("resolveFinishCheckers falls back to DEFAULT_FINISH_CHECKERS", () => {
    expect(resolveFinishCheckers(undefined)).toEqual([DEFAULT_FINISH_CHECKERS[0], DEFAULT_FINISH_CHECKERS[1]]);
    expect(resolveFinishCheckers({})).toEqual([DEFAULT_FINISH_CHECKERS[0], DEFAULT_FINISH_CHECKERS[1]]);
    expect(resolveFinishCheckers({ finishCheckers: ["#000"] })).toEqual([DEFAULT_FINISH_CHECKERS[0], DEFAULT_FINISH_CHECKERS[1]]);
  });

  it("resolveFinishCheckers uses skin checkers when valid", () => {
    expect(resolveFinishCheckers({ finishCheckers: ["#FF0000", "#00FF00"] })).toEqual(["#FF0000", "#00FF00"]);
  });
});
