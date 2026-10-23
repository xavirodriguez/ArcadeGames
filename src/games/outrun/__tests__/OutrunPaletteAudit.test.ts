import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import {
  auditOutrunPaletteContrast,
  contrastRatio,
  OUTRUN_REQUIRED_CAR_ROAD_CONTRAST,
  relativeLuminance
} from "../rendering/OutrunPaletteAudit";

describe("Out Run visual contrast audit", () => {
  it("matches the WCAG luminance and contrast reference values", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 8);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 8);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 8);
  });

  it("rejects malformed non-HEX colors rather than silently reporting a ratio", () => {
    expect(() => relativeLuminance("white")).toThrow("Invalid six-digit HEX color");
    expect(() => contrastRatio("#12345", "#000000")).toThrow("Invalid six-digit HEX color");
  });

  it("keeps player-car to road contrast at or above 3:1 in every hour and palette mode", () => {
    const results = auditOutrunPaletteContrast(DEFAULT_OUTRUN_CONFIG);
    expect(results).toHaveLength(10);
    expect(results.every(result =>
      Number.isFinite(result.contrastRatio) &&
      result.contrastRatio >= OUTRUN_REQUIRED_CAR_ROAD_CONTRAST &&
      result.meetsMinimum
    )).toBe(true);
    expect(results.map(result => `${result.mode}:${result.hour}`)).toEqual([
      "default:dawn",
      "default:noon",
      "default:afternoon",
      "default:twilight",
      "default:night",
      "colorblind:dawn",
      "colorblind:noon",
      "colorblind:afternoon",
      "colorblind:twilight",
      "colorblind:night"
    ]);
  });
});
