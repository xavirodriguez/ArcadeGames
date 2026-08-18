import React from "react";
import { ShootButton } from "../ShootButton";
import { HyperspaceButton } from "../HyperspaceButton";
import { BackButton } from "../ui/BackButton";
import { PlayerNameInput } from "../ui/PlayerNameInput";

describe("In-Game Controls & Form UI Component Tests", () => {
  it("creates ShootButton React element successfully", () => {
    const element = React.createElement(ShootButton, {
      onPressIn: jest.fn(),
      onPressOut: jest.fn(),
      disabled: false,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(ShootButton);
  });

  it("creates HyperspaceButton React element successfully", () => {
    const element = React.createElement(HyperspaceButton, {
      onPressIn: jest.fn(),
      onPressOut: jest.fn(),
      disabled: false,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(HyperspaceButton);
  });

  it("creates PlayerNameInput React element successfully", () => {
    const element = React.createElement(PlayerNameInput, {
      label: "Pilot Name",
      value: "Jules",
      onChangeText: jest.fn(),
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(PlayerNameInput);
  });

  it("creates BackButton React element successfully", () => {
    const element = React.createElement(BackButton, {
      label: "Menu",
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(BackButton);
  });
});
