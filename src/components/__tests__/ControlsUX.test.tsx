import React from "react";
import { ShootButton } from "../ShootButton";
import { HyperspaceButton } from "../HyperspaceButton";
import { ActionButton } from "../controls/ActionButton";
import { PongControls } from "../PongControls";
import { BackButton } from "../ui/BackButton";
import { PlayerNameInput } from "../ui/PlayerNameInput";

describe("In-Game Controls & Form UI Component Tests", () => {
  it("creates ShootButton React element with props successfully", () => {
    const element = React.createElement(ShootButton, {
      onPressIn: jest.fn(),
      onPressOut: jest.fn(),
      accessibilityLabel: "Fire weapon",
      accessibilityHint: "Fires primary laser cannon",
      disabled: false,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(ShootButton);
    expect(element.props.accessibilityLabel).toBe("Fire weapon");
    expect(element.props.accessibilityHint).toBe("Fires primary laser cannon");
  });

  it("creates HyperspaceButton React element with props successfully", () => {
    const element = React.createElement(HyperspaceButton, {
      onPressIn: jest.fn(),
      onPressOut: jest.fn(),
      accessibilityLabel: "Hyperspace jump",
      accessibilityHint: "Teleports ship randomly",
      disabled: false,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(HyperspaceButton);
    expect(element.props.accessibilityLabel).toBe("Hyperspace jump");
    expect(element.props.accessibilityHint).toBe("Teleports ship randomly");
  });

  it("creates ActionButton React element with props successfully", () => {
    const element = React.createElement(ActionButton, {
      label: "🔥",
      onPressIn: jest.fn(),
      onPressOut: jest.fn(),
      accessibilityLabel: "Action button",
      accessibilityHint: "Triggers primary action",
      disabled: false,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(ActionButton);
    expect(element.props.label).toBe("🔥");
    expect(element.props.accessibilityLabel).toBe("Action button");
  });

  it("creates PongControls React element with dual player options successfully", () => {
    const element = React.createElement(PongControls, {
      onP1Up: jest.fn(),
      onP1Down: jest.fn(),
      onP2Up: jest.fn(),
      onP2Down: jest.fn(),
      showP2Controls: true,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(PongControls);
    expect(element.props.showP2Controls).toBe(true);
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
