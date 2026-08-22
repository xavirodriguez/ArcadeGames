import {
  createEmptyCanonicalInputState,
  canonicalToInputFrame,
  inputFrameToCanonical,
} from "../src/input/CanonicalInput";
import type { CanonicalInputState } from "../src/input/CanonicalInput";

describe("CanonicalInput", () => {
  it("creates an empty canonical input state with zeroed axes and empty actions", () => {
    const state = createEmptyCanonicalInputState();
    expect(state.axes).toEqual({ moveX: 0, moveY: 0, aimX: 0, aimY: 0 });
    expect(state.actions.size).toBe(0);
    expect(state.timestamp).toBe(0);
  });

  it("converts CanonicalInputState to InputFrame and back seamlessly", () => {
    const original: CanonicalInputState<"custom"> = {
      axes: { moveX: 0.8, moveY: -0.5, aimX: 1, aimY: 0 },
      actions: new Set(["fire", "boost", "custom"]),
      timestamp: 123456789,
    };

    const frame = canonicalToInputFrame(original, 42, 1);
    expect(frame.tick).toBe(42);
    expect(frame.protocolVersion).toBe(1);
    expect(frame.timestamp).toBe(123456789);
    expect(frame.axes).toEqual({ moveX: 0.8, moveY: -0.5, aimX: 1, aimY: 0 });
    expect(frame.actions.sort()).toEqual(["boost", "custom", "fire"]);

    const converted = inputFrameToCanonical<"custom">(frame);
    expect(converted.axes).toEqual(original.axes);
    expect(Array.from(converted.actions).sort()).toEqual(Array.from(original.actions).sort());
    expect(converted.timestamp).toBe(original.timestamp);
  });

  it("handles missing or malformed fields gracefully during frame translation", () => {
    const malformedFrame: any = {
      tick: 10,
      protocolVersion: 1,
      actions: null,
      axes: null,
    };

    const canonical = inputFrameToCanonical(malformedFrame);
    expect(canonical.axes).toEqual({ moveX: 0, moveY: 0, aimX: 0, aimY: 0 });
    expect(canonical.actions.size).toBe(0);
    expect(canonical.timestamp).toBe(0);
  });
});
