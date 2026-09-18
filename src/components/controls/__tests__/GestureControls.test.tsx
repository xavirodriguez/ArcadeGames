import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { GestureActionButton } from "../GestureActionButton";
import { VirtualJoystick } from "../VirtualJoystick";

// Mock hapticSelection to prevent native dependencies
jest.mock("../../../utils/haptics", () => ({
  hapticSelection: jest.fn(),
}));

// Mock react-native-reanimated worklet helpers if needed
jest.mock("react-native-reanimated", () => {
  const reanimated = require("react-native-reanimated/mock");
  reanimated.runOnJS = (fn: any) => fn;
  return reanimated;
});

describe("Gesture Controls Components", () => {
  describe("GestureActionButton", () => {
    it("renders label and accessibility properties correctly", () => {
      const onPressIn = jest.fn();
      const onPressOut = jest.fn();

      const { getByText } = render(
        <GestureActionButton
          label="TEST_BTN"
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityLabel="Test Button"
          accessibilityHint="Triggers test action"
        />
      );

      expect(getByText("TEST_BTN")).toBeTruthy();
    });
  });

  describe("VirtualJoystick", () => {
    it("renders joystick container correctly", () => {
      const onMove = jest.fn();
      const onRelease = jest.fn();

      const { getByRole } = render(
        <VirtualJoystick
          type="movement"
          onMove={onMove}
          onRelease={onRelease}
          accessibilityLabel="Movement Joystick"
        />
      );

      expect(getByRole("adjustable")).toBeTruthy();
    });
  });
});
