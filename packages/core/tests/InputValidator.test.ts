import { InputValidator } from "../src/network/InputValidator";
import { CompactInputFrame } from "../src/input/InputFrame";

describe("Server-side InputValidator security layer", () => {
  it("should validate and sanitise progressive, sequential, and safe input frames", () => {
    const lastTick = 10;

    // 1. Sequential tick is valid
    const validFrame: CompactInputFrame = { t: 11, b: 1, a: [0.5, -0.5] };
    expect(InputValidator.validateFrame(validFrame, lastTick)).toBe(true);

    // 2. Out-of-order or duplicate tick is rejected
    const oldFrame: CompactInputFrame = { t: 9, b: 1 };
    expect(InputValidator.validateFrame(oldFrame, lastTick)).toBe(false);

    const dupFrame: CompactInputFrame = { t: 10, b: 1 };
    expect(InputValidator.validateFrame(dupFrame, lastTick)).toBe(false);

    // 3. Tick skipping (speed hack limit) is rejected
    const leapFrame: CompactInputFrame = { t: 25, b: 1 };
    expect(InputValidator.validateFrame(leapFrame, lastTick, 10)).toBe(false); // Exceeds delta limit of 10

    // 4. Malformed coordinates are rejected
    const nanFrame: CompactInputFrame = { t: 11, b: 1, a: [NaN, 0.5] };
    expect(InputValidator.validateFrame(nanFrame, lastTick)).toBe(false);

    const infFrame: CompactInputFrame = { t: 11, b: 1, a: [0.5, Infinity] };
    expect(InputValidator.validateFrame(infFrame, lastTick)).toBe(false);

    const overflowFrame: CompactInputFrame = { t: 11, b: 1, a: [5.0, 0.5] };
    expect(InputValidator.validateFrame(overflowFrame, lastTick)).toBe(false); // X exceeds limit of 1.1

    // 5. Clamping/Sanitisation works correctly
    const dirtyFrame: CompactInputFrame = { t: 11, b: 1, a: [1.1, -2.0] };
    const cleanFrame = InputValidator.sanitizeFrame(dirtyFrame);
    expect(cleanFrame.a).toBeDefined();
    expect(cleanFrame.a![0]).toBe(1.0); // Clamped to max
    expect(cleanFrame.a![1]).toBe(-1.0); // Clamped to min

    // 6. Sanitising non-finite values defaults axes to zero safely
    const nanAxesFrame: CompactInputFrame = { t: 11, b: 1, a: [NaN, Infinity] };
    const sanitizedNanFrame = InputValidator.sanitizeFrame(nanAxesFrame);
    expect(sanitizedNanFrame.a![0]).toBe(0);
    expect(sanitizedNanFrame.a![1]).toBe(0);
  });
});
