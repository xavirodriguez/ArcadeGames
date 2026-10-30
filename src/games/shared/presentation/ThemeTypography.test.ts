import {
  NEON_THEME_TYPOGRAPHY,
  SUMI_FONT_MANIFEST,
  SUMI_THEME_TYPOGRAPHY,
  canvasFontString,
  mapSizeToStep,
} from "./ThemeTypography";

describe("ThemeTypography D4 Option A", () => {
  it("neon canvas stack stays bold {n}px monospace", () => {
    expect(canvasFontString(NEON_THEME_TYPOGRAPHY, 14, "mono", "bold")).toBe(
      "bold 14px monospace"
    );
    expect(canvasFontString(NEON_THEME_TYPOGRAPHY, 12, "display", "bold")).toBe(
      "bold 12px monospace"
    );
  });

  it("sumi display uses Yuji Boku", () => {
    expect(SUMI_THEME_TYPOGRAPHY.display).toContain("Yuji Boku");
    expect(SUMI_THEME_TYPOGRAPHY.body).toContain("Noto Serif JP");
    expect(SUMI_THEME_TYPOGRAPHY.mono).toMatch(/monospace/i);
  });

  it("maps free sizes 9–18 onto five steps", () => {
    expect(mapSizeToStep(9)).toBe("xs");
    expect(mapSizeToStep(12)).toBe("xs");
    expect(mapSizeToStep(14)).toBe("sm");
    expect(mapSizeToStep(16)).toBe("md");
    expect(mapSizeToStep(18)).toBe("lg");
    expect(mapSizeToStep(22)).toBe("xl");
  });

  it("SUMI_FONT_MANIFEST points at public/assets/fonts *.ttf", () => {
    for (const entry of SUMI_FONT_MANIFEST) {
      expect(entry.localPath).toMatch(/^public\/assets\/fonts\/.+\.ttf$/);
    }
    expect(SUMI_FONT_MANIFEST.map((e) => e.family).sort()).toEqual(
      ["Noto Serif JP", "Yuji Boku"].sort()
    );
  });
});
