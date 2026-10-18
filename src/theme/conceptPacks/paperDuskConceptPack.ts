import { Theme } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";

/**
 * "Paper Dusk" Concept Pack (Diorama de Papel al Anochecer).
 * Flat paper shapes with ink outlines and hard offset shadows under dusk light.
 */
export const paperDuskConceptPack: Theme = {
  ...createThemeFromGameAccents("tower-defense"),
  colorMap: {
    // New Paper Dusk Tokens
    pd_ground: "#2B2F36",
    pd_buildable: "#3A4049",
    pd_buildableEdge: "#5B6470",
    pd_path: "#D8C3A0",
    pd_pathEdge: "#B39B73",
    pd_decor: "#343A43",
    pd_ink: "#14161B",
    pd_paper: "#F2E9D8",
    pd_text: "#F5F1E8",
    pd_panel: "#1B1E24",
    pd_resource: "#FFD23F",
    pd_shadow: "rgba(0,0,0,0.35)",

    // Re-mapped Tower Defense tokens for Paper Dusk
    tower_basic: "#4C7DFF",
    tower_basic_accent: "#80a3ff",
    tower_sniper: "#9B7BFF",
    tower_sniper_accent: "#c3b2ff",
    tower_rapid: "#4C7DFF",
    tower_rapid_accent: "#80a3ff",
    tower_frost: "#2EC4D6",
    tower_frost_accent: "#80e2ed",
    tower_base_bg: "#F2E9D8",
    tower_projectile: "#FFD23F",
    tower_projectile_frost: "#2EC4D6",

    creep_grunt: "#FF6B5A",
    creep_grunt_stroke: "#14161B",
    creep_fast: "#FFA03A",
    creep_fast_stroke: "#14161B",
    creep_tank: "#E0524C",
    creep_tank_stroke: "#14161B",
    creep_boss: "#E03E65",
    creep_boss_stroke: "#14161B",
    creep_slowed: "#80deea",
    creep_slowed_stroke: "#14161B",
  },
  visualTheme: {
    palette: {
      background: "#2B2F36",
      surface: "#1B1E24",
      primary: "#F2E9D8",
      secondary: "#FFD23F",
      accent: "#FF6B5A",
      neutral: "#F5F1E8",
    },
    accentColors: {
      primary: "#F2E9D8",
      secondary: "#FFD23F",
      accent: "#FF6B5A",
    },
    contrastHierarchy: {
      background: "#2B2F36",
      world: "#1B1E24",
      player: "#F2E9D8",
      enemies: "#FF6B5A",
      fx: "#FFD23F",
      ui: "#F5F1E8",
    },
    roleVisuals: {
      hunter: { color: "#FF6B5A", name: "DUSK GUARD", icon: "🛡" },
      sentinel: { color: "#9B7BFF", name: "SNIPER PERCH", icon: "🎯" },
      support: { color: "#2EC4D6", name: "FROST CITADEL", icon: "❄" },
      pioneer: { color: "#4C7DFF", name: "PAPER BASTION", icon: "🏰" },
    },
  },
  conceptPack: {
    id: "paper_dusk",
    name: "Paper Dusk",
    missionOverrides: {
      defensa_definitiva: {
        title: "Diorama de Papel",
        description: "Defiende el reino de papel al anochecer contra la horda recortada.",
      },
    },
    storyOverrides: {
      chapter_1: {
        title: "El Anochecer de Papel",
        text: "Los ejércitos de tinta recortada avanzan sobre el tablero al atardecer.",
      },
    },
    roleLabels: {
      hunter: "GUARDIA DEL ATARDECER",
      sentinel: "TORRE DE PRECISIÓN",
      support: "FORTALEZA DE HIELO",
      pioneer: "BASTIÓN DE PAPEL",
    },
  },
};
