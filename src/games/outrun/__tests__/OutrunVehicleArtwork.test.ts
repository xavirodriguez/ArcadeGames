import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import { computeOutrunPlayerArtworkScale } from "../rendering/OutrunVisualHelpers";
import { resolveOutrunTrafficArtworkStyle } from "../rendering/OutrunVehicleArtwork";

describe("Out Run vehicle artwork", () => {
  it("scales the configured coupé from the projected road width", () => {
    const normal = computeOutrunPlayerArtworkScale(DEFAULT_OUTRUN_CONFIG);
    const wider = computeOutrunPlayerArtworkScale({
      ...DEFAULT_OUTRUN_CONFIG,
      WIDTH: DEFAULT_OUTRUN_CONFIG.WIDTH * 1.5
    });

    expect(normal).toBeGreaterThan(0);
    expect(Number.isFinite(normal)).toBe(true);
    expect(wider).toBeGreaterThan(normal);
  });

  it("uses three distinct traffic silhouettes with restrained colors", () => {
    const config = DEFAULT_OUTRUN_CONFIG;
    const coupe = resolveOutrunTrafficArtworkStyle(config, 0, 100);
    const van = resolveOutrunTrafficArtworkStyle(config, 1, 100);
    const truck = resolveOutrunTrafficArtworkStyle(config, 2, 100);

    expect(coupe.shape).toBe("coupe");
    expect(van.shape).toBe("van");
    expect(truck.shape).toBe("truck");
    expect(coupe.bodyWidth).toBe(100);
    expect(coupe.bodyColor).toBe(config.visual.palette.shared.trafficA);
    expect(van.bodyColor).toBe(config.visual.palette.shared.trafficB);
    expect(truck.bodyColor).toBe(config.visual.palette.shared.trafficC);
    expect(van.cabinHeight).toBeGreaterThan(coupe.cabinHeight);
    expect(truck.cabinHeight).toBeGreaterThan(van.cabinHeight);
    expect(truck.bodyHeight).toBeGreaterThan(coupe.bodyHeight);
  });

  it("shares the art-bible light, glass, shadow and cabin color rules", () => {
    const config = DEFAULT_OUTRUN_CONFIG;
    const style = resolveOutrunTrafficArtworkStyle(config, 1, 60);

    expect(style.glassColor).toBe(config.visual.palette.shared.carGlass);
    expect(style.shadowColor).toBe(config.visual.palette.shared.shadow);
    expect(style.lightBarColor).toBe(config.visual.palette.shared.trafficLightBar);
    expect(style.cabinColor).not.toBe(style.bodyColor);
    expect(style.lightBarWidth).toBeCloseTo(60 * config.visual.tuning.traffic.lightBarWidthToBodyWidth);
  });
});
