/**
 * Official Color Tokens for Vertical Shmup ("Fantasía aérea anime")
 * Direct implementation of the art direction design document.
 */

export const SHMUP_COLOR_TOKENS = {
  // World & Background Palette
  sky: {
    deep: "#14294F",       // Deep night sky, gaps between clouds, distant space
    mid: "#3477B8",        // Mid cobalt sky and distant mist
    light: "#8FD6F5",      // Luminous sky areas and cloud reflections
  },
  cloud: {
    shadow: "#777FBE",     // Lavender cloud shadows and cold fog
    light: "#FFF4E6",      // Ivory illuminated cloud tops
  },
  foliage: {
    deep: "#235A58",       // Dark forest green in shadow
    mid: "#4BAA91",        // Jade green trees, moss, and floating island vegetation
    light: "#A4E5B6",      // Mint green illuminated leaves and accents
  },
  blossom: "#F5A6D2",      // Pink flowers, floating petals, and ornamental trees
  architecture: "#394A70", // Slate blue stone, roofs, and ancient ruins
  gold: {
    sunlight: "#FFD18A",   // Soft gold sunrays, ceremonial details, and benign magic
  },

  // Combat & Gameplay Palette
  player: {
    primary: "#55E8FF",    // Bright cyan energy contour and main shots
    core: "#F3FCFF",       // Cool white glow center, engines, and high contrast focus
    secondary: "#3F8DFF",  // Electric blue thrusters, shields, and sub-weapons
  },
  enemy: {
    primary: "#302B72",    // Dark indigo main body mass for common enemies
    accent: "#F25DBB",     // Magenta details, glowing eyes, and special enemy cores
  },
  bullet: {
    warm: "#FF6B65",       // Coral basic hostile bullets
    hot: "#FFAA45",        // Fire orange fast / high-threat projectiles
    special: "#FF4FBF",    // Electric pink special attacks and complex bullet fans
  },
  warning: "#FFD166",      // Amber charge warnings, beam lines, and imminent danger
  pickup: "#76F7C5",       // Mint green recovery items and powerup upgrades
  ui: {
    primary: "#EAF5FF",    // Bluish white main HUD text
    secondary: "#A6C3DE",  // Pale blue labels, secondary info, and frames
  },
} as const;

export type ShmupColorTokenKey = typeof SHMUP_COLOR_TOKENS;
