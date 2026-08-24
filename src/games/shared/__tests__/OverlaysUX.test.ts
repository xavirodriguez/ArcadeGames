import { en } from "../../../locales/en";
import { LEVEL_THRESHOLDS } from "../../../config/PassportConfig";

describe("Overlays UX & Accessibility Standard Verification", () => {
  describe("Locale Accessibility Strings", () => {
    it("should define all required accessibility strings for SeedWidget and Overlays", () => {
      expect(en.accessibility).toBeDefined();
      expect(en.accessibility.seed_input_label).toBe("Simulation Seed");
      expect(en.accessibility.seed_input_hint).toBeDefined();
      expect(en.accessibility.seed_apply_label).toBe("Apply seed");
      expect(en.accessibility.seed_apply_hint).toBeDefined();
      expect(en.accessibility.passport_title).toBe("ARCADE PASSPORT");
      expect(en.accessibility.leaderboard_error).toBe("Could not load leaderboard rankings");
      expect(en.accessibility.leaderboard_empty).toBe("No scores recorded today");
    });

    it("should provide valid replacement templates for parameterized labels", () => {
      const template = en.accessibility.leaderboard_button;
      expect(template).toContain("{game}");
      const formatted = template.replace("{game}", "ASTEROIDS");
      expect(formatted).toBe("View leaderboard for ASTEROIDS");
    });
  });

  describe("Passport Level Thresholds", () => {
    it("should define increasing XP thresholds for progression visualization", () => {
      expect(LEVEL_THRESHOLDS[1]).toBeDefined();
      expect(LEVEL_THRESHOLDS[2]).toBeGreaterThan(LEVEL_THRESHOLDS[1]);
      expect(LEVEL_THRESHOLDS[3]).toBeGreaterThan(LEVEL_THRESHOLDS[2]);
    });
  });
});
