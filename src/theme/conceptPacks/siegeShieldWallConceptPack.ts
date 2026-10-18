import { Theme, EntityGeometryProfile } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";

/** Player Ballista on rail geometry for Siege Shield Wall */
export const siegeBallistaGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: -1 },
  scaleMultiplier: 1.1,
  subPaths: [
    // Wooden base frame on rail
    {
      type: "polyline",
      points: [
        { x: -0.6, y: 0.2 },
        { x: 0.6, y: 0.2 },
        { x: 0.5, y: 0.5 },
        { x: -0.5, y: 0.5 },
      ],
      closed: true,
      fillColor: "#5C4033", // Dark wood
      strokeColor: "#B87333", // Bronze trim
      lineWidth: 1.5,
    },
    // V-shaped ballista bow arc
    {
      type: "polyline",
      points: [
        { x: -0.9, y: 0.1 },
        { x: 0, y: -0.3 },
        { x: 0.9, y: 0.1 },
        { x: 0.7, y: -0.05 },
        { x: 0, y: -0.4 },
        { x: -0.7, y: -0.05 },
      ],
      closed: true,
      fillColor: "#B87333", // Bronze
      strokeColor: "#FFCC00",
      lineWidth: 1.5,
    },
    // Rail arm / barrel
    {
      type: "polyline",
      points: [
        { x: -0.12, y: -0.8 },
        { x: 0.12, y: -0.8 },
        { x: 0.15, y: 0.4 },
        { x: -0.15, y: 0.4 },
      ],
      closed: true,
      fillColor: "#8B5A2B",
      strokeColor: "#B87333",
      lineWidth: 1.2,
    },
    // Incandescent bolt ready on shaft
    {
      type: "polyline",
      points: [
        { x: 0, y: -0.95 },
        { x: 0.08, y: -0.5 },
        { x: 0.08, y: 0.1 },
        { x: -0.08, y: 0.1 },
        { x: -0.08, y: -0.5 },
      ],
      closed: true,
      fillColor: "#FFE135", // Incandescent yellow
      strokeColor: "#FF6A00",
      lineWidth: 1,
    },
  ],
};

/** Line Scutarius solid shield geometry */
export const siegeLineInvaderGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.0,
  subPaths: [
    // Main rectangular shield body
    {
      type: "polyline",
      points: [
        { x: -0.7, y: -0.8 },
        { x: 0.7, y: -0.8 },
        { x: 0.8, y: 0.7 },
        { x: -0.8, y: 0.7 },
      ],
      closed: true,
      fillColor: "#8B0000", // Crimson
      strokeColor: "#550000",
      lineWidth: 1.5,
    },
    // Inner border frame
    {
      type: "polyline",
      points: [
        { x: -0.55, y: -0.65 },
        { x: 0.55, y: -0.65 },
        { x: 0.65, y: 0.55 },
        { x: -0.65, y: 0.55 },
      ],
      closed: true,
      fillColor: "#700000",
      strokeColor: "#B8860B",
      lineWidth: 1.2,
    },
    // Central shield boss (umbilicus)
    {
      type: "polyline",
      points: [
        { x: 0, y: -0.3 },
        { x: 0.3, y: 0 },
        { x: 0, y: 0.3 },
        { x: -0.3, y: 0 },
      ],
      closed: true,
      fillColor: "#B8860B", // Dark gold
      strokeColor: "#FFCC00",
      lineWidth: 1,
    },
  ],
};

/** Scout / skirmisher light shield with top crest geometry */
export const siegeScoutGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.0,
  subPaths: [
    // Light shield body
    {
      type: "polyline",
      points: [
        { x: -0.6, y: -0.5 },
        { x: 0.6, y: -0.5 },
        { x: 0.5, y: 0.6 },
        { x: 0, y: 0.85 },
        { x: -0.5, y: 0.6 },
      ],
      closed: true,
      fillColor: "#C0392B", // Light crimson
      strokeColor: "#900C3F",
      lineWidth: 1.5,
    },
    // Red crest top ornament
    {
      type: "polyline",
      points: [
        { x: 0, y: -0.9 },
        { x: 0.25, y: -0.5 },
        { x: -0.25, y: -0.5 },
      ],
      closed: true,
      fillColor: "#FF5733",
      strokeColor: "#FFFFFF",
      lineWidth: 1,
    },
  ],
};

/** Commander / Heavy Infantry large shield with double frame geometry */
export const siegeCommanderGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.15,
  subPaths: [
    // Outer shield frame
    {
      type: "polyline",
      points: [
        { x: -0.85, y: -0.85 },
        { x: 0.85, y: -0.85 },
        { x: 0.9, y: 0.8 },
        { x: 0, y: 1.0 },
        { x: -0.9, y: 0.8 },
      ],
      closed: true,
      fillColor: "#B8860B", // Dark gold
      strokeColor: "#D4A017",
      lineWidth: 1.5,
    },
    // Inner crimson panel
    {
      type: "polyline",
      points: [
        { x: -0.65, y: -0.65 },
        { x: 0.65, y: -0.65 },
        { x: 0.7, y: 0.6 },
        { x: 0, y: 0.8 },
        { x: -0.7, y: 0.6 },
      ],
      closed: true,
      fillColor: "#8B0000",
      strokeColor: "#FFCC00",
      lineWidth: 1.2,
    },
    // Central commander insignia
    {
      type: "polyline",
      points: [
        { x: 0, y: -0.35 },
        { x: 0.35, y: 0 },
        { x: 0, y: 0.35 },
        { x: -0.35, y: 0 },
      ],
      closed: true,
      fillColor: "#FFE135",
      strokeColor: "#FF6A00",
      lineWidth: 1.2,
    },
  ],
};

