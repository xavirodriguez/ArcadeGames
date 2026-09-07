import { resolveHitFlash, resolveInvulnerabilityPulse } from "../RenderUtils";
import { colors } from "../../../../theme/colors";

describe("RenderUtils", () => {
  describe("resolveHitFlash", () => {
    it("should return base color and base opacity when not flashing", () => {
      const result = resolveHitFlash({ hitFlashFrames: 0 }, colors.cyan, 1.0);
      expect(result).toEqual({
        color: colors.cyan,
        opacity: 1.0,
        isFlashing: false
      });
    });

    it("should handle undefined or null render input gracefully", () => {
      const resultNull = resolveHitFlash(null, colors.pink, 0.8);
      expect(resultNull).toEqual({
        color: colors.pink,
        opacity: 0.8,
        isFlashing: false
      });

      const resultUndef = resolveHitFlash(undefined, colors.pink, 0.8);
      expect(resultUndef).toEqual({
        color: colors.pink,
        opacity: 0.8,
        isFlashing: false
      });
    });

    it("should calculate dimmed and full opacity frames when hitFlashFrames > 0", () => {
      // (2 >> 1) % 2 === 1 % 2 === 1 -> not dimmed
      const res2 = resolveHitFlash({ hitFlashFrames: 2 }, colors.cyan, 1.0, 0.3);
      expect(res2).toEqual({
        color: colors.white,
        opacity: 1.0,
        isFlashing: true
      });

      // (3 >> 1) % 2 === 1 % 2 === 1 -> not dimmed
      const res3 = resolveHitFlash({ hitFlashFrames: 3 }, colors.cyan, 1.0, 0.3);
      expect(res3).toEqual({
        color: colors.white,
        opacity: 1.0,
        isFlashing: true
      });

      // (4 >> 1) % 2 === 2 % 2 === 0 -> dimmed
      const res4 = resolveHitFlash({ hitFlashFrames: 4 }, colors.cyan, 1.0, 0.3);
      expect(res4).toEqual({
        color: colors.white,
        opacity: 0.3,
        isFlashing: true
      });
    });

    it("should respect custom dimOpacity parameter", () => {
      const res = resolveHitFlash({ hitFlashFrames: 4 }, colors.gold, 1.0, 0.35);
      expect(res.opacity).toBe(0.35);
    });
  });

  describe("resolveInvulnerabilityPulse", () => {
    it("should return baseOpacity and isInvulnerable false when remaining is undefined, null or <= 0", () => {
      expect(resolveInvulnerabilityPulse(undefined)).toEqual({ opacity: 1.0, isInvulnerable: false });
      expect(resolveInvulnerabilityPulse(null)).toEqual({ opacity: 1.0, isInvulnerable: false });
      expect(resolveInvulnerabilityPulse(0)).toEqual({ opacity: 1.0, isInvulnerable: false });
      expect(resolveInvulnerabilityPulse(-1.5)).toEqual({ opacity: 1.0, isInvulnerable: false });
    });

    it("should handle mode 'time' (Asteroids style)", () => {
      // remaining = 1.5 -> Math.floor(1.5 * 10) % 2 = Math.floor(15) % 2 = 1 -> full opacity
      const res1 = resolveInvulnerabilityPulse(1.5, 1.0, { mode: "time" });
      expect(res1).toEqual({ opacity: 1.0, isInvulnerable: true });

      // remaining = 1.4 -> Math.floor(1.4 * 10) % 2 = Math.floor(14) % 2 = 0 -> dimmed opacity 0.3
      const res2 = resolveInvulnerabilityPulse(1.4, 1.0, { mode: "time" });
      expect(res2).toEqual({ opacity: 0.3, isInvulnerable: true });
    });

    it("should handle mode 'tick' (Space Invaders / Geometry Wars / EchoRunner style)", () => {
      // remaining duration = 1.5s, current tick = 4, divisor = 4 -> Math.floor(4 / 4) % 2 = 1 % 2 = 1 -> full opacity
      const resTick4 = resolveInvulnerabilityPulse(1.5, 1.0, { mode: "tick", tick: 4, pulseDivisor: 4 });
      expect(resTick4).toEqual({ opacity: 1.0, isInvulnerable: true });

      // remaining duration = 1.5s, current tick = 8, divisor = 4 -> Math.floor(8 / 4) % 2 = 2 % 2 = 0 -> dimmed opacity
      const resTick8 = resolveInvulnerabilityPulse(1.5, 1.0, { mode: "tick", tick: 8, pulseDivisor: 4, dimOpacity: 0.3 });
      expect(resTick8).toEqual({ opacity: 0.3, isInvulnerable: true });
    });

    it("should handle mode 'interval' (Flappy Bird style)", () => {
      // remaining ms = 200, multiplier = 0.01 -> Math.floor(200 * 0.01) % 2 = 2 % 2 = 0 -> dimmed
      const resDimmed = resolveInvulnerabilityPulse(200, 1.0, { mode: "interval", multiplier: 0.01, dimOpacity: 0.35 });
      expect(resDimmed).toEqual({ opacity: 0.35, isInvulnerable: true });

      // remaining ms = 300, multiplier = 0.01 -> Math.floor(300 * 0.01) % 2 = 3 % 2 = 1 -> full
      const resFull = resolveInvulnerabilityPulse(300, 1.0, { mode: "interval", multiplier: 0.01, dimOpacity: 0.35 });
      expect(resFull).toEqual({ opacity: 1.0, isInvulnerable: true });
    });
  });
});
