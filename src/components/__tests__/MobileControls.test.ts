import React from "react";
import { ShootButton } from "../ShootButton";
import { HyperspaceButton } from "../HyperspaceButton";
import { ActionButton } from "../controls/ActionButton";
import { PongControls } from "../PongControls";

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
