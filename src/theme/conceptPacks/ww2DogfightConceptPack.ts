import { Theme, EntityGeometryProfile } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";

/** WW2 Allied Spitfire / P-51 propeller fighter plane geometry */
export const ww2FighterPlaneGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 1, y: 0 },
  muzzleOffset: { x: 1.2, y: 0 },
  exhaustOffset: { x: -0.8, y: 0 },
  motionEffect: "exhaust_smoke",
  scaleMultiplier: 1.1,
  subPaths: [
    // Fuselage
    {
      type: "polyline",
      points: [
        { x: 1.2, y: 0 },
        { x: 0.6, y: 0.25 },
        { x: -0.8, y: 0.2 },
        { x: -1.0, y: 0 },
        { x: -0.8, y: -0.2 },
        { x: 0.6, y: -0.25 },
      ],
      closed: true,
      fillColor: "#4B5320", // Army Olive Drab
      strokeColor: "#2B3310",
      lineWidth: 1.5,
    },
    // Main wings
    {
      type: "polyline",
      points: [
        { x: 0.2, y: -1.2 },
        { x: 0.3, y: 0 },
        { x: 0.2, y: 1.2 },
        { x: -0.2, y: 1.0 },
        { x: -0.1, y: 0 },
        { x: -0.2, y: -1.0 },
      ],
      closed: true,
      fillColor: "#3B4310",
      strokeColor: "#1B2300",
      lineWidth: 1.5,
    },
    // Tail fin / elevator
    {
      type: "polyline",
      points: [
        { x: -0.7, y: -0.5 },
        { x: -0.6, y: 0 },
        { x: -0.7, y: 0.5 },
        { x: -0.9, y: 0 },
      ],
      closed: true,
      fillColor: "#C8102E", // Royal Air Force / Allied tail accent
      strokeColor: "#FFFFFF",
      lineWidth: 1,
    },
    // Cockpit glass canopy
    {
      type: "polyline",
      points: [
        { x: 0.3, y: 0 },
        { x: 0.1, y: 0.15 },
        { x: -0.3, y: 0.12 },
        { x: -0.3, y: -0.12 },
        { x: 0.1, y: -0.15 },
      ],
      closed: true,
      fillColor: "#87CEEB", // Sky Blue
      strokeColor: "#FFFFFF",
      lineWidth: 1,
      alpha: 0.8,
    },
  ],
};

/** WW2 Axis Messerschmitt fighter / Bomber enemy geometry */
export const ww2AxisEnemyGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 0, y: 1 },
  motionEffect: "exhaust_smoke",
  scaleMultiplier: 1.2,
  subPaths: [
    // Iron Cross fuselage
    {
      type: "polyline",
      points: [
        { x: 0, y: 1.1 },
        { x: 0.3, y: 0.4 },
        { x: 0.8, y: 0.1 },
        { x: 0.8, y: -0.2 },
        { x: 0.2, y: -0.6 },
        { x: 0, y: -1.0 },
        { x: -0.2, y: -0.6 },
        { x: -0.8, y: -0.2 },
        { x: -0.8, y: 0.1 },
        { x: -0.3, y: 0.4 },
      ],
      closed: true,
      fillColor: "#555555", // Panzer Grey
      strokeColor: "#FFCC00",
      lineWidth: 1.5,
    },
  ],
};

/** Tracer bullet projectile geometry */
export const ww2TracerBulletGeometry: EntityGeometryProfile = {
  forwardAxis: { x: 1, y: 0 },
  scaleMultiplier: 1.0,
  subPaths: [
    {
      type: "polyline",
      points: [
        { x: 0.8, y: 0 },
        { x: -0.8, y: 0.15 },
        { x: -0.8, y: -0.15 },
      ],
      closed: true,
      fillColor: "#FF5500", // Fiery orange tracer
      strokeColor: "#FFFF00",
      lineWidth: 1.5,
    },
  ],
};

/**
 * WW2 Dogfight Concept Pack object instance.
 * Re-skins player into Allied propeller plane, enemies into Axis aircraft, bullets into tracers,
 * and overrides mission titles and story narrative.
 */
export const ww2DogfightConceptPack: Theme = {
  ...createThemeFromGameAccents("asteroids"),
  colorMap: {
    primary: "#4B5320",
    player: "#4B5320",
    "player-ship": "#4B5320",
    enemy: "#8B0000",
    asteroid: "#555555",
    boss: "#8B0000",
    bullet: "#FF5500",
    "player-bullet": "#FF5500",
    secondary: "#FFCC00",
    accent: "#FF5500",
  },
  visualTheme: {
    palette: {
      background: "#1C2526", // WWII cloudy sky night
      surface: "#2E3B3E",
      primary: "#4B5320",
      secondary: "#FFCC00",
      accent: "#FF5500",
      neutral: "#889999",
    },
    accentColors: {
      primary: "#4B5320",
      secondary: "#FFCC00",
      accent: "#FF5500",
    },
    contrastHierarchy: {
      background: "#1C2526",
      world: "#2E3B3E",
      player: "#4B5320",
      enemies: "#8B0000",
      fx: "#FF5500",
      ui: "#FFCC00",
    },
    shapeTokens: {
      playerGeometry: ww2FighterPlaneGeometry,
      enemyGeometry: ww2AxisEnemyGeometry,
      projectileGeometry: ww2TracerBulletGeometry,
    },
    roleVisuals: {
      hunter: { color: "#FF5500", name: "SQUADRON LEADER", icon: "✈" },
      sentinel: { color: "#00D9FF", name: "AIR DEFENSE", icon: "⯛" },
      support: { color: "#FFCC00", name: "RECON PLANE", icon: "▲" },
      pioneer: { color: "#4B5320", name: "ACE PILOT", icon: "🛩" },
    },
  },
  conceptPack: {
    id: "ww2_dogfight",
    name: "WW2 Dogfight",
    missionOverrides: {
      rey_del_caos: {
        title: "Reina del Humo",
        description: "Derriba un bombardero pesado enemigo y vuela dentro del humo de su explosión durante 5s.",
      },
      supervivencia_extrema: {
        title: "Resistencia Aérea",
        description: "Con daños críticos al motor (1 vida), permanece en combate durante 15 segundos.",
      },
      caza_cercana: {
        title: "Ataque a Bocajarro",
        description: "Destruye un caza pesado enemigo a menos de 100px de tu ala.",
      },
    },
    storyOverrides: {
      chapter_1: {
        title: "Batalla sobre la Mancha",
        text: "Escuadrón 303: cazas enemigos detectados en formación sobre las nubes.",
      },
    },
    roleLabels: {
      hunter: "LÍDER DE ESCUADRÓN",
      sentinel: "DEFENSA ANTIAÉREA",
      support: "RECONOCIMIENTO",
      pioneer: "PILOTO DE CAZA",
    },
  },
};
