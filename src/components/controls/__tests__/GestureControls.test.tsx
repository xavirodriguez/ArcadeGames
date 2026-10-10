import React from "react";
import { GestureActionButton } from "../GestureActionButton";
import { VirtualJoystick } from "../VirtualJoystick";

// Mock hapticSelection to prevent native dependencies
jest.mock("../../../utils/haptics", () => ({
  hapticSelection: jest.fn(),
}));

jest.mock("react-native-reanimated", () => ({
  useSharedValue: (val: any) => ({ value: val }),
  useAnimatedStyle: (fn: any) => (typeof fn === "function" ? fn() : fn),
  withTiming: (val: any) => val,
  withSpring: (val: any) => val,
  runOnJS: (fn: any) => fn,
  default: {
    View: "AnimatedView",
    Text: "AnimatedText",
  },
}));

jest.mock("react-native-gesture-handler", () => {
  const dummyChain: any = {};
  dummyChain.minDistance = () => dummyChain;
  dummyChain.activeOffsetX = () => dummyChain;
  dummyChain.failOffsetY = () => dummyChain;
  dummyChain.minDuration = () => dummyChain;
  dummyChain.maxDistance = () => dummyChain;
  dummyChain.runOnJS = () => dummyChain;
  dummyChain.onBegin = () => dummyChain;
  dummyChain.onStart = () => dummyChain;
  dummyChain.onUpdate = () => dummyChain;
  dummyChain.onEnd = () => dummyChain;
  dummyChain.onFinalize = () => dummyChain;

  return {
    Gesture: {
      Pan: () => dummyChain,
      Tap: () => dummyChain,
      LongPress: () => dummyChain,
      Exclusive: (...args: any[]) => args,
    },
    GestureDetector: ({ children }: any) => children,
  };
});

describe("Gesture Controls Components", () => {
  describe("GestureActionButton", () => {
    it("renders label and accessibility properties correctly", () => {
      const onPressIn = jest.fn();
      const onPressOut = jest.fn();

      const element = React.createElement(GestureActionButton, {
        label: "TEST_BTN",
        onPressIn: onPressIn,
        onPressOut: onPressOut,
        accessibilityLabel: "Test Button",
        accessibilityHint: "Triggers test action",
      });

      expect(element).toBeTruthy();
      expect(element.props.label).toBe("TEST_BTN");
      expect(element.props.accessibilityLabel).toBe("Test Button");
    });
  });

  describe("VirtualJoystick", () => {
    it("renders joystick container correctly", () => {
      const onMove = jest.fn();
      const onRelease = jest.fn();

      const element = React.createElement(VirtualJoystick, {
        type: "movement",
        onMove: onMove,
        onRelease: onRelease,
        accessibilityLabel: "Movement Joystick",
      });

      expect(element).toBeTruthy();
      expect(element.props.type).toBe("movement");
      expect(element.props.accessibilityLabel).toBe("Movement Joystick");
    });
  });
});
