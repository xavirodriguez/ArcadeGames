import React from "react";
import { DailyChallengeBanner } from "../DailyChallengeBanner";
import { DailyResultsOverlay } from "../DailyResultsOverlay";
import { SeedWidget } from "../SeedWidget";
import { DailyChallengeCard } from "../DailyChallengeCard";

jest.mock("../../services/DailyChallengeService", () => ({
  DailyChallengeService: {
    getDailySeed: jest.fn(() => 12345),
    hasTodayAttemptBeenUsed: jest.fn(() => Promise.resolve(false)),
    getDateKey: jest.fn(() => "20250101"),
    getTodayScore: jest.fn(() => Promise.resolve(100)),
  },
}));

jest.mock("../../services/MutatorService", () => ({
  MutatorService: {
    getActiveMutatorsForGame: jest.fn(() => []),
  },
}));

jest.mock("../../utils/haptics", () => ({
  hapticSelection: jest.fn(),
}));

describe("Overlay & Daily Challenge Component Exports and React Element Creation", () => {
  describe("DailyChallengeBanner", () => {
    it("exports valid DailyChallengeBanner component function", () => {
      expect(typeof DailyChallengeBanner).toBe("function");
    });

    it("creates DailyChallengeBanner React element successfully", () => {
      const element = React.createElement(DailyChallengeBanner, {
        gameId: "asteroids",
        onPlay: jest.fn(),
      });
      expect(element).toBeTruthy();
      expect(element.type).toBe(DailyChallengeBanner);
    });
  });

  describe("DailyResultsOverlay", () => {
    it("exports valid DailyResultsOverlay component function", () => {
      expect(typeof DailyResultsOverlay).toBe("function");
    });

    it("creates DailyResultsOverlay React element successfully", () => {
      const element = React.createElement(DailyResultsOverlay, {
        gameId: "asteroids",
        score: 500,
        seed: 12345,
        onClose: jest.fn(),
      });
      expect(element).toBeTruthy();
      expect(element.type).toBe(DailyResultsOverlay);
    });
  });

  describe("SeedWidget", () => {
    it("exports valid SeedWidget component function", () => {
      expect(typeof SeedWidget).toBe("function");
    });

    it("creates SeedWidget React element successfully", () => {
      const element = React.createElement(SeedWidget, {
        seed: 999,
        onSeedEnter: jest.fn(),
      });
      expect(element).toBeTruthy();
      expect(element.type).toBe(SeedWidget);
    });
  });

  describe("DailyChallengeCard", () => {
    it("exports valid DailyChallengeCard component function", () => {
      expect(typeof DailyChallengeCard).toBe("function");
    });

    it("creates DailyChallengeCard React element successfully", () => {
      const element = React.createElement(DailyChallengeCard, {
        onPlay: jest.fn(),
      });
      expect(element).toBeTruthy();
      expect(element.type).toBe(DailyChallengeCard);
    });
  });
});
