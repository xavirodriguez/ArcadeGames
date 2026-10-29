import { INK_WORLD_PALETTE } from "./inkWorldPalette";
function relativeLuminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a), L2 = relativeLuminance(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
describe("INK_WORLD_PALETTE contrast guards", () => {
  it("sumi meets text contrast on washi", () => {
    expect(contrastRatio(INK_WORLD_PALETTE.ink, INK_WORLD_PALETTE.parchment)).toBeGreaterThanOrEqual(4.5);
  });
  it("threatRed meets graphic contrast on washi", () => {
    expect(contrastRatio(INK_WORLD_PALETTE.threatRed, INK_WORLD_PALETTE.parchment)).toBeGreaterThanOrEqual(3);
  });
  it("gold does not meet 3:1 on washi (must use sumi outline)", () => {
    expect(contrastRatio(INK_WORLD_PALETTE.gold, INK_WORLD_PALETTE.parchment)).toBeLessThan(3);
  });
});
