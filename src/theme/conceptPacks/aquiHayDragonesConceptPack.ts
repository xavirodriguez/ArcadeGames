import { Theme, EntityGeometryProfile } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";

/**
 * Aquí hay dragones — Nautical chart concept pack (Space Invaders mod).
 *
 * Art bible: src/games/space-invaders/ARTWORK_theme_alternativo.md
 * Theme id: "aqui_hay_dragones" | alias "nautical-chart"
 *
 * Phase 1 foundation: palette tokens + basic geometry stubs.
 * Full creature/island polish and wind/erosion rules land in later phases.
 */

/** Art-bible palette tokens (section 4.1) */
export const AQUI_HAY_DRAGONES_PALETTE = {
  parchment: "#E8D9B5",
  parchmentLight: "#F4E9CC",
  land: "#CDB88A",
  ink: "#2B2118",
  inkMuted: "#5A4630",
  red: "#B5332E",
  teal: "#2E7F7A",
  parchmentEdge: "#B9A06B",
  creaseLight: "#FFF6DC",
  stain: "#8A6B3A",
  gold: "#C9A227",
} as const;

/** Reference alphas (section 3.3) */
export const AQUI_HAY_DRAGONES_ALPHAS = {
  washRed: 0.6,
  washTeal: 0.8,
  grid: 0.12,
  waves: 0.5,
  shallowWater: 0.6,
  splashOuter: 0.4,
  rhumbLines: 0.06,
  rhumbActive: 0.25,
  soundings: 0.35,
} as const;

/**
 * Galleon (player) — simplified from art bible §14.1.
 * Origin at waterline center; normalized to ~unit box.
 */
