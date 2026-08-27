import React from "react";
import { StoryRuntime } from "@tiny-aster/core";
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

    const element = React.createElement(NarrativeDashboard, {
      storyRuntime: runtime,
      isVisible,
      onToggle: handleToggle,
    });

    expect(element).toBeTruthy();
    expect(element.props.storyRuntime?.getFlag("heroicEntry")).toBe(true);
    expect(element.props.storyRuntime?.getVariable("spaceinvadersScore")).toBe(6000);
    expect(element.props.storyRuntime?.getCurrentNodeId()).toBe("start_node");
  });
});
