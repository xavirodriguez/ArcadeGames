import { deriveCampaignScreenPhase } from "../useCampaignScreenPhase";
import { NullBaseGame, type StoryNode } from "@tiny-aster/core";

class MockTestGame extends NullBaseGame {
  public override getGameState(): Record<string, unknown> {
    return {};
  }
}

describe("useCampaignScreenPhase Phase Transition Tests", () => {
  const dummyGameplayNode: StoryNode = {
    id: "node_gameplay_1",
    type: "gameplay",
    sceneToLoad: "asteroids"
  };

  const dummyCutsceneNode: StoryNode = {
    id: "node_cutscene_1",
    type: "cutscene",
    cutscene: {
      id: "cutscene_1",
      transitionEffect: "CRTGlitchTransition",
      dialogueQueue: []
    }
  };

  it("derives 'loading' phase during minigame loading", () => {
    const phase = deriveCampaignScreenPhase({
      isLoading: true,
      isIntro: false,
      loadError: null,
      currentNode: dummyGameplayNode,
      activeGame: null,
      targetGameId: "asteroids"
    });

    expect(phase).toEqual({
      kind: "loading",
      targetGameId: "asteroids"
    });
  });

  it("derives 'intro' phase after init and before gameplay simulation starts", () => {
    const phase = deriveCampaignScreenPhase({
      isLoading: false,
      isIntro: true,
      loadError: null,
      currentNode: dummyGameplayNode,
      activeGame: null,
      targetGameId: "asteroids",
      introTitle: "KEPLER ESCAPE",
      introEffect: "CRT_FLASH"
    });

    expect(phase).toEqual({
      kind: "intro",
      targetGameId: "asteroids",
      title: "KEPLER ESCAPE",
      introEffect: "CRT_FLASH"
    });
  });

  it("derives 'gameplay' phase when active game is loaded and running", () => {
    const activeGame = new MockTestGame();
    const phase = deriveCampaignScreenPhase({
      isLoading: false,
      isIntro: false,
      loadError: null,
      currentNode: dummyGameplayNode,
      activeGame: activeGame,
      targetGameId: "asteroids"
    });

    expect(phase).toEqual({
      kind: "gameplay",
      node: dummyGameplayNode
    });
  });

  it("derives 'narrative_intro' phase when presenting full-screen cutscene", () => {
    const phase = deriveCampaignScreenPhase({
      isLoading: false,
      isIntro: false,
      loadError: null,
      currentNode: dummyCutsceneNode,
      activeGame: null
    });

    expect(phase).toEqual({
      kind: "narrative_intro",
      node: dummyCutsceneNode
    });
  });

  it("derives 'error' phase when loading fails", () => {
    const errorObj = new Error("Failed to load minigame");
    const phase = deriveCampaignScreenPhase({
      isLoading: false,
      isIntro: false,
      loadError: { error: errorObj, gameId: "asteroids", seed: 12345 },
      currentNode: dummyGameplayNode,
      activeGame: null
    });

    expect(phase).toEqual({
      kind: "error",
      error: errorObj,
      gameId: "asteroids",
      seed: 12345
    });
  });
});
