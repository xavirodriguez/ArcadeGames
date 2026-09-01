import React from "react";
import { CampaignScreen } from "../../../components/CampaignScreen";
import { GameDefinitionRegistry } from "@tiny-aster/core";
import { registerDefaultCampaignGames } from "../../../services/CampaignGameRegistryService";

describe("CampaignScreen Component & Resolver Tests", () => {
  beforeAll(() => {
    registerDefaultCampaignGames();
  });

  it("resolves registered GameDefinition for all 7 minigames", () => {
    const gameIds = [
      "asteroids",
      "echorunner",
      "space-invaders",
      "flappybird",
      "pong",
      "geometrywars",
      "platformer"
    ];

    for (const id of gameIds) {
      expect(GameDefinitionRegistry.has(id)).toBe(true);
      const def = GameDefinitionRegistry.resolve(id);
      expect(def).toBeDefined();
      expect(def.name).toBe(id);

      const sim = def.createSimulation(12345);
      expect(sim).toBeDefined();
    }
  });

  it("normalizes legacy gameId strings in GameDefinitionRegistry", () => {
    expect(GameDefinitionRegistry.resolve("space_invaders").name).toBe("space-invaders");
    expect(GameDefinitionRegistry.resolve("spaceinvaders").name).toBe("space-invaders");
    expect(GameDefinitionRegistry.resolve("echo-runner").name).toBe("echorunner");
    expect(GameDefinitionRegistry.resolve("flappy-bird").name).toBe("flappybird");
    expect(GameDefinitionRegistry.resolve("geometry-wars").name).toBe("geometrywars");
  });

  it("throws on unknown gameId in GameDefinitionRegistry", () => {
    expect(() => GameDefinitionRegistry.resolve("non_existent_game")).toThrow(
      /Unknown gameId/
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
