import { Theme } from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../gameAccents";
import { INK_WORLD_PALETTE } from "../inkWorldPalette";

/**
 * Ink-world reskin of Echo Runner ("The Archive" -> a corrupted sacred archive,
 * reinterpreted in sumi-e ink over parchment). Optional theme, not the game's
 * default: EchoRunnerGame.ts still constructs with
 * createThemeFromGameAccents("echorunner") unless this Theme is explicitly passed
 * via options.theme, same as officePaperTheme.ts is optional for Flappy Bird.
 *
 * backgroundLayers is just ["inkwash_parallax"]: Echo Runner only registers one other
 * background effect, "echo_bg" (drawEchoBackground — skyline, grid and rings all drawn
 * inline under that single name), and it's deliberately excluded here since its
 * skyline silhouette reads as sci-fi, not ink.
 */
export const inkWorldEchoRunnerConceptPack: Theme = createThemeFromGameAccents("echorunner", {
  colorMap: {
    primary: INK_WORLD_PALETTE.ink,
    secondary: INK_WORLD_PALETTE.gold,
    accent: INK_WORLD_PALETTE.threatRed,
    player: INK_WORLD_PALETTE.ink,
    ink: INK_WORLD_PALETTE.ink,
    inkOrOutline: INK_WORLD_PALETTE.ink,
    background: INK_WORLD_PALETTE.parchment,
    archiveVoidDark: INK_WORLD_PALETTE.parchment,
    archiveSlate: INK_WORLD_PALETTE.parchmentAged,
    archiveBorderDark: INK_WORLD_PALETTE.parchmentEdge,
    enemy: INK_WORLD_PALETTE.threatRed,
    fragment: INK_WORLD_PALETTE.energyBlue,
    core: INK_WORLD_PALETTE.gold
  },
  vfxProfile: {
    starDensity: 0,
    starSpeed: 0,
    ambientGlow: 0.1,
    backgroundLayers: ["inkwash_parallax"]
  },
  lore: {
    title: "El Archivo Manchado",
    subtitle: "Un santuario de datos corrompido por la tinta"
  },
  conceptPack: {
    id: "ink_world_echorunner",
    name: "El Archivo Manchado"
  }
});
