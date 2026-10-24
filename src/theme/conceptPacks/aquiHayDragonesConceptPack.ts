import { Theme, EntityGeometryProfile, Point2D } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";

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

export const WASH_OFFSET: Point2D = { x: -0.08, y: -0.08 };

function offsetPoints(points: Point2D[], o: Point2D = WASH_OFFSET): Point2D[] {
  return points.map((p) => ({ x: p.x + o.x, y: p.y + o.y }));
}

export const nauticalGalleonGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: -1 },
  scaleMultiplier: 1.15,
  subPaths: [
    {
      type: "polyline",
      points: [{ x: -0.7, y: 0 }, { x: 0.7, y: 0 }, { x: 0.5, y: 0.4 }, { x: -0.5, y: 0.4 }],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.5,
    },
    {
      type: "polyline",
      points: [{ x: -0.05, y: -0.2 }, { x: -0.05, y: -1.1 }, { x: -0.6, y: -0.3 }],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1,
    },
    {
      type: "polyline",
      points: [{ x: 0.05, y: -0.2 }, { x: 0.05, y: -1.3 }, { x: 0.6, y: -0.3 }],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchmentLight,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1,
    },
    {
      type: "polyline",
      points: [{ x: 0, y: -1.3 }, { x: 0.35, y: -1.2 }, { x: 0, y: -1.1 }],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.gold,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 0.8,
    },
  ],
};

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
    {
      type: "polyline",
      points: [{ x: -0.3, y: 0.35 }, { x: -0.45, y: 0.7 }, { x: -0.55, y: 0.65 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 2,
    },
    {
      type: "polyline",
      points: [{ x: 0, y: 0.4 }, { x: 0, y: 0.85 }, { x: -0.15, y: 0.95 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 2,
    },
    {
      type: "polyline",
      points: [{ x: 0.3, y: 0.35 }, { x: 0.45, y: 0.7 }, { x: 0.55, y: 0.65 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 2,
    },
    {
      type: "ellipse",
      points: [{ x: WASH_OFFSET.x, y: WASH_OFFSET.y }],
      ellipseRadiusX: 0.36,
      ellipseRadiusY: 0.36,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.red,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 0.5,
      alpha: AQUI_HAY_DRAGONES_ALPHAS.washRed,
    },
    {
      type: "ellipse",
      points: [{ x: -0.16, y: 0 }],
      ellipseRadiusX: 0.09,
      ellipseRadiusY: 0.09,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      lineWidth: 0.5,
    },
    {
      type: "ellipse",
      points: [{ x: 0.16, y: 0 }],
      ellipseRadiusX: 0.09,
      ellipseRadiusY: 0.09,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      lineWidth: 0.5,
    },
  ],
};

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
      type: "polyline",
      points: offsetPoints([
        { x: -0.7, y: -0.15 },
        { x: -0.35, y: -0.55 },
        { x: -0.05, y: 0.2 },
        { x: 0.25, y: -0.25 },
        { x: 0.5, y: -0.45 },
        { x: 0.7, y: 0 },
      ]),
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.teal,
      lineWidth: 2,
      alpha: AQUI_HAY_DRAGONES_ALPHAS.washTeal,
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
    {
      type: "ellipse",
      points: [{ x: 0.82, y: 0 }],
      ellipseRadiusX: 0.06,
      ellipseRadiusY: 0.06,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      lineWidth: 0.5,
    },
    {
      type: "polyline",
      points: [{ x: -0.7, y: -0.15 }, { x: -0.95, y: 0 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.3,
    },
    {
      type: "polyline",
      points: [{ x: -0.7, y: -0.15 }, { x: -0.95, y: -0.35 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.3,
    },
  ],
};

export const nauticalSharkFinGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.1,
  subPaths: [
    {
      type: "polyline",
      points: [{ x: 0, y: -0.7 }, { x: 0.55, y: 0.35 }, { x: -0.55, y: 0.35 }],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.5,
    },
    {
      type: "polyline",
      points: offsetPoints([{ x: 0, y: -0.7 }, { x: 0.55, y: 0.35 }, { x: 0.08, y: 0.35 }]),
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.red,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 0.5,
      alpha: AQUI_HAY_DRAGONES_ALPHAS.washRed,
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
      alpha: AQUI_HAY_DRAGONES_ALPHAS.waves,
    },
  ],
};

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
      points: [{ x: 0.7, y: 0 }, { x: 1.15, y: -0.35 }, { x: 1.15, y: 0.35 }],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.2,
    },
    {
      type: "ellipse",
      points: [{ x: -0.4, y: -0.06 }],
      ellipseRadiusX: 0.06,
      ellipseRadiusY: 0.06,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.parchment,
      lineWidth: 0.5,
    },
  ],
};

export const nauticalIslandGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.0,
  subPaths: [
    {
      type: "polyline",
      points: [
        { x: -0.9, y: 0.1 },
        { x: -0.7, y: -0.5 },
        { x: -0.2, y: -0.7 },
        { x: 0.3, y: -0.55 },
        { x: 0.75, y: -0.15 },
        { x: 0.85, y: 0.35 },
        { x: 0.4, y: 0.55 },
        { x: -0.3, y: 0.6 },
        { x: -0.85, y: 0.4 },
      ],
      closed: true,
      fillColor: AQUI_HAY_DRAGONES_PALETTE.land,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.ink,
      lineWidth: 1.2,
    },
    {
      type: "polyline",
      points: [
        { x: -1.05, y: 0.15 },
        { x: -0.85, y: -0.65 },
        { x: -0.15, y: -0.9 },
        { x: 0.4, y: -0.7 },
        { x: 0.95, y: -0.2 },
        { x: 1.05, y: 0.45 },
        { x: 0.45, y: 0.75 },
        { x: -0.35, y: 0.8 },
        { x: -1.0, y: 0.55 },
      ],
      closed: true,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.teal,
      lineWidth: 1,
      alpha: AQUI_HAY_DRAGONES_ALPHAS.shallowWater,
    },
  ],
};

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

export const nauticalHarpoonGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.0,
  subPaths: [
    {
      type: "polyline",
      points: [{ x: -0.15, y: -0.9 }, { x: 0, y: 0 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 1.8,
    },
    {
      type: "polyline",
      points: [{ x: 0, y: 0 }, { x: -0.25, y: -0.3 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 1.8,
    },
    {
      type: "polyline",
      points: [{ x: 0, y: 0 }, { x: 0.25, y: -0.3 }],
      closed: false,
      strokeColor: AQUI_HAY_DRAGONES_PALETTE.red,
      lineWidth: 1.8,
    },
  ],
};

export const aquiHayDragonesConceptPack: Theme = {
  ...createThemeFromGameAccents("space-invaders"),
  colorMap: {
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
        shield: nauticalIslandGeometry,
        shield_block: nauticalIslandGeometry,
        wall: nauticalIslandGeometry,
        pared: nauticalIslandGeometry,
        paredes: nauticalIslandGeometry,
      },
    },
    roleVisuals: {
      ufo: { color: AQUI_HAY_DRAGONES_PALETTE.ink, name: "BALLENA", icon: "\ud83d\udc0b" },
      invader_scout: { color: AQUI_HAY_DRAGONES_PALETTE.teal, name: "SERPIENTE MARINA", icon: "\ud83d\udc0d" },
      scout: { color: AQUI_HAY_DRAGONES_PALETTE.teal, name: "SERPIENTE MARINA", icon: "\ud83d\udc0d" },
      invader_commander: { color: AQUI_HAY_DRAGONES_PALETTE.red, name: "KRAKEN", icon: "\ud83e\udd91" },
      commander: { color: AQUI_HAY_DRAGONES_PALETTE.red, name: "KRAKEN", icon: "\ud83e\udd91" },
      invader: { color: AQUI_HAY_DRAGONES_PALETTE.red, name: "ALETA", icon: "\ud83e\udd88" },
      hunter: { color: AQUI_HAY_DRAGONES_PALETTE.gold, name: "DRAG\u00d3N MARINO", icon: "\ud83d\udc09" },
      sentinel: { color: AQUI_HAY_DRAGONES_PALETTE.land, name: "ISLA", icon: "\ud83c\udfdd" },
      support: { color: AQUI_HAY_DRAGONES_PALETTE.teal, name: "OLEAJE", icon: "\ud83c\udf0a" },
      pioneer: { color: AQUI_HAY_DRAGONES_PALETTE.ink, name: "GALE\u00d3N", icon: "\u26f5" },
    },
  },
  vfxProfile: {
    starDensity: 0,
    starSpeed: 0,
    ambientGlow: 0,
    particleShape: "circle",
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
    title: "Aqu\u00ed hay dragones",
    subtitle: "Un convoy de monstruos marinos baja por una carta n\u00e1utica antigua",
  },
  conceptPack: {
    id: "aqui_hay_dragones",
    name: "Aqu\u00ed hay dragones",
    roleLabels: {
      ufo: "Ballena",
      scout: "Serpiente marina",
      invader_scout: "Serpiente marina",
      commander: "Kraken",
      invader_commander: "Kraken",
      invader: "Aleta de tibur\u00f3n",
      hunter: "Drag\u00f3n marino",
      sentinel: "Isla",
      support: "Oleaje",
      pioneer: "Gale\u00f3n",
    },
  },
};

export const nauticalChartConceptPack = aquiHayDragonesConceptPack;
