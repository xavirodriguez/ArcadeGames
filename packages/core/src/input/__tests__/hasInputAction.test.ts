import { hasInputAction } from "../hasInputAction";
import type { CanonicalActionName } from "../CanonicalInput";

describe("hasInputAction", () => {
  describe("Array format", () => {
    it("returns true when action is present", () => {
      const actions: readonly CanonicalActionName[] = ["thrust", "shoot"];
      expect(hasInputAction(actions, "thrust")).toBe(true);
    });

    it("returns false when action is absent", () => {
      const actions: readonly CanonicalActionName[] = ["shoot"];
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });
  });

  describe("falsy and edge cases", () => {
    it("returns false for empty array", () => {
      const actions: readonly CanonicalActionName[] = [];
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });

    it("returns false for null", () => {
      expect(hasInputAction(null, "thrust")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(hasInputAction(undefined, "thrust")).toBe(false);
    });
  });
});