/** Banner bearer (UFO) staff + rectangular banner geometry */
export const siegeBannerGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  scaleMultiplier: 1.25,
  subPaths: [
    // Vertical staff
    {
      type: "polyline",
      points: [
        { x: -0.5, y: -0.95 },
        { x: -0.4, y: -0.95 },
        { x: -0.4, y: 0.95 },
        { x: -0.5, y: 0.95 },
      ],
      closed: true,
      fillColor: "#D4A017",
      strokeColor: "#B8860B",
      lineWidth: 1.5,
    },
    // Rectangular banner cloth
    {
      type: "polyline",
      points: [
        { x: -0.4, y: -0.8 },
        { x: 0.8, y: -0.8 },
        { x: 0.7, y: 0.3 },
        { x: -0.4, y: 0.5 },
      ],
      closed: true,
      fillColor: "#8B0000", // Crimson banner
      strokeColor: "#FFE135",
      lineWidth: 1.5,
    },
    // Banner golden emblem
    {
      type: "ellipse",
      points: [{ x: 0.2, y: -0.25 }],
      ellipseRadiusX: 0.25,
      ellipseRadiusY: 0.25,
      fillColor: "#D4A017",
      strokeColor: "#FFCC00",
      lineWidth: 1.2,
    },
  ],
};

/** Incandescent bolt projectile geometry */
export const siegeBoltGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: -1 },
  scaleMultiplier: 1.0,
  subPaths: [
    // Bolt shaft
    {
      type: "polyline",
      points: [
        { x: 0, y: -0.9 },
        { x: 0.15, y: 0 },
        { x: 0.08, y: 0.9 },
        { x: -0.08, y: 0.9 },
        { x: -0.15, y: 0 },
      ],
      closed: true,
      fillColor: "#FFE135", // Incandescent bolt
      strokeColor: "#FF6A00",
      lineWidth: 1.5,
    },
  ],
};

/**
 * Siege Shield Wall Concept Pack instance ("Asedio de la Muralla de Escudos").
 * Re-skins Space Invaders into a Roman/Classical siege defense against a phalanx of shielded enemies.
 */
export const siegeShieldWallConceptPack: Theme = {
  ...createThemeFromGameAccents("space-invaders"),
  colorMap: {
    primary: "#E6B800",
    player: "#B87333",
    "player-ship": "#B87333",
    enemy: "#8B0000",
    invader: "#8B0000",
    invader_scout: "#C0392B",
    scout: "#C0392B",
    invader_commander: "#B8860B",
    commander: "#B8860B",
    ufo: "#D4A017",
    bullet: "#FFE135",
    "player-bullet": "#FFE135",
    "enemy-bullet": "#FF3D00",
    shield: "#6B5D4F",
    secondary: "#FFCC00",
    accent: "#FF6A00",
    ui: "#E6B800",
  },
  visualTheme: {
    palette: {
      background: "#1E1B18",
      surface: "#2A2520",
      primary: "#E6B800",
      secondary: "#FFCC00",
      accent: "#FF6A00",
      neutral: "#6B5D4F",
    },
    accentColors: {
      primary: "#E6B800",
      secondary: "#FFCC00",
      accent: "#FF6A00",
    },
    contrastHierarchy: {
      background: "#1E1B18",
      world: "#2A2520",
      player: "#B87333",
      enemies: "#8B0000",
      fx: "#FF6A00",
      ui: "#E6B800",
    },
    shapeTokens: {
      playerGeometry: siegeBallistaGeometry,
      enemyGeometry: siegeLineInvaderGeometry,
      projectileGeometry: siegeBoltGeometry,
      customGeometries: {
        invader: siegeLineInvaderGeometry,
        invader_scout: siegeScoutGeometry,
        scout: siegeScoutGeometry,
        invader_commander: siegeCommanderGeometry,
        commander: siegeCommanderGeometry,
        ufo: siegeBannerGeometry,
      },
    },
    roleVisuals: {
      ufo: { color: "#D4A017", name: "PORTADOR DE ESTANDARTE", icon: "🚩" },
      invader_scout: { color: "#C0392B", name: "HOSTIGADOR", icon: "🗡" },
      scout: { color: "#C0392B", name: "HOSTIGADOR", icon: "🗡" },
      invader_commander: { color: "#B8860B", name: "INFANTERÍA PESADA", icon: "🛡" },
      commander: { color: "#B8860B", name: "INFANTERÍA PESADA", icon: "🛡" },
      invader: { color: "#8B0000", name: "ESCUTARIO DE LÍNEA", icon: "🛡" },
      hunter: { color: "#B8860B", name: "CENTURIÓN", icon: "⚔" },
      sentinel: { color: "#6B5D4F", name: "GUARDIA DE MURALLA", icon: "🧱" },
      support: { color: "#FFE135", name: "ARQUERO AUXILIAR", icon: "🏹" },
      pioneer: { color: "#B87333", name: "BALISTERO", icon: "🏹" },
    },
  },
  vfxProfile: {
    starDensity: 0.1,
    backgroundLayers: ["stone_courtyard", "soft_fog"],
    particleShape: "shard",
    ambientGlow: 0.2,
  },
  lore: {
    title: "Asedio de la Muralla de Escudos",
    subtitle: "Defiende el baluarte contra la falange blindada",
  },
  conceptPack: {
    id: "siege_shield_wall",
    name: "Asedio de la Muralla de Escudos",
    roleLabels: {
      ufo: "Portador de Estandarte",
      scout: "Hostigador",
      invader_scout: "Hostigador",
      commander: "Infantería Pesada",
      invader_commander: "Infantería Pesada",
      invader: "Escutario de Línea",
      hunter: "Centurión",
      sentinel: "Guardia de Muralla",
      support: "Arquero Auxiliar",
      pioneer: "Balistero",
    },
  },
};
