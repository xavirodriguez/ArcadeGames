import { calculateHitFlashPulse, calculateInvulnerabilityPulse } from "../asteroidsMath";
import { calculateShieldHpRatio, calculateBossPhase } from "../spaceInvadersMath";
import { colors } from "../../../../theme/colors";

describe("Visual Math Pure Helpers", () => {
  describe("asteroidsMath", () => {
    it("debería calcular hitFlashPulse adecuadamente", () => {
      const normal = calculateHitFlashPulse(0, colors.cyan, 1.0);
      expect(normal.isFlashing).toBe(false);
      expect(normal.color).toBe(colors.cyan);
      expect(normal.opacity).toBe(1.0);

      const flashingEven = calculateHitFlashPulse(2, colors.cyan, 1.0); // (2>>1)%2 == 1 -> not dimmed
      expect(flashingEven.isFlashing).toBe(true);
      expect(flashingEven.color).toBe(colors.white);
      expect(flashingEven.opacity).toBe(1.0);

      const flashingOdd = calculateHitFlashPulse(1, colors.cyan, 1.0); // (1>>1)%2 == 0 -> dimmed
      expect(flashingOdd.isFlashing).toBe(true);
      expect(flashingOdd.color).toBe(colors.white);
      expect(flashingOdd.opacity).toBe(0.3);
    });

    it("debería calcular invulnerabilityPulse adecuadamente", () => {
      const notInv = calculateInvulnerabilityPulse(0, 1.0);
      expect(notInv.isInvulnerable).toBe(false);
      expect(notInv.opacity).toBe(1.0);

      const inv0 = calculateInvulnerabilityPulse(0.2, 1.0); // Math.floor(0.2*10)%2 == 2%2 = 0 -> opacity 0.3
      expect(inv0.isInvulnerable).toBe(true);
      expect(inv0.opacity).toBe(0.3);

      const inv1 = calculateInvulnerabilityPulse(0.3, 1.0); // Math.floor(0.3*10)%2 == 3%2 = 1 -> opacity 1.0
      expect(inv1.isInvulnerable).toBe(true);
      expect(inv1.opacity).toBe(1.0);
    });
  });

  describe("spaceInvadersMath", () => {
    it("debería calcular el ratio de HP del escudo", () => {
      expect(calculateShieldHpRatio(3, 3)).toBe(1.0);
      expect(calculateShieldHpRatio(1.5, 3)).toBe(0.5);
      expect(calculateShieldHpRatio(0, 3)).toBe(0);
      expect(calculateShieldHpRatio(-1, 3)).toBe(0);
      expect(calculateShieldHpRatio(5, 3)).toBe(1.0);
    });

    it("debería calcular las fases del Boss según el HP ratio", () => {
      const phase1 = calculateBossPhase(0.8);
      expect(phase1.phase).toBe(1);
      expect(phase1.baseColor).toBe(colors.magentaHot);
      expect(phase1.accentColor).toBe(colors.cyan);

      const phase2 = calculateBossPhase(0.5);
      expect(phase2.phase).toBe(2);
      expect(phase2.baseColor).toBe(colors.gold);
      expect(phase2.accentColor).toBe(colors.orangeDark);

      const phase3 = calculateBossPhase(0.2);
      expect(phase3.phase).toBe(3);
      expect(phase3.baseColor).toBe(colors.redHot);
      expect(phase3.accentColor).toBe(colors.orange);
    });
  });
});
