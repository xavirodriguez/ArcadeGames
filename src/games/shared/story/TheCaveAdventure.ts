import { StoryGraph } from "../../../../packages/core/src/story/StoryTypes";

/**
 * StoryGraph definition for "The Cave Adventure" text CYOA minigame.
 * Demonstrates simple branching, state mutation (setting flags),
 * condition checks, and terminal/restart nodes.
 */
export const caveAdventureGraph: StoryGraph = {
  id: "cave_adventure_graph",
  title: "The Cave Adventure",
  entryNodeId: "cave_entrance",
  nodes: {
    cave_entrance: {
      id: "cave_entrance",
      type: "choice",
      title: "Cave Entrance",
      dialogue: {
        id: "diag_entrance",
        lines: [
          {
            textKey: "adventure.entrance_desc"
          }
        ]
      },
      choices: [
        {
          id: "choice_search_camp",
          titleKey: "adventure.search_camp_title",
          descriptionKey: "adventure.search_camp_desc",
          targetNodeId: "campsite"
        },
        {
          id: "choice_enter_tunnel",
          titleKey: "adventure.enter_dark_tunnel_title",
          descriptionKey: "adventure.enter_dark_tunnel_desc",
          targetNodeId: "dark_tunnel_check"
        }
      ]
    },
    campsite: {
      id: "campsite",
      type: "choice",
      title: "Abandoned Campsite",
      dialogue: {
        id: "diag_camp",
        lines: [
          {
            textKey: "adventure.campsite_desc"
          }
        ]
      },
      choices: [
        {
          id: "choice_take_torch",
          titleKey: "adventure.take_torch_title",
          descriptionKey: "adventure.take_torch_desc",
          targetNodeId: "take_torch_node"
        }
      ]
    },
    take_torch_node: {
      id: "take_torch_node",
      type: "choice",
      title: "Torch Acquired",
      dialogue: {
        id: "diag_torch",
        lines: [
          {
            textKey: "adventure.took_torch_desc"
          }
        ]
      },
      emitEvent: {
        name: "adventure:torch_acquired",
        payload: { has_torch: true }
      },
      choices: [
        {
          id: "choice_return_to_entrance",
          titleKey: "adventure.return_entrance_title",
          descriptionKey: "adventure.return_entrance_desc",
          targetNodeId: "cave_entrance"
        }
      ]
    },
    dark_tunnel_check: {
      id: "dark_tunnel_check",
      type: "choice",
      title: "Dark Tunnel Edge",
      dialogue: {
        id: "diag_tunnel_edge",
        lines: [
          {
            textKey: "adventure.tunnel_edge_desc"
          }
        ]
      },
      choices: [
        {
          id: "choice_proceed_dark",
          titleKey: "adventure.proceed_dark_title",
          descriptionKey: "adventure.proceed_dark_desc",
          targetNodeId: "trap_room",
          condition: {
            type: "flag",
            key: "has_torch",
            value: false
          }
        },
        {
          id: "choice_proceed_with_torch",
          titleKey: "adventure.proceed_torch_title",
          descriptionKey: "adventure.proceed_torch_desc",
          targetNodeId: "treasure_room",
          condition: {
            type: "flag",
            key: "has_torch",
            value: true
          }
        },
        {
          id: "choice_back_to_camp",
          titleKey: "adventure.back_to_camp_title",
          descriptionKey: "adventure.back_to_camp_desc",
          targetNodeId: "campsite"
        }
      ]
    },
    treasure_room: {
      id: "treasure_room",
      type: "choice",
      title: "Treasure Chamber (Victory)",
      isEndNode: true,
      dialogue: {
        id: "diag_treasure",
        lines: [
          {
            textKey: "adventure.treasure_room_desc"
          }
        ]
      },
      choices: [
        {
          id: "choice_restart_victory",
          titleKey: "adventure.restart_title",
          descriptionKey: "adventure.restart_desc",
          targetNodeId: "cave_entrance"
        }
      ]
    },
    trap_room: {
      id: "trap_room",
      type: "choice",
      title: "Pitch Black Pit (Game Over)",
      isEndNode: true,
      dialogue: {
        id: "diag_trap",
        lines: [
          {
            textKey: "adventure.trap_room_desc"
          }
        ]
      },
      choices: [
        {
          id: "choice_restart_death",
          titleKey: "adventure.restart_title",
          descriptionKey: "adventure.restart_desc",
          targetNodeId: "cave_entrance"
        }
      ]
    }
  }
};
