import {
  canonicalToInputFrame,
  createEmptyCanonicalInputState,
  inputFrameToCanonical,
} from "../CanonicalInput";

describe("serializeInput contract (canonicalToInputFrame)", () => {
  it("produces an object structurally assignable to InputFrame", () => {
    const canonical = createEmptyCanonicalInputState();
    canonical.axes.moveX = 0.5;
    canonical.axes.moveY = -0.5;
    canonical.actions.add("fire");

    const frame = canonicalToInputFrame(canonical, 42);

    expect(typeof frame.protocolVersion).toBe("number");
    expect(frame.tick).toBe(42);
    expect(Array.isArray(frame.actions)).toBe(true);
    expect(frame.actions).toContain("fire");
    expect(frame.axes.moveX).toBe(0.5);
    expect(frame.axes.moveY).toBe(-0.5);
  });

  it("is pure and deterministic: same canonical input yields identical serialized frame", () => {
    const canonical = createEmptyCanonicalInputState();
    canonical.axes.aimX = -0.3;
    canonical.actions.add("fire");
    canonical.actions.add("boost");

    const a = canonicalToInputFrame(canonical, 10);
    const b = canonicalToInputFrame(canonical, 10);

    expect(a).toEqual(b);
  });

  it("never mutates the input CanonicalInputState", () => {
    const canonical = createEmptyCanonicalInputState();
    canonical.actions.add("fire");
    const snapshotActionsSize = canonical.actions.size;

    canonicalToInputFrame(canonical, 1);

    expect(canonical.actions.size).toBe(snapshotActionsSize);
  });

  it("round-trips correctly between canonicalToInputFrame and inputFrameToCanonical", () => {
    const canonical = createEmptyCanonicalInputState();
    canonical.axes.moveX = 0.75;
    canonical.axes.aimY = -0.25;
    canonical.actions.add("secondary");

    const frame = canonicalToInputFrame(canonical, 100);
    const restored = inputFrameToCanonical(frame);

    expect(restored.axes.moveX).toBe(canonical.axes.moveX);
    expect(restored.axes.aimY).toBe(canonical.axes.aimY);
    expect(restored.actions.has("secondary")).toBe(true);
  });
});
