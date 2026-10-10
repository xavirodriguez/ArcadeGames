import React from "react";
import { TouchInputState } from "@tiny-aster/core";
import { TouchVirtualJoystick } from "../TouchVirtualJoystick";
import { TouchActionButton } from "../TouchActionButton";
import { TouchHoldButton } from "../TouchHoldButton";
import { TouchDragZone } from "../TouchDragZone";
import { TouchTapZone } from "../TouchTapZone";

jest.mock("@/utils/haptics", () => ({
  hapticSelection: jest.fn(),
  hapticImpactLight: jest.fn(),
  hapticImpactMedium: jest.fn(),
  hapticImpactHeavy: jest.fn(),
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

describe("Touch Controls Components", () => {
  let touchState: TouchInputState;

  beforeEach(() => {
    touchState = new TouchInputState();
  });

  describe("TouchVirtualJoystick", () => {
    it("creates TouchVirtualJoystick element with props", () => {
      const element = React.createElement(TouchVirtualJoystick, {
        touchState: touchState,
        axisTarget: "move",
        accessibilityLabel: "Movement Stick",
      });

      expect(element).toBeTruthy();
      expect(element.props.axisTarget).toBe("move");
      expect(element.props.accessibilityLabel).toBe("Movement Stick");
    });
  });

  describe("TouchActionButton", () => {
    it("creates TouchActionButton element with button name and touchState", () => {
      const element = React.createElement(TouchActionButton, {
        label: "FIRE",
        buttonName: "fire",
        touchState: touchState,
      });

      expect(element).toBeTruthy();
      expect(element.props.label).toBe("FIRE");
      expect(element.props.buttonName).toBe("fire");
    });
  });

  describe("TouchHoldButton", () => {
    it("creates TouchHoldButton element with props", () => {
      const element = React.createElement(TouchHoldButton, {
        label: "HOLD",
        buttonName: "shield",
        touchState: touchState,
      });

      expect(element).toBeTruthy();
      expect(element.props.label).toBe("HOLD");
      expect(element.props.buttonName).toBe("shield");
    });
  });

  describe("TouchDragZone", () => {
    it("creates TouchDragZone element with platformer gesture isolation props", () => {
      const element = React.createElement(TouchDragZone, {
        touchState: touchState,
        activeOffsetX: [-10, 10],
        failOffsetY: [-10, 10],
        mode: "relative",
      });

      expect(element).toBeTruthy();
      expect(element.props.activeOffsetX).toEqual([-10, 10]);
      expect(element.props.failOffsetY).toEqual([-10, 10]);
    });
  });

  describe("TouchTapZone", () => {
    it("creates TouchTapZone element with props", () => {
      const element = React.createElement(TouchTapZone, {
        touchState: touchState,
        longPressMinDuration: 500,
        longPressMaxDistance: 20,
      });

      expect(element).toBeTruthy();
      expect(element.props.longPressMinDuration).toBe(500);
      expect(element.props.longPressMaxDistance).toBe(20);
    });
  });
});
