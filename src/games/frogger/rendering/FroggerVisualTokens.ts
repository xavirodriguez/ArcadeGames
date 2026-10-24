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
    belly: "#D5F78A",
    highlight: "#E6FFAB",
  },
  surfaces: {
    asphalt: "#232338",
    bank: "#E9B949",
    riverDeep: "#0F6E7A",
    riverMid: "#16949C",
    riverShallow: "#17A3A3",
    hud: "#1B1B2E",
    bankShadow: "#C18D3A",
    bankHighlight: "#F5D478",
    bankTileLine: "rgba(113, 76, 38, 0.22)",
    roadEdge: "#181824",
    waterFlow: "rgba(242, 238, 227, 0.10)",
    waterGlint: "rgba(242, 238, 227, 0.20)",
    laneDivider: "rgba(242, 238, 227, 0.30)",
    medianDivider: "rgba(113, 76, 38, 0.28)",
  },
  logs: {
    body: "#B9824A",
    ring: "#C99560",
    grain: "#74482D",
    barkHighlight: "#D4A16B",
    endGrain: "#E0B17C",
  },
  turtles: {
    body: "#2F8F7A",
    shell: "#3A6648",
    shellHighlight: "#6AA46A",
    shellLine: "#244D39",
    submerged: "#1E5E5C",
    skin: "#8CBF58",
    warning: "#FF5A4F",
  },
  crocodile: {
    body: "#4C7F5E",
    dorsal: "#3A6648",
    underbelly: "#8CBF58",
    mouth: "#4A3438",
    teeth: "#F2EEE3",
    eyes: "#FF5A4F",
  },
  lilyPads: {
    body: "#3FA373",
    free: "#2F8F7A",
    occupied: "#B6F23C",
    vein: "#287858",
    edge: "#286B50",
    flower: "#E9B949",
    danger: "#FF5A4F",
  },
  vehicles: {
    cars: ["#5B6FB5", "#8B63A8", "#9A9AB8", "#C07A9A", "#7FA6D6"] as const,
    truck: "#F2EEE3",
    truckCab: "#E9B949",
    truckDetail: "#C18D3A",
    glass: "rgba(20, 20, 42, 0.55)",
    tires: "#232338",
    headlights: "#FFF4D0",
    headlightBeam: "rgba(255, 240, 196, 0.18)",
    taillights: "#FF5A4F",
  },
  shadows: {
    color: "rgba(35, 35, 56, 0.28)",
    blur: 3,
    offsetY: 2,
  },
} as const;

/**
 * Rows in the logical board occupied by the visual background zones.
 * Keep these aligned with Frogger's existing 15-row gameplay layout.
 */
export const FROGGER_BACKGROUND_ROWS = {
  goalBank: 0,
  riverStart: 1,
  riverRows: 5,
  median: 6,
  roadStart: 7,
  roadRows: 5,
  startBank: 12,
  startRows: 3,
} as const;

/**
 * Portrait screenshot reference. These values do not override runtime sizing.
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
