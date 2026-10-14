import type { StoryNode, BaseGame, IGame } from "@tiny-aster/core";

/**
 * Discriminated union representing the high-level UI phase of the CampaignScreen.
 *
 * @remarks
 * Encapsulates campaign execution phases to decouple screen layout states:
 * - `narrative_intro`: Full-screen narrative dialogue/cutscene/choice experience before minigame loading.
 * - `loading`: Active minigame loading state transition.
 * - `intro`: Brief minigame intro banner transition before simulation execution.
 * - `gameplay`: Active minigame running with diegetic HUD overlay.
 * - `narrative_overlay`: Floating narrative overlay panel superimposed on background minigame canvas.
 * - `error`: Minigame loading failure error screen with retry option.
 * - `ending`: Terminal campaign conclusion screen for end nodes.
 *
 * @public
 */
export type CampaignScreenPhase =
  | { kind: "narrative_intro"; node: StoryNode }
  | { kind: "loading"; targetGameId: string }
  | { kind: "intro"; targetGameId: string; title?: string; introEffect?: string }
  | { kind: "gameplay"; node: StoryNode }
  | { kind: "narrative_overlay"; node: StoryNode }
  | { kind: "error"; error: Error; gameId: string; seed?: number }
  | { kind: "ending"; node: StoryNode };

/**
 * Derives the active CampaignScreenPhase based on current campaign runtime state.
 *
 * @param params - Runtime state parameters.
 * @returns Derived CampaignScreenPhase object.
 * @public
 */
export function deriveCampaignScreenPhase(params: {
  isLoading: boolean;
  isIntro: boolean;
  loadError: { error: Error; gameId: string; seed?: number } | null;
  currentNode: StoryNode | null;
  activeGame: BaseGame | IGame | null;
  targetGameId?: string;
  introTitle?: string;
  introEffect?: string;
}): CampaignScreenPhase {
  const { isLoading, isIntro, loadError, currentNode, activeGame, targetGameId, introTitle, introEffect } = params;

  if (loadError) {
    return { kind: "error", error: loadError.error, gameId: loadError.gameId, seed: loadError.seed };
  }

  if (isLoading) {
    return { kind: "loading", targetGameId: targetGameId || "minigame" };
  }

  if (isIntro) {
    return { kind: "intro", targetGameId: targetGameId || "minigame", title: introTitle, introEffect };
  }

  if (!currentNode) {
    return { kind: "loading", targetGameId: targetGameId || "minigame" };
  }

  if (currentNode.isEndNode || currentNode.meta?.isEndNode) {
    return { kind: "ending", node: currentNode };
  }

  if (currentNode.type === "gameplay") {
    return { kind: "gameplay", node: currentNode };
  }

  if (activeGame) {
    return { kind: "narrative_overlay", node: currentNode };
  }

  return { kind: "narrative_intro", node: currentNode };
}

/**
 * Hook wrapping deriveCampaignScreenPhase to track active CampaignScreenPhase state.
 *
 * @param params - Runtime state parameters.
 * @returns Derived CampaignScreenPhase object.
 * @public
 */
export function useCampaignScreenPhase(params: {
  isLoading: boolean;
  isIntro: boolean;
  loadError: { error: Error; gameId: string; seed?: number } | null;
  currentNode: StoryNode | null;
  activeGame: BaseGame | IGame | null;
  targetGameId?: string;
  introTitle?: string;
  introEffect?: string;
}): CampaignScreenPhase {
  return deriveCampaignScreenPhase(params);
}
