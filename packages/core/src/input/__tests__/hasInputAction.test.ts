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

  describe("Set and Record compatibility formats", () => {
    it("returns true when action is present in Set", () => {
      const actions = new Set<CanonicalActionName>(["thrust"]);
      expect(hasInputAction(actions, "thrust")).toBe(true);
    });

    it("returns false when action is absent in Set", () => {
      const actions = new Set<CanonicalActionName>(["shoot"]);
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });

    it("returns true when action is present in Record map", () => {
      const actions = { thrust: true };
      expect(hasInputAction(actions, "thrust")).toBe(true);
    });

    it("returns false when action is false or absent in Record map", () => {
      const actions = { thrust: false };
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
