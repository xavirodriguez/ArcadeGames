import {
  resolveEchoStarsLayout,
  resolveEchoPerspectiveGrid,
  resolveEchoSkylineLayout,
  resolveEchoPillarLayout,
  resolveEchoRuinsLayout,
  resolveEchoFloraLayout,
  resolveEchoMotesLayout,
  resolveEchoPlayerRunTrails,
} from "../rendering/EchoRunnerVisualHelpers";
import { resolveEchoRunnerPalette } from "../rendering/EchoRunnerVisualUtils";
import { World } from "@tiny-aster/core";

describe("EchoRunnerVisualHelpers", () => {
  const world = new World();
  const palette = resolveEchoRunnerPalette(world);

  describe("resolveEchoStarsLayout", () => {
    it("generates deterministic 22 stars with coordinates within bounds", () => {
      const width = 800;
      const horizonY = 300;
      const elapsed = 10.5;

      const stars = resolveEchoStarsLayout(width, horizonY, elapsed, palette);
      expect(stars).toHaveLength(22);

      for (const star of stars) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThan(width);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThan(horizonY);
        expect([1.5, 3]).toContain(star.size);
        expect([palette.restorationCyanGlow, palette.corruptionPurpleGlow]).toContain(star.color);
        expect(star.alpha).toBeGreaterThanOrEqual(0.2);
        expect(star.alpha).toBeLessThanOrEqual(0.4);
      }

      // Parity across multiple invocations
      const starsRepeat = resolveEchoStarsLayout(width, horizonY, elapsed, palette);
      expect(starsRepeat).toEqual(stars);
    });
  });

  describe("resolveEchoPerspectiveGrid", () => {
    it("generates radial and horizontal lines matching the perspective plane", () => {
      const width = 800;
      const height = 600;
      const horizonY = 336;
      const vanishingX = 400;

      const grid = resolveEchoPerspectiveGrid(width, height, horizonY, vanishingX);
      expect(grid.vanishingX).toBe(vanishingX);
      expect(grid.horizonY).toBe(horizonY);
      expect(grid.radialLines).toHaveLength(15);
      expect(grid.horizontalLines).toHaveLength(8);

      expect(grid.radialLines[0]!.x1).toBe(vanishingX);
      expect(grid.radialLines[0]!.y1).toBe(horizonY);
      expect(grid.radialLines[0]!.x2).toBe(0);
      expect(grid.radialLines[0]!.y2).toBe(height);

      expect(grid.radialLines[14]!.x2).toBe(width);

      // Verify horizontal grid lines increase monotonically from horizon to bottom
      let prevY = horizonY;
      for (const line of grid.horizontalLines) {
        expect(line.y).toBeGreaterThan(prevY);
        expect(line.y).toBeLessThanOrEqual(height);
        prevY = line.y;
      }
    });
  });

  describe("resolveEchoSkylineLayout", () => {
    it("generates 20 buildings with windows and antennae", () => {
      const width = 800;
      const horizonY = 336;
      const elapsed = 5.0;

      const skyline = resolveEchoSkylineLayout(width, horizonY, elapsed);
      expect(skyline).toHaveLength(20);

      for (const b of skyline) {
        expect(b.width).toBeGreaterThanOrEqual(24);
        expect(b.height).toBeGreaterThanOrEqual(36);
        expect(b.y + b.height).toBe(horizonY);
        expect(b.fillAlpha).toBeGreaterThan(0.2);
        if (b.hasAntenna) {
          expect(b.antennaTopY).toBeLessThan(b.y);
          expect(b.antennaX).toBeCloseTo(b.x + b.width * 0.5);
        }
      }
    });
  });

  describe("resolveEchoPillarLayout", () => {
    it("generates 4 vertical parallax pillars", () => {
      const width = 800;
      const height = 600;
      const elapsed = 12.0;

      const pillars = resolveEchoPillarLayout(width, height, elapsed);
      expect(pillars).toHaveLength(4);

      for (const p of pillars) {
        expect(p.width).toBeGreaterThanOrEqual(8);
        expect(p.height).toBeGreaterThanOrEqual(34);
      }
    });
  });

  describe("resolveEchoRuinsLayout", () => {
    it("generates 7 foreground archive ruin blocks with alternating relics", () => {
      const width = 800;
      const height = 600;
      const elapsed = 8.0;

      const ruins = resolveEchoRuinsLayout(width, height, elapsed);
      expect(ruins).toHaveLength(7);

      for (let i = 0; i < ruins.length; i++) {
        const r = ruins[i]!;
        expect(r.width).toBeGreaterThanOrEqual(18);
        expect(r.height).toBeGreaterThanOrEqual(24);
        expect(r.hasRelicGlow).toBe(i % 2 === 0);
        if (r.hasRelicGlow) {
          expect(r.relicWidth).toBe(3);
          expect(r.relicHeight).toBeGreaterThanOrEqual(6);
        }
      }
    });
  });

  describe("resolveEchoFloraLayout", () => {
    it("generates 9 foreground pixel flora plants", () => {
      const width = 800;
      const height = 600;
      const elapsed = 20.0;

      const flora = resolveEchoFloraLayout(width, height, elapsed, palette);
      expect(flora).toHaveLength(9);

      for (let i = 0; i < flora.length; i++) {
        const f = flora[i]!;
        expect(f.stemHeight).toBeGreaterThanOrEqual(14);
        expect(f.hasBloom).toBe(i % 2 === 0);
        expect([palette.restorationGoldGlow, palette.restorationCyanGlow]).toContain(f.color);
      }
    });
  });

  describe("resolveEchoMotesLayout", () => {
    it("generates 8 ambient drifting motes", () => {
      const width = 800;
      const height = 600;
      const elapsed = 15.0;

      const motes = resolveEchoMotesLayout(width, height, elapsed, palette);
      expect(motes).toHaveLength(8);

      for (const m of motes) {
        expect(m.radius).toBeGreaterThanOrEqual(1.5);
        expect([palette.restorationCyanGlow, palette.corruptionPurpleGlow]).toContain(m.color);
      }
    });
  });

  describe("resolveEchoPlayerRunTrails", () => {
    it("generates 3 player running streaks with dynamic opacity and segment positions", () => {
      const size = 32;
      const vx = 180;
      const tick = 120;
      const pixelSize = 2;

      const trails = resolveEchoPlayerRunTrails(size, vx, tick, pixelSize, palette);
      expect(trails).toHaveLength(3);

      for (let i = 0; i < 3; i++) {
        const t = trails[i]!;
        expect(t.lineWidth).toBeGreaterThanOrEqual(1);
        expect(t.alphaFactor).toBeGreaterThan(0);
        expect(t.color).toBe(i === 1 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow);
        expect(t.startX).toBe(-size * 0.22);
        expect(t.midX).toBeLessThan(t.startX);
        expect(t.endX).toBeLessThan(t.midX);
      }
    });
  });
});
