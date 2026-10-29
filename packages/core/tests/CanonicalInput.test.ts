import {
  createEmptyCanonicalInputState,
  canonicalToInputFrame,
  inputFrameToCanonical,
} from "../src/input/CanonicalInput";
import type { CanonicalActionName, CanonicalInputState } from "../src/input/CanonicalInput";

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [[...values]];

  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map(rest => [value, ...rest])
  );
}

describe("CanonicalInput", () => {
  it("creates an empty canonical input state with zeroed axes and empty actions", () => {
    const state = createEmptyCanonicalInputState();
    expect(state.axes).toEqual({ moveX: 0, moveY: 0, aimX: 0, aimY: 0 });
    expect(state.actions.length).toBe(0);
    expect(state.timestamp).toBe(0);
  });

  it("converts CanonicalInputState to InputFrame and back seamlessly", () => {
    const original: CanonicalInputState<"custom"> = {
      axes: { moveX: 0.8, moveY: -0.5, aimX: 1, aimY: 0 },
      actions: ["fire", "boost", "custom"],
      timestamp: 123456789,
    };

    const frame = canonicalToInputFrame(original, 42, 1);
    expect(frame.tick).toBe(42);
    expect(frame.protocolVersion).toBe(1);
    expect(frame.timestamp).toBe(123456789);
    expect(frame.axes).toEqual({ moveX: 0.8, moveY: -0.5, aimX: 1, aimY: 0 });
    expect(frame.actions).toStrictEqual(["boost", "custom", "fire"]);

    const converted = inputFrameToCanonical<"custom">(frame);
    expect(converted.axes).toEqual(original.axes);
    expect(converted.actions).toStrictEqual(["boost", "custom", "fire"]);
    expect(converted.timestamp).toBe(original.timestamp);
  });

  it("emits the same canonical action order for every insertion order of every subset", () => {
    const insertionOrder: readonly CanonicalActionName[] = ["fire", "boost", "left", "rotateRight", "thrust"];
    const canonicalOrder: readonly CanonicalActionName[] = ["boost", "fire", "left", "rotateRight", "thrust"];

    for (let mask = 0; mask < 1 << insertionOrder.length; mask++) {
      const subset = insertionOrder.filter((_, index) => (mask & (1 << index)) !== 0);
      const expectedActions = canonicalOrder.filter(action => subset.includes(action));
      let expectedJson: string | undefined;

      for (const actions of permutations(subset)) {
        const state: CanonicalInputState = {
          axes: { moveX: 0.25, moveY: -0.5, aimX: 0, aimY: 1 },
          actions,
          timestamp: 123456789,
        };

        const frame = canonicalToInputFrame(state, 42, 1);
        expect(frame.actions).toStrictEqual(expectedActions);

        const serialized = JSON.stringify(frame);
        if (expectedJson === undefined) {
          expectedJson = serialized;
        } else {
          expect(serialized).toBe(expectedJson);
        }
      }
    }
  });

  it("round-trips canonical actions and deduplicates repeated actions from a frame", () => {
    const state: CanonicalInputState = {
      axes: { moveX: 0.5, moveY: -0.25, aimX: 0, aimY: 0 },
      actions: ["boost", "fire", "thrust"],
      timestamp: 123,
    };
    const frame = canonicalToInputFrame(state, 7);

    expect(inputFrameToCanonical(frame).actions).toStrictEqual(state.actions);

    const duplicateFrame = {
      ...frame,
      actions: ["thrust", "fire", "fire", "boost", "thrust"],
    };
    expect(inputFrameToCanonical(duplicateFrame).actions).toStrictEqual(state.actions);
  });

  it("does not mutate frozen canonical action arrays", () => {
    const actions = Object.freeze(["thrust", "fire", "boost"] as CanonicalActionName[]);
    const originalActions = [...actions];
    const state: CanonicalInputState = {
      axes: { moveX: 0, moveY: 0, aimX: 0, aimY: 0 },
      actions,
      timestamp: 1,
    };

    expect(() => canonicalToInputFrame(state, 1)).not.toThrow();
    const frame = canonicalToInputFrame(state, 1);

    expect(frame.actions).toStrictEqual(["boost", "fire", "thrust"]);
    expect(state.actions).toBe(actions);
    expect(state.actions).toStrictEqual(originalActions);
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
    expect(canonical.actions.length).toBe(0);
    expect(canonical.timestamp).toBe(0);
  });
});
