import { Theme, EntityGeometryProfile } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";

/** Top-down human survivor avatar geometry */
export const zombieSurvivorGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 1, y: 0 },
  muzzleOffset: { x: 0.8, y: 0.3 },
  exhaustOffset: { x: -0.6, y: 0 },
  motionEffect: "dust_trail",
  scaleMultiplier: 1.0,
  subPaths: [
    // Human body shoulders / torso
    {
      type: "ellipse",
      points: [{ x: 0, y: 0 }],
      ellipseRadiusX: 0.6,
      ellipseRadiusY: 0.8,
      fillColor: "#3A506B", // Tactical vest blue-grey
      strokeColor: "#1C2541",
      lineWidth: 1.5,
    },
    // Head / helmet
    {
      type: "ellipse",
      points: [{ x: 0.1, y: 0 }],
      ellipseRadiusX: 0.4,
      ellipseRadiusY: 0.4,
      fillColor: "#E0AFA0", // Skin tone
      strokeColor: "#0B132B",
      lineWidth: 1.2,
    },
    // Firearm shotgun barrel
    {
      type: "polyline",
      points: [
        { x: 0.2, y: 0.3 },
        { x: 1.0, y: 0.3 },
        { x: 1.0, y: 0.18 },
        { x: 0.2, y: 0.18 },
      ],
      closed: true,
      fillColor: "#111111",
      strokeColor: "#FFD700",
      lineWidth: 1,
    },
  ],
};

/** Shambling decayed zombie enemy geometry */
export const zombieShamblerGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  motionEffect: "dust_trail",
  scaleMultiplier: 1.1,
  subPaths: [
    // Deformed jagged torso
    {
      type: "polyline",
      points: [
        { x: 0.1, y: 0.9 },
        { x: 0.7, y: 0.3 },
        { x: 0.5, y: -0.5 },
        { x: -0.6, y: -0.6 },
        { x: -0.8, y: 0.2 },
        { x: -0.2, y: 0.8 },
      ],
      closed: true,
      fillColor: "#2A9D8F", // Rotting decayed green
      strokeColor: "#E76F51", // Blood red outline
      lineWidth: 1.5,
    },
    // Bloodied outstretched hands
    {
      type: "polyline",
      points: [
        { x: 0.5, y: 0.3 },
        { x: 0.8, y: 0.8 },
        { x: -0.5, y: 0.3 },
        { x: -0.8, y: 0.8 },
      ],
      closed: false,
      fillColor: "#E76F51",
      strokeColor: "#E76F51",
      lineWidth: 2,
    },
  ],
};

/** Gunfire pellet projectile geometry */
export const zombieGunfireGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 1, y: 0 },
  scaleMultiplier: 0.8,
  subPaths: [
    {
      type: "ellipse",
      points: [{ x: 0, y: 0 }],
      ellipseRadiusX: 0.4,
      ellipseRadiusY: 0.4,
      fillColor: "#FFD166", // Glowing yellow pellet
      strokeColor: "#FFFFFF",
      lineWidth: 1,
    },
  ],
};

/**
 * Zombie Survival Concept Pack object instance.
 * Re-skins player into top-down human survivor, enemies into shambling zombies,
 * bullets into gunfire, and overrides mission titles and apocalyptic lore.
 */
export const zombieSurvivalConceptPack: Theme = {
  ...createThemeFromGameAccents("asteroids"),
  colorMap: {
    primary: "#3A506B",
    player: "#3A506B",
    "player-ship": "#3A506B",
    enemy: "#2A9D8F",
    asteroid: "#2A9D8F",
    boss: "#E76F51",
    bullet: "#FFD166",
    "player-bullet": "#FFD166",
    secondary: "#E76F51",
    accent: "#E76F51",
  },
  visualTheme: {
    palette: {
      background: "#0D1B2A", // Toxic night city ruin
      surface: "#1B263B",
      primary: "#3A506B",
      secondary: "#E76F51",
      accent: "#2A9D8F",
      neutral: "#778DA9",
    },
    accentColors: {
      primary: "#3A506B",
      secondary: "#E76F51",
      accent: "#2A9D8F",
    },
    contrastHierarchy: {
      background: "#0D1B2A",
      world: "#1B263B",
      player: "#3A506B",
      enemies: "#2A9D8F",
      fx: "#E76F51",
      ui: "#FFD166",
    },
    shapeTokens: {
      playerGeometry: zombieSurvivorGeometry,
      enemyGeometry: zombieShamblerGeometry,
      projectileGeometry: zombieGunfireGeometry,
    },
    roleVisuals: {
      hunter: { color: "#E76F51", name: "BERSERKER SURVIVOR", icon: "☣" },
      sentinel: { color: "#00D9FF", name: "BARRICADE ENFORCER", icon: "🛡" },
      support: { color: "#FFD166", name: "FIELD MEDIC", icon: "✚" },
      pioneer: { color: "#2A9D8F", name: "LONE SURVIVOR", icon: "🏃" },
    },
  },
  conceptPack: {
    id: "zombie_survival",
    name: "Zombie Survival",
    missionOverrides: {
      rey_del_caos: {
        title: "Zona de Contagio",
        description: "Elimina a una masa zombi y permanece dentro de la niebla tóxica durante 5s.",
      },
      supervivencia_extrema: {
        title: "Último Aliento",
        description: "Con salud crítica (1 vida), resiste el asalto de la horda durante 15 segundos.",
      },
      caza_cercana: {
        title: "Combate Cuerpo a Cuerpo",
        description: "Elimina a un caminante mutante a menos de 100px de distancia.",
      },
    },
    storyOverrides: {
      chapter_1: {
        title: "Infección Urbana",
        text: "Punto de extracción comprometido. Múltiples no-muertos aproximándose.",
      },
    },
    roleLabels: {
      hunter: "SUPERVIVIENTE BERSERKER",
      sentinel: "BARRICADA",
      support: "MÉDICO DE CAMPO",
      pioneer: "SUPERVIVIENTE",
    },
  },
};
