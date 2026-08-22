import {
  KeyboardInputProvider,
  GamepadInputProvider,
  VirtualJoystickProvider,
} from "../src/input/providers";

describe("InputProviders", () => {
  describe("KeyboardInputProvider", () => {
    it("captures movement axes and actions from injected key states", () => {
      const provider = new KeyboardInputProvider();

      provider.setKeyState("KeyW", true);
      provider.setKeyState("KeyD", true);
      provider.setKeyState("Space", true);

      const state = provider.getInputState();

      expect(state.axes.moveY).toBe(-1);
      expect(state.axes.moveX).toBe(1);
      expect(state.actions.has("fire")).toBe(true);

      provider.dispose();
    });
  });

  describe("VirtualJoystickProvider", () => {
    it("captures left stick, right stick, and triggers fire when threshold is exceeded", () => {
      const provider = new VirtualJoystickProvider({ fireThreshold: 0.25 });

      provider.setLeftStick(-0.5, 0.8);
      provider.setRightStick(0, 0.5);

      const state = provider.getInputState();

      expect(state.axes.moveX).toBe(-0.5);
      expect(state.axes.moveY).toBe(0.8);
      expect(state.axes.aimY).toBe(0.5);
      expect(state.actions.has("fire")).toBe(true);
    });

    it("does not trigger fire when right stick is within deadzone threshold", () => {
      const provider = new VirtualJoystickProvider({ fireThreshold: 0.25 });

      provider.setRightStick(0.1, 0.1);

      const state = provider.getInputState();

      expect(state.actions.has("fire")).toBe(false);
    });
  });

  describe("GamepadInputProvider", () => {
    it("returns zeroed state gracefully when navigator or gamepad is absent", () => {
      const provider = new GamepadInputProvider();
      const state = provider.getInputState();

      expect(state.axes.moveX).toBe(0);
      expect(state.axes.moveY).toBe(0);
      expect(state.actions.size).toBe(0);
    });
  });
});
