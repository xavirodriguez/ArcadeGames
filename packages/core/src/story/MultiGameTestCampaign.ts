import { StoryGraph } from "./StoryTypes";

/**
 * Multi-Game Vertical Slice Campaign Data Definition.
 *
 * @remarks
 * Serves as a canonical test fixture and example story graph demonstrating data-driven narrative flow
 * across multiple game stages (Asteroids and Space Invaders) with cutscenes, objectives, and transitions.
 *
 * @public
 */
export const MultiGameTestCampaign: StoryGraph = {
  id: "multi_game_test_campaign",
  title: "Multi-Game Narrative Campaign",
  entryNodeId: "node_1_intro",
  nodes: {
    node_1_intro: {
      id: "node_1_intro",
      type: "dialogue",
      title: "Intro Cutscene",
      dialogue: {
        id: "diag_intro",
        lines: [
          { textKey: "story.test.intro_cutscene" }
        ]
      },
      transitions: [
        {
          targetNodeId: "node_2_asteroids",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },
    node_2_asteroids: {
      id: "node_2_asteroids",
      type: "gameplay",
      title: "Asteroids Stage",
      sceneToLoad: "asteroids",
      objective: {
        id: "obj_destroy_rocks",
        titleKey: "story.test.destroy_rocks_objective",
        targetCount: 5,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "node_3_victory",
          condition: { type: "objective", key: "obj_destroy_rocks" }
        }
      ]
    },
    node_3_victory: {
      id: "node_3_victory",
      type: "dialogue",
      title: "Victory Overlay",
      dialogue: {
        id: "diag_victory",
        lines: [
          { textKey: "story.test.mission_accomplished" }
        ]
      },
      transitions: [
        {
          targetNodeId: "node_4_space_invaders",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },
    node_4_space_invaders: {
      id: "node_4_space_invaders",
      type: "gameplay",
      title: "Space Invaders Stage",
      sceneToLoad: "space_invaders",
      isEndNode: true
    }
  }
};
