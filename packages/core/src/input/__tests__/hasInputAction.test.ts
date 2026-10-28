import { hasInputAction } from "../hasInputAction";

describe("hasInputAction", () => {
  describe("Set format", () => {
    it("returns true when action is present", () => {
      const actions = new Set(["thrust", "shoot"]);
      expect(hasInputAction(actions, "thrust")).toBe(true);
    });

    it("returns false when action is absent", () => {
      const actions = new Set(["shoot"]);
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });
  });

  describe("Array format", () => {
    it("returns true when action is present", () => {
      const actions = ["thrust", "shoot"];
      expect(hasInputAction(actions, "thrust")).toBe(true);
    });

    it("returns false when action is absent", () => {
      const actions = ["shoot"];
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });
  });

  describe("Record format", () => {
    it("returns true when action is true", () => {
      const actions = { thrust: true, shoot: false };
      expect(hasInputAction(actions, "thrust")).toBe(true);
    });

    it("returns false when action is false", () => {
      const actions = { thrust: false, shoot: true };
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });

    it("returns false when action is undefined or missing", () => {
      const actions = { shoot: true };
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });

    it("does not treat a truthy non-boolean value as active", () => {
      const actions = { thrust: "true" } as never;
      expect(hasInputAction(actions, "thrust")).toBe(false);
    });
  });

  describe("falsy and edge cases", () => {
    it("returns false for null", () => {
      expect(hasInputAction(null, "thrust")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(hasInputAction(undefined, "thrust")).toBe(false);
    });
  });
});
