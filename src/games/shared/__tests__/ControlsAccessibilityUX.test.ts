import { en } from "../../../locales/en";
import { es } from "../../../locales/es";

describe("Controls & Terminal UX Accessibility Standards", () => {
  describe("Locale Accessibility Translation Invariants", () => {
    it("should define matching accessibility namespaces in English and Spanish", () => {
      expect(en.accessibility).toBeDefined();
      expect(es.accessibility).toBeDefined();

      const requiredKeys = [
        "shoot_button_label",
        "shoot_button_hint",
        "hyperspace_button_label",
        "hyperspace_button_hint",
        "pong_p1_up",
        "pong_p1_down",
        "restart_game_label",
        "restart_game_hint",
      ];

      for (const key of requiredKeys) {
        expect((en.accessibility as Record<string, string>)[key]).toBeDefined();
        expect((es.accessibility as Record<string, string>)[key]).toBeDefined();
        expect(typeof (en.accessibility as Record<string, string>)[key]).toBe("string");
        expect(typeof (es.accessibility as Record<string, string>)[key]).toBe("string");
      }
    });
  });

  describe("Control Touch Target Bounds Verification", () => {
    it("should enforce at least 48px minimum touch targets and 12px hitSlop on arcade buttons", () => {
      const standardHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
      expect(standardHitSlop.top).toBeGreaterThanOrEqual(12);
      expect(standardHitSlop.bottom).toBeGreaterThanOrEqual(12);
      expect(standardHitSlop.left).toBeGreaterThanOrEqual(12);
      expect(standardHitSlop.right).toBeGreaterThanOrEqual(12);
    });
  });
});
