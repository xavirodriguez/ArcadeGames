/**
 * LAYER_ELEVATION design system tokens for controlling zIndex hierarchy across the arcade engine.
 */
export const LAYER_ELEVATION = {
  /** Background canvas & gameplay simulation rendering */
  CANVAS: 0,
  /** Static HUD surfaces, score, health counters */
  HUD_SURFACE: 10,
  /** Interactive HUD controls like in-game pause/menu buttons */
  HUD_INTERACTIVES: 100,
  /** Touch joysticks, virtual d-pads, and action buttons */
  CONTROLS: 15,
  /** Pause and transitional overlays */
  PAUSE_OVERLAY: 1000,
  /** Fullscreen modal dialogues, game over screens, leaderboards */
  MODAL_OVERLAY: 2000,
  /** Engine performance metrics and debug overlay */
  DEBUG_OVERLAY: 9999,
} as const;

export type LayerElevationLevel = keyof typeof LAYER_ELEVATION | number;
