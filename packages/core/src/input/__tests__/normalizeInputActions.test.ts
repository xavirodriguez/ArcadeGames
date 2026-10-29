import { normalizeInputActions } from "../normalizeInputActions";

describe("normalizeInputActions", () => {
  it("returns empty array for undefined", () => {
    expect(normalizeInputActions(undefined)).toEqual([]);
  });

  it("filters out invalid action names and returns sorted array", () => {
    const raw = ["shoot", "invalidAction", "thrust", "boost", "unknown"];
    const normalized = normalizeInputActions(raw);
    expect(normalized).toEqual(["boost", "shoot", "thrust"]);
  });

  it("throws TypeError when passed a Set", () => {
    const setInput = new Set(["thrust", "shoot"]);
    expect(() => normalizeInputActions(setInput)).toThrow(TypeError);
    expect(() => normalizeInputActions(setInput)).toThrow("Expected Array or undefined, received Set");
  });

  it("throws TypeError when passed a Record object", () => {
    const recordInput = { thrust: true, shoot: false };
    expect(() => normalizeInputActions(recordInput)).toThrow(TypeError);
    expect(() => normalizeInputActions(recordInput)).toThrow("Expected Array or undefined, received Object");
  });

  it("throws TypeError when passed null", () => {
    expect(() => normalizeInputActions(null)).toThrow(TypeError);
    expect(() => normalizeInputActions(null)).toThrow("Expected Array or undefined, received null");
  });

  it("throws TypeError when passed a string or number", () => {
    expect(() => normalizeInputActions("thrust")).toThrow(TypeError);
    expect(() => normalizeInputActions(123)).toThrow(TypeError);
  });
});
