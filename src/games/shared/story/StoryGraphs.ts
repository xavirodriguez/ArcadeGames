import { StoryGraph } from "@tiny-aster/core";

export const asteroidsStoryGraph: StoryGraph = {
  id: "asteroids_story_graph",
  title: "Asteroids Story Campaign",
  entryNodeId: "ast_intro_dialogue",
  nodes: {
    ast_intro_dialogue: {
      id: "ast_intro_dialogue",
      type: "dialogue",
      dialogue: {
        id: "diag_ast_intro",
        lines: [
          { textKey: "story.asteroids_intro_1" },
          { textKey: "story.asteroids_intro_2" }
        ]
      },
      transitions: [
        {
          targetNodeId: "ast_gameplay_wave1",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },
    ast_gameplay_wave1: {
      id: "ast_gameplay_wave1",
      type: "gameplay",
      objective: {
        id: "obj_ast_wave1",
        titleKey: "story.obj_clear_asteroids",
        targetCount: 1,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "ast_choice_branch",
          condition: { type: "objective", key: "obj_ast_wave1" }
        }
      ]
    },
    ast_choice_branch: {
      id: "ast_choice_branch",
      type: "choice",
      choices: [
        {
          id: "ast_choice_attack",
          titleKey: "story.choice_attack_title",
          descriptionKey: "story.choice_attack_desc",
          targetNodeId: "ast_cutscene_aggressive"
        },
        {
          id: "ast_choice_stealth",
          titleKey: "story.choice_stealth_title",
          descriptionKey: "story.choice_stealth_desc",
          targetNodeId: "ast_cutscene_stealth"
        }
      ]
    },
    ast_cutscene_aggressive: {
      id: "ast_cutscene_aggressive",
      type: "cutscene",
      isEndNode: true,
      cutscene: {
        id: "cs_ast_aggr",
        transitionEffect: "CRTGlitchTransition"
      }
    },
    ast_cutscene_stealth: {
      id: "ast_cutscene_stealth",
      type: "cutscene",
      isEndNode: true,
      cutscene: {
        id: "cs_ast_stealth",
        transitionEffect: "FadeTransition"
      }
    }
  }
};

export const spaceInvadersStoryGraph: StoryGraph = {
  id: "space_invaders_story_graph",
  title: "Space Invaders Story Campaign",
  entryNodeId: "si_intro_dialogue",
  nodes: {
    si_intro_dialogue: {
      id: "si_intro_dialogue",
      type: "dialogue",
      dialogue: {
        id: "diag_si_intro",
        lines: [
          { textKey: "story.space_invaders_intro_1" }
        ]
      },
      transitions: [
        {
          targetNodeId: "si_gameplay_wave1",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },
    si_gameplay_wave1: {
      id: "si_gameplay_wave1",
      type: "gameplay",
      objective: {
        id: "obj_si_wave1",
        titleKey: "story.obj_defeat_invaders",
        targetCount: 1,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "si_cutscene_victory",
          condition: { type: "objective", key: "obj_si_wave1" }
        }
      ]
    },
    si_cutscene_victory: {
      id: "si_cutscene_victory",
      type: "cutscene",
      isEndNode: true,
      cutscene: {
        id: "cs_si_vic",
        transitionEffect: "DitherTransition"
      }
    }
  }
};

export const pongStoryGraph: StoryGraph = {
  id: "pong_story_graph",
  title: "Pong Cyber League Campaign",
  entryNodeId: "pong_intro_dialogue",
  nodes: {
    pong_intro_dialogue: {
      id: "pong_intro_dialogue",
      type: "dialogue",
      dialogue: {
        id: "diag_pong_intro",
        lines: [
          { textKey: "story.pong_intro_1" }
        ]
      },
      transitions: [
        {
          targetNodeId: "pong_gameplay_match1",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },
    pong_gameplay_match1: {
      id: "pong_gameplay_match1",
      type: "gameplay",
      objective: {
        id: "obj_pong_match1",
        titleKey: "story.obj_win_match",
        targetCount: 1,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "pong_cutscene_champ",
          condition: { type: "objective", key: "obj_pong_match1" }
        }
      ]
    },
    pong_cutscene_champ: {
      id: "pong_cutscene_champ",
      type: "cutscene",
      isEndNode: true,
      cutscene: {
        id: "cs_pong_champ",
        transitionEffect: "RetroGridTransition"
      }
    }
  }
};

export const flappyBirdStoryGraph: StoryGraph = {
  id: "flappy_bird_story_graph",
  title: "Flappy Bird Escape Campaign",
  entryNodeId: "fb_intro_dialogue",
  nodes: {
    fb_intro_dialogue: {
      id: "fb_intro_dialogue",
      type: "dialogue",
      dialogue: {
        id: "diag_fb_intro",
        lines: [
          { textKey: "story.flappy_bird_intro_1" }
        ]
      },
      transitions: [
        {
          targetNodeId: "fb_gameplay_escape",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },
    fb_gameplay_escape: {
      id: "fb_gameplay_escape",
      type: "gameplay",
      objective: {
        id: "obj_fb_pipes",
        titleKey: "story.obj_pass_pipes",
        targetCount: 1,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "fb_cutscene_freedom",
          condition: { type: "objective", key: "obj_fb_pipes" }
        }
      ]
    },
    fb_cutscene_freedom: {
      id: "fb_cutscene_freedom",
      type: "cutscene",
      isEndNode: true,
      cutscene: {
        id: "cs_fb_freedom",
        transitionEffect: "PixelateTransition"
      }
    }
  }
};
