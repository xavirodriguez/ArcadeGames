import { canonicalToInputFrame, inputFrameToCanonical, CanonicalInputState } from "../src/input/CanonicalInput";
import { KeyboardInputProvider } from "../src/input/providers/KeyboardInputProvider";
import { GamepadInputProvider } from "../src/input/providers/GamepadInputProvider";
import { VirtualJoystickProvider } from "../src/input/providers/VirtualJoystickProvider";

describe("CanonicalInput Translation & Provider Integration", () => {
  it("serializa y deserializa CanonicalInputState <-> InputFrame sin pérdida", () => {
    const canonical: CanonicalInputState = {
      axes: { moveX: -0.707, moveY: 0.707, aimX: 1, aimY: 0 },
      actions: new Set(["fire", "boost"]),
      timestamp: 123456789,
    };

    const frame = canonicalToInputFrame(canonical, 1, 42);
    expect(frame.protocolVersion).toBe(1);
    expect(frame.tick).toBe(42);
    expect(frame.timestamp).toBe(123456789);
    expect(frame.axes.moveX).toBe(-0.707);
    expect(frame.actions).toContain("fire");
    expect(frame.actions).toContain("boost");

    const restored = inputFrameToCanonical(frame);
    expect(restored.axes.moveX).toBe(-0.707);
    expect(restored.axes.moveY).toBe(0.707);
    expect(restored.axes.aimX).toBe(1);
    expect(restored.actions.has("fire")).toBe(true);
    expect(restored.actions.has("boost")).toBe(true);
  });

  it("KeyboardInputProvider genera CanonicalInputState correcto", () => {
    const kbd = new KeyboardInputProvider();
    kbd.handleKeyDown("KeyA");
    kbd.handleKeyDown("KeyW");
    kbd.handleKeyDown("Space");

    const state = kbd.poll();
    expect(state.axes.moveX).toBeCloseTo(-0.707);
    expect(state.axes.moveY).toBeCloseTo(-0.707);
    expect(state.actions.has("fire")).toBe(true);

    kbd.handleKeyUp("Space");
    const state2 = kbd.poll();
    expect(state2.actions.has("fire")).toBe(false);
  });

  it("GamepadInputProvider normaliza deadzone y mapea botones", () => {
    const gp = new GamepadInputProvider(0.1);
    const state = gp.parseGamepad({
      axes: [0.05, -0.5, 0, 0],
      buttons: [{ pressed: true, value: 1 }],
    });

    // 0.05 esta dentro de deadzone 0.1 -> 0
    expect(state.axes.moveX).toBe(0);
    expect(state.axes.moveY).toBeLessThan(0);
    expect(state.actions.has("fire")).toBe(true);
  });

  it("VirtualJoystickProvider mapea joysticks y gatilla fire al superar umbral", () => {
    const vj = new VirtualJoystickProvider(0.5);
    vj.updateLeftStick(0.8, -0.6);
    vj.updateRightStick(0, 0.4); // mag 0.4 < threshold 0.5

    let state = vj.poll();
    expect(state.axes.moveX).toBe(0.8);
    expect(state.actions.has("fire")).toBe(false);

    vj.updateRightStick(0, 0.8); // mag 0.8 >= threshold 0.5
    state = vj.poll();
    expect(state.actions.has("fire")).toBe(true);
  });
});
