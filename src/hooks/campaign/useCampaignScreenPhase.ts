import type { StoryNode } from "@tiny-aster/core";

/**
 * Discriminated union representing the high-level UI phase of the CampaignScreen.
 *
 * @remarks
 * Encapsulates campaign execution phases to decouple screen layout states:
 * - `narrative_intro`: Full-screen narrative dialogue/cutscene/choice experience before minigame loading.
 * - `loading`: Active minigame loading state transition.
 * - `gameplay`: Active minigame running with diegetic HUD overlay.
 * - `narrative_overlay`: Floating narrative overlay panel superimposed on background minigame canvas.
 * - `error`: Minigame loading failure error screen with retry option.
 * - `ending`: Terminal campaign conclusion screen for end nodes.
 */
export type CampaignScreenPhase =
  | { kind: "narrative_intro"; node: StoryNode }
  | { kind: "loading"; targetGameId: string }
  | { kind: "gameplay"; node: StoryNode }
  | { kind: "narrative_overlay"; node: StoryNode }
  | { kind: "error"; error: Error; gameId: string; seed?: number }
  | { kind: "ending"; node: StoryNode };