export const nauticalGalleonGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: -1 },
  scaleMultiplier: 1.15,
  subPaths: [
    // Hull
    {
      type: "polyline",
      points: [
        { x: -0.7, y: 0 },
        { x: 0.7, y: 0 },
        { x: 0.5, y: 0.4 },
        { x: -0.5, y: 0.4 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.5,
    },
    // Left sail (parchmentLight)
    {
      type: "polyline",
      points: [
        { x: -0.05, y: -0.2 },
        { x: -0.05, y: -1.1 },
        { x: -0.6, y: -0.3 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1,
    },
    // Right sail
    {
      type: "polyline",
      points: [
        { x: 0.05, y: -0.2 },
        { x: 0.05, y: -1.3 },
        { x: 0.6, y: -0.3 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1,
    },
    // Pennant — gold (art bible §22 recommendation; red = hostile)
    {
      type: "polyline",
      points: [
        { x: 0, y: -1.3 },
        { x: 0.35, y: -1.2 },
        { x: 0, y: -1.1 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.gold,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 0.8,
    },
  ],
};

/** Kraken — head + three tentacles (§11.2), ink + red wash roles via colorMap */
export const nauticalKrakenGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.1,
  subPaths: [
    {
      type: "ellipse",
      points: [{ x: 0, y: 0 }],
      ellipseRadiusX: 0.45,
      ellipseRadiusY: 0.45,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.5,
    },
    // Tentacles as polylines (ink silhouette)
    {
      type: "polyline",
      points: [
        { x: -0.3, y: 0.35 },
        { x: -0.45, y: 0.7 },
        { x: -0.55, y: 0.65 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 2,
    },
    {
      type: "polyline",
      points: [
        { x: 0, y: 0.4 },
        { x: 0, y: 0.85 },
        { x: -0.15, y: 0.95 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 2,
    },
    {
      type: "polyline",
      points: [
        { x: 0.3, y: 0.35 },
        { x: 0.45, y: 0.7 },
        { x: 0.55, y: 0.65 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 2,
    },
  ],
};

/** Sea serpent — S body (§11.3) */
export const nauticalSerpentGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 1, y: 0 },
  scaleMultiplier: 1.1,
  subPaths: [
    {
      type: "polyline",
      points: [
        { x: -0.7, y: -0.15 },
        { x: -0.35, y: -0.55 },
        { x: -0.05, y: 0.2 },
        { x: 0.25, y: -0.25 },
        { x: 0.5, y: -0.45 },
        { x: 0.7, y: 0 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 4,
    },
    {
      type: "ellipse",
      points: [{ x: 0.75, y: 0.05 }],
      ellipseRadiusX: 0.2,
      ellipseRadiusY: 0.2,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1,
    },
    // Bifurcated tail
    {
      type: "polyline",
      points: [
        { x: -0.7, y: -0.15 },
        { x: -0.95, y: 0 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.3,
    },
    {
      type: "polyline",
      points: [
        { x: -0.7, y: -0.15 },
        { x: -0.95, y: -0.35 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.3,
    },
  ],
};

/** Shark fin + wave line (§11.4) */
export const nauticalSharkFinGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.1,
  subPaths: [
    {
      type: "polyline",
      points: [
        { x: 0, y: -0.7 },
        { x: 0.55, y: 0.35 },
        { x: -0.55, y: 0.35 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.5,
    },
    {
      type: "polyline",
      points: [
        { x: -0.7, y: 0.45 },
        { x: -0.35, y: 0.25 },
        { x: 0, y: 0.45 },
        { x: 0.35, y: 0.25 },
        { x: 0.7, y: 0.45 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.teal,
      lineWidth: 1.6,
    },
  ],
};

/** Whale / bonus ship (§12.1) */
export const nauticalWhaleGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 1, y: 0 },
  scaleMultiplier: 1.2,
  subPaths: [
    {
      type: "ellipse",
      points: [{ x: 0, y: 0 }],
      ellipseRadiusX: 0.75,
      ellipseRadiusY: 0.32,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.5,
    },
    {
      type: "polyline",
      points: [
        { x: 0.7, y: 0 },
        { x: 1.15, y: -0.35 },
        { x: 1.15, y: 0.35 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.2,
    },
  ],
};

/** Cannon ball (player projectile) */
export const nauticalCannonBallGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: -1 },
  scaleMultiplier: 1.0,
  subPaths: [
    {
      type: "ellipse",
      points: [{ x: 0, y: 0 }],
      ellipseRadiusX: 0.35,
      ellipseRadiusY: 0.35,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1,
    },
  ],
};

/** Enemy harpoon — tip at origin, shaft upward (§15.2 corrected) */
export const nauticalHarpoonGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.0,
  subPaths: [
    {
      type: "polyline",
      points: [
        { x: -0.15, y: -0.9 },
        { x: 0, y: 0 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 1.8,
    },
    {
      type: "polyline",
      points: [
        { x: 0, y: 0 },
        { x: -0.25, y: -0.3 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 1.8,
    },
    {
      type: "polyline",
      points: [
        { x: 0, y: 0 },
        { x: 0.25, y: -0.3 },
      ],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 1.8,
    },
  ],
};

/**
 * Concept pack instance — pass as `theme` to SpaceInvadersGame / BaseGameConfig.
 *
 * Activation (Phase 0 Option A):
 * ```ts
 * import { aquiHayDragonesConceptPack } from "../../theme/conceptPacks";
 * new SpaceInvadersGame({ theme: aquiHayDragonesConceptPack });
 * // or via concept pack id: availableConceptPacks["aqui_hay_dragones"]
 * ```
 */
export const aquiHayDragonesConceptPack: Theme = {
  ...createThemeFromGameAccents("space-invaders"),
  colorMap: {
    // Semantic roles → art-bible tokens
    primary: AQUI_HAY_DRAGONES_PALETTE.ink,
    player: AQUI_HAY_DRAGONES_PALETTE.ink,
    "player-ship": AQUI_HAY_DRAGONES_PALETTE.ink,
    enemy: AQUI_HAY_DRAGONES_PALETTE.red,
    invader: AQUI_HAY_DRAGONES_PALETTE.red,
    invader_scout: AQUI_HAY_DRAGONES_PALETTE.red,
    scout: AQUI_HAY_DRAGONES_PALETTE.red,
    invader_commander: AQUI_HAY_DRAGONES_PALETTE.red,
    commander: AQUI_HAY_DRAGONES_PALETTE.red,
    ufo: AQUI_HAY_DRAGONES_PALETTE.ink,
    bullet: AQUI_HAY_DRAGONES_PALETTE.ink,
    "player-bullet": AQUI_HAY_DRAGONES_PALETTE.ink,
    "enemy-bullet": AQUI_HAY_DRAGONES_PALETTE.red,
    shield: AQUI_HAY_DRAGONES_PALETTE.land,
    secondary: AQUI_HAY_DRAGONES_PALETTE.teal,
    accent: AQUI_HAY_DRAGONES_PALETTE.gold,
    ui: AQUI_HAY_DRAGONES_PALETTE.inkMuted,
    // Extra tokens for drawers that look them up by name
    parchment: AQUI_HAY_DRAGONES_PALETTE.parchment,
    parchmentLight: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
    land: AQUI_HAY_DRAGONES_PALETTE.land,
    ink: AQUI_HAY_DRAGONES_PALETTE.ink,
    inkMuted: AQUI_HAY_DRAGONES_PALETTE.inkMuted,
    red: AQUI_HAY_DRAGONES_PALETTE.red,
    teal: AQUI_HAY_DRAGONES_PALETTE.teal,
    gold: AQUI_HAY_DRAGONES_PALETTE.gold,
  },
  visualTheme: {
    palette: {
      background: AQUI_HAY_DRAGONES_PALETTE.parchment,
      surface: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
      primary: AQUI_HAY_DRAGONES_PALETTE.ink,
      secondary: AQUI_HAY_DRAGONES_PALETTE.teal,
      accent: AQUI_HAY_DRAGONES_PALETTE.red,
      neutral: AQUI_HAY_DRAGONES_PALETTE.inkMuted,
    },
    accentColors: {
      primary: AQUI_HAY_DRAGONES_PALETTE.ink,
      secondary: AQUI_HAY_DRAGONES_PALETTE.teal,
      accent: AQUI_HAY_DRAGONES_PALETTE.red,
    },
    contrastHierarchy: {
      background: AQUI_HAY_DRAGONES_PALETTE.parchment,
      world: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
      player: AQUI_HAY_DRAGONES_PALETTE.ink,
      enemies: AQUI_HAY_DRAGONES_PALETTE.red,
      fx: AQUI_HAY_DRAGONES_PALETTE.teal,
      ui: AQUI_HAY_DRAGONES_PALETTE.inkMuted,
    },
    shapeTokens: {
      playerGeometry: nauticalGalleonGeometry,
      enemyGeometry: nauticalKrakenGeometry,
      projectileGeometry: nauticalCannonBallGeometry,
      customGeometries: {
        invader: nauticalSharkFinGeometry,
        invader_scout: nauticalSerpentGeometry,
        scout: nauticalSerpentGeometry,
        invader_commander: nauticalKrakenGeometry,
        commander: nauticalKrakenGeometry,
        ufo: nauticalWhaleGeometry,
        enemy_bullet: nauticalHarpoonGeometry,
        "enemy-bullet": nauticalHarpoonGeometry,
        player_bullet: nauticalCannonBallGeometry,
        "player-bullet": nauticalCannonBallGeometry,
      },
    },
    roleVisuals: {
      ufo: { color: AQUI_HAY_DRAGONES_PALETTE.ink, name: "BALLENA", icon: "🐋" },
      invader_scout: { color: AQUI_HAY_DRAGONES_PALETTE.teal, name: "SERPIENTE MARINA", icon: "🐍" },
      scout: { color: AQUI_HAY_DRAGONES_PALETTE.teal, name: "SERPIENTE MARINA", icon: "🐍" },
      invader_commander: { color: AQUI_HAY_DRAGONES_PALETTE.red, name: "KRAKEN", icon: "🦑" },
      commander: { color: AQUI_HAY_DRAGONES_PALETTE.red, name: "KRAKEN", icon: "🦑" },
      invader: { color: AQUI_HAY_DRAGONES_PALETTE.red, name: "ALETA", icon: "🦈" },
      hunter: { color: AQUI_HAY_DRAGONES_PALETTE.gold, name: "DRAGÓN MARINO", icon: "🐉" },
      sentinel: { color: AQUI_HAY_DRAGONES_PALETTE.land, name: "ISLA", icon: "🏝" },
      support: { color: AQUI_HAY_DRAGONES_PALETTE.teal, name: "OLEAJE", icon: "🌊" },
      pioneer: { color: AQUI_HAY_DRAGONES_PALETTE.ink, name: "GALEÓN", icon: "⛵" },
    },
  },
  vfxProfile: {
    starDensity: 0,
    starSpeed: 0,
    ambientGlow: 0,
    particleShape: "circle",
    // Phase 1: parchment-only background; chart grid/waves added in Phase 2–4 drawers
    backgroundLayers: ["parchment_chart"],
  },
  effects: {
    scanlineColor: "rgba(0, 0, 0, 0)",
    scanlineSpacing: 0,
    vignetteInnerColor: "rgba(0, 0, 0, 0)",
    vignetteOuterColor: "rgba(43, 33, 24, 0.12)",
    ambientGlow: 0,
  },
  lore: {
    title: "Aquí hay dragones",
    subtitle: "Un convoy de monstruos marinos baja por una carta náutica antigua",
  },
  conceptPack: {
    id: "aqui_hay_dragones",
    name: "Aquí hay dragones",
    roleLabels: {
      ufo: "Ballena",
      scout: "Serpiente marina",
      invader_scout: "Serpiente marina",
      commander: "Kraken",
      invader_commander: "Kraken",
      invader: "Aleta de tiburón",
      hunter: "Dragón marino",
      sentinel: "Isla",
      support: "Oleaje",
      pioneer: "Galeón",
    },
  },
};

/** Alias for roadmap Phase 0 Option A naming */
export const nauticalChartConceptPack = aquiHayDragonesConceptPack;
