import { ShootButton } from "../ShootButton";
import { HyperspaceButton } from "../HyperspaceButton";
import { ActionButton } from "../controls/ActionButton";
import { PongControls } from "../PongControls";

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

jest.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Pan: () => ({
      minDistance: () => ({
        runOnJS: () => ({
          onBegin: () => ({ onFinalize: () => ({}) }),
        }),
      }),
    }),
  },
  GestureDetector: ({ children }: any) => children,
}));

describe("Mobile Controls UX and Accessibility", () => {
  describe("ShootButton", () => {
    it("exports valid ShootButton component", () => {
      expect(typeof ShootButton).toBe("function");
    });
  });

  describe("HyperspaceButton", () => {
    it("exports valid HyperspaceButton component", () => {
      expect(typeof HyperspaceButton).toBe("function");
    });
  });

  describe("ActionButton", () => {
    it("exports valid ActionButton component", () => {
      expect(typeof ActionButton).toBe("function");
    });
  });

  describe("PongControls", () => {
    it("exports valid PongControls component", () => {
      expect(typeof PongControls).toBe("function");
    });
  });
});
