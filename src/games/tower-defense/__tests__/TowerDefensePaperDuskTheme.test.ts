import { paperDuskConceptPack } from "../../../theme/conceptPacks/paperDuskConceptPack";

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

describe("Paper Dusk Theme WCAG Contrast Tests", () => {
  const cm = paperDuskConceptPack.colorMap as Record<string, string>;

  it("should satisfy pd_text vs pd_panel >= 4.5", () => {
    const ratio = contrast(cm.pd_text, cm.pd_panel);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("should satisfy pd_ink vs pd_path >= 3", () => {
    const ratio = contrast(cm.pd_ink, cm.pd_path);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it("should satisfy pd_paper vs pd_buildable >= 3", () => {
    const ratio = contrast(cm.pd_paper, cm.pd_buildable);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it("should satisfy creep colors vs pd_ground >= 3", () => {
    const creeps = [cm.creep_grunt, cm.creep_fast, cm.creep_tank, cm.creep_boss];
    for (const creepColor of creeps) {
      const ratio = contrast(creepColor, cm.pd_ground);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  it("should satisfy tower caps vs pd_paper >= 1.5", () => {
    const towers = [cm.tower_basic, cm.tower_sniper, cm.tower_rapid, cm.tower_frost];
    for (const towerCap of towers) {
      const ratio = contrast(towerCap, cm.pd_paper);
      expect(ratio).toBeGreaterThanOrEqual(1.5);
    }
  });
});
