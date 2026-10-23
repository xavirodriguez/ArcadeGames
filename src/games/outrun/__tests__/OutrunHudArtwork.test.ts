import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData } from "../types/OutrunTypes";
import { createVisualPaletteResource } from "../utils/palette";
import { resolveOutrunHudLayout } from "../rendering/OutrunHudArtwork";

const roadData: RoadData = {
  trackLength: 1000,
  segments: [{ index: 0, length: 1000, curve: 0, hill: 0 }]
};
const state: RaceStateComponent = {
  type: "RaceState", playerZ: 0, playerX: 0, speed: 0, lapTime: 24.5,
  isGameOver: false, position: 1, currentSegment: 0
};

describe("Out Run responsive HUD artwork", () => {
  it("shows the stage and hour with common progress geometry", () => {
    const visualPalette = createVisualPaletteResource(state, roadData, DEFAULT_OUTRUN_CONFIG);
    const layout = resolveOutrunHudLayout({
      config: DEFAULT_OUTRUN_CONFIG,
      progressFraction: 0.4,
      speedKmh: 112,
      timeStr: "24.5",
      visualPalette
    });

    expect(layout.stage.label).toBe("Tramo 1 de 5");
    expect(layout.stage.hour).toBe("Amanecer");
    expect(layout.progress.carMarkerX).toBeCloseTo(
      layout.progress.x + layout.progress.width * 0.4
    );
    expect(layout.progress.filledWidth).toBeCloseTo(layout.progress.width * 0.4);
    expect(layout.speedPill.value).toBe("112");
    expect(layout.radioPill.bars).toHaveLength(5);
    expect(layout.radioPill.bars[4]?.active).toBe(true);
  });

  it("scales all HUD geometry with viewport width and labels golden hour", () => {
    const basePalette = createVisualPaletteResource(state, roadData, DEFAULT_OUTRUN_CONFIG);
    const visualPalette = { ...basePalette, stageIndex: 2, hour: "afternoon" as const };
    const normal = resolveOutrunHudLayout({
      config: DEFAULT_OUTRUN_CONFIG, progressFraction: 0.5, speedKmh: 80, timeStr: "12.0", visualPalette
    });
    const wide = resolveOutrunHudLayout({
      config: { ...DEFAULT_OUTRUN_CONFIG, WIDTH: DEFAULT_OUTRUN_CONFIG.WIDTH * 1.5 },
      progressFraction: 0.5, speedKmh: 80, timeStr: "12.0", visualPalette
    });

    expect(normal.stage.label).toBe("Tramo 3 de 5");
    expect(normal.stage.hour).toBe("Hora dorada");
    expect(wide.scale).toBeGreaterThan(normal.scale);
    expect(wide.speedPill.width).toBeGreaterThan(normal.speedPill.width);
    expect(wide.progress.width).toBeGreaterThan(normal.progress.width);
  });
});
