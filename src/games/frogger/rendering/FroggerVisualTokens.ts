/**
 * Semantic art-direction tokens for Frogger's "Hora punta" visual style.
 *
 * Keep these values backend-agnostic: Canvas and Skia drawers consume the same
 * palette so future polish does not drift between renderers.
 */
export const FROGGER_VISUAL_TOKENS = {
  frog: {
    body: "#B6F23C",
    invulnerable: "#C8F66A",
    eyes: "#F2EEE3",
    pupils: "#232338",
    limbs: "#72A83C",
  },
  surfaces: {
    asphalt: "#232338",
    bank: "#E9B949",
    riverDeep: "#0F6E7A",
    riverShallow: "#17A3A3",
    hud: "#1B1B2E",
    waterFlow: "rgba(242, 238, 227, 0.10)",
    laneDivider: "rgba(242, 238, 227, 0.30)",
    medianDivider: "rgba(233, 185, 73, 0.45)",
  },
  logs: {
    body: "#B9824A",
    ring: "#C99560",
    grain: "#74482D",
  },
  turtles: {
    body: "#2F8F7A",
    shell: "#3A6648",
    submerged: "#1E5E5C",
    skin: "#8CBF58",
    warning: "#FF5A4F",
  },
  crocodile: {
    body: "#4C7F5E",
    dorsal: "#3A6648",
    eyes: "#FF5A4F",
  },
  lilyPads: {
    body: "#3FA373",
    free: "#2F8F7A",
    occupied: "#B6F23C",
    flower: "#E9B949",
  },
  vehicles: {
    cars: ["#5B6FB5", "#8B63A8", "#9A9AB8", "#C07A9A", "#7FA6D6"] as const,
    truck: "#C07A9A",
    truckCab: "#F2EEE3",
    glass: "rgba(20, 20, 42, 0.55)",
    tires: "#232338",
    headlights: "#FFF4D0",
    headlightBeam: "rgba(255, 240, 196, 0.25)",
    taillights: "#FF5A4F",
  },
  shadows: {
    color: "rgba(35, 35, 56, 0.28)",
    blur: 3,
    offsetY: 2,
  },
} as const;

/**
 * Reference-only viewport contract from the approved artwork.
 *
 * These values document the target composition; they do not override the ECS
 * simulation's grid/world dimensions or the runtime's measured screen size.
 */
export const FROGGER_VISUAL_REFERENCE = {
  viewport: {
    width: 390,
    height: 844,
    hudHeight: 90,
    playfieldHeight: 754,
  },
  logicalGrid: {
    columns: 20,
    rows: 15,
    cellSize: 40,
  },
} as const;
