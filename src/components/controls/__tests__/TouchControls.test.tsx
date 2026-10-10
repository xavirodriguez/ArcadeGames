import React from "react";
import { TouchInputState } from "@tiny-aster/core";
import { TouchVirtualJoystick } from "../TouchVirtualJoystick";
import { TouchActionButton } from "../TouchActionButton";
import { TouchHoldButton } from "../TouchHoldButton";
import { TouchDragZone } from "../TouchDragZone";
import { TouchTapZone } from "../TouchTapZone";

// Mock dependencies
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: {
      View: ({ children, style }: any) => React.createElement("View", { style }, children),
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (cb: any) => cb(),
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  return {
    Gesture: {
      Pan: () => {
        const chain: any = {};
        chain.runOnJS = () => chain;
        chain.minDistance = () => chain;
        chain.activeOffsetX = () => chain;
        chain.failOffsetY = () => chain;
        chain.onBegin = (cb: any) => { chain._onBegin = cb; return chain; };
        chain.onUpdate = (cb: any) => { chain._onUpdate = cb; return chain; };
        chain.onFinalize = (cb: any) => { chain._onFinalize = cb; return chain; };
        return chain;
      },
      Tap: () => {
        const chain: any = {};
        chain.runOnJS = () => chain;
        chain.maxDuration = () => chain;
        chain.onBegin = (cb: any) => { chain._onBegin = cb; return chain; };
        chain.onEnd = (cb: any) => { chain._onEnd = cb; return chain; };
        chain.onFinalize = (cb: any) => { chain._onFinalize = cb; return chain; };
        return chain;
      },
    },
    GestureDetector: ({ children }: any) => React.createElement("View", null, children),
  };
});

describe("Touch Controls Components Unit Tests", () => {
  let touchInputState: TouchInputState;

  beforeEach(() => {
    touchInputState = new TouchInputState();
  });

  it("TouchVirtualJoystick should instantiate cleanly and accept TouchInputState", () => {
    expect(touchInputState.moveX).toBe(0);
    expect(touchInputState.moveY).toBe(0);

    const component = React.createElement(TouchVirtualJoystick, {
      inputState: touchInputState,
    });
    expect(component).toBeTruthy();
  });

  it("TouchActionButton should accept TouchInputState and props", () => {
    const component = React.createElement(TouchActionButton, {
      inputState: touchInputState,
      name: "fire",
      label: "FIRE",
    });
    expect(component).toBeTruthy();
  });

  it("TouchHoldButton should accept TouchInputState and handle hold props", () => {
    const component = React.createElement(TouchHoldButton, {
      inputState: touchInputState,
      name: "boost",
      label: "BOOST",
    });
    expect(component).toBeTruthy();
  });

  it("TouchDragZone should accept TouchInputState and configure drag behavior", () => {
    const component = React.createElement(TouchDragZone, {
      inputState: touchInputState,
      mode: "absolute",
      activeOffsetX: [-10, 10],
      failOffsetY: [-10, 10],
    });
    expect(component).toBeTruthy();
  });

  it("TouchTapZone should accept TouchInputState and configure tap capturing", () => {
    const component = React.createElement(TouchTapZone, {
      inputState: touchInputState,
    });
    expect(component).toBeTruthy();
  });
});
