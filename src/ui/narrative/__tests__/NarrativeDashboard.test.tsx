import React from "react";
import { StoryRuntime, MiniGameResult, StoryEffect } from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "../../../games/shared/story/ProofOfConceptStoryGraph";
import { NarrativeDashboard } from "../NarrativeDashboard";

describe("NarrativeDashboard Component", () => {
  it("should instantiate NarrativeDashboard props and inspect story runtime state", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.setFlag("heroicEntry", true);
    runtime.setVariable("spaceinvadersScore", 6000);

    let isVisible = true;
    const handleToggle = () => {
      isVisible = !isVisible;
    };

    const mockResult: MiniGameResult = {
      runId: "run_test_123",
      gameId: "asteroids",
      score: 2500,
      completed: true,
      durationMs: 45000,
      metrics: { collisions: 1, asteroidsDestroyed: 20 },
      secretsFound: ["black_box_fragment"]
    };

    const mockEffects: StoryEffect[] = [
      { type: "setFlag", key: "asteroidsPerfect", value: true },
      { type: "incrementVariable", key: "asteroidLevelReached", amount: 1 }
    ];

    const element = React.createElement(NarrativeDashboard, {
      storyRuntime: runtime,
      isVisible,
      onToggle: handleToggle,
      lastResult: mockResult,
      lastAppliedEffects: mockEffects
    });

    expect(element).toBeTruthy();
    expect(element.props.storyRuntime?.getFlag("heroicEntry")).toBe(true);
    expect(element.props.storyRuntime?.getVariable("spaceinvadersScore")).toBe(6000);
    expect(element.props.storyRuntime?.getCurrentNodeId()).toBe("act1_asteroids_gameplay");
    expect(element.props.lastResult?.gameId).toBe("asteroids");
    expect(element.props.lastResult?.score).toBe(2500);
    expect(element.props.lastAppliedEffects?.length).toBe(2);
  });
});
