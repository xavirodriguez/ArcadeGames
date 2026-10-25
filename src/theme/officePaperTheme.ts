import { createThemeFromGameAccents } from "./gameAccents";
import type { Theme } from "@tiny-aster/core";

/**
 * Theme "Avión de Papel de Oficina" (Oficina 8:47) para Flappy Bird.
 *
 * @remarks
 * Paleta temática inspirada en un avión de papel volando en una oficina solitaria.
 * Utiliza claves de color específicas consumidas por Flappy Bird (`bird`, `pipe`, `ground`).
 */
export const officePaperTheme: Theme = createThemeFromGameAccents("flappy-bird", {
  conceptPack: {
    id: "office-paper",
    name: "Oficina 8:47",
  },
  colorMap: {
    bird: "#FFFFFF",
    pipe: "#475569",
    ground: "#B45309",
    primary: "#FFFFFF",
    secondary: "#D97706",
    accent: "#475569",
  },
  vfxProfile: {
    starDensity: 0,
    starSpeed: 0,
    ambientGlow: 0.1,
    backgroundLayers: [],
  },
  lore: {
    description: "Oficina vacía, 8:47. Avión lanzado por aburrimiento.",
  },
});
