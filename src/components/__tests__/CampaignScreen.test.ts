import React from "react";
import { CampaignScreen } from "../CampaignScreen";
import { CampaignGameResolver } from "@tiny-aster/core";

describe("CampaignScreen Component & Resolver Tests", () => {
  it("resolves registered games or throws on unknown gameId", () => {
    const echoGame = CampaignGameResolver.resolveGame("echorunner");
    expect(echoGame).toBeDefined();

    const spaceGame = CampaignGameResolver.resolveGame("space-invaders");
    expect(spaceGame).toBeDefined();

    expect(() => CampaignGameResolver.resolveGame("non_existent_game")).toThrow(
      /Unknown campaign gameId/
    );
  });

  it("creates CampaignScreen React element with default props", () => {
    const element = React.createElement(CampaignScreen, {
      slotId: "test_slot",
      defaultGameId: "echorunner"
    });

    expect(element).toBeTruthy();
    expect(element.type).toBe(CampaignScreen);
  });
});
