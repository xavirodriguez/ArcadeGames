import type { Theme } from "@tiny-aster/core";
import type { AsteroidsVisualMod } from "../types";
import { ICEBERG_PALETTE } from "./IcebergPalette";
import { createIcebergVerts, type IcebergSize } from "./IcebergGeometry";
import {
  drawIcebergPlayerShip,
  drawIcebergAsteroid,
  drawIcebergBullet
} from "./IcebergCanvasVisuals";
import {
  drawSkiaIcebergPlayerShip,
  drawSkiaIcebergAsteroid,
  drawSkiaIcebergBullet
} from "./IcebergSkiaVisuals";

/**
 * Iceberg visual mod — Borealis / Cristal Glaciar (ART_ICEBERG.md).
 *
 * Phase 0–1: palette, theme, verts.
 * Phase 2: faceted Canvas + Skia drawers (icebreaker, icebergs, thermal beam).
 *
 * @public
 */
export const icebergMod: AsteroidsVisualMod = {
  id: "iceberg",
  displayName: "Iceberg (Borealis)",
  particleStyle: "iceShard",

  createTheme(baseTheme: Theme): Theme {
    return {
      ...baseTheme,
      colorMap: {
        ...baseTheme.colorMap,
        primary: ICEBERG_PALETTE.shipHull,
        secondary: ICEBERG_PALETTE.thermalBeam,
        accent: ICEBERG_PALETTE.hazardAlert,
        player: ICEBERG_PALETTE.shipHull,
        "player-ship": ICEBERG_PALETTE.shipHull,
        bullet: ICEBERG_PALETTE.thermalBeam,
        "player-bullet": ICEBERG_PALETTE.thermalBeam,
        enemy: ICEBERG_PALETTE.iceMid,
        asteroid: ICEBERG_PALETTE.iceMid,
        "asteroid-large": ICEBERG_PALETTE.iceLight,
        "asteroid-medium": ICEBERG_PALETTE.iceMid,
        "asteroid-small": ICEBERG_PALETTE.iceDark,
        boss: ICEBERG_PALETTE.hazardAlert,
        shield: ICEBERG_PALETTE.thermalBeam
      },
      effects: {
        ...baseTheme.effects,
        ambientGlow: 0.15,
        scanlineColor: "rgba(0, 0, 0, 0.08)",
        vignetteOuterColor: "rgba(14, 22, 40, 0.85)"
      },
      vfxProfile: {
        ...baseTheme.vfxProfile,
        starDensity: 0.35,
        starSpeed: 0.25,
        ambientGlow: 0.15,
        particleShape: "shard",
        backgroundLayers: ["starfield"]
      },
      lore: {
        ...baseTheme.lore,
        title: "BOREALIS",
        subtitle: "Rompehielos · Cristal Glaciar"
      },
      conceptPack: {
        id: "iceberg",
        name: "Borealis — Cristal Glaciar",
        roleLabels: {
          player: "ROMPEHIELOS",
          asteroid: "ICEBERG",
          "asteroid-large": "GLACIAR COLOSAL",
          "asteroid-medium": "MEDANO GLACIAR",
          "asteroid-small": "SERAF"
        }
      }
    };
  },

  createAsteroidVerts(size, radius, random) {
    return createIcebergVerts(size as IcebergSize, radius, random);
  },

  registerDrawers(register) {
    register("canvas", "player_ship", drawIcebergPlayerShip as never);
    register("canvas", "asteroid", drawIcebergAsteroid as never);
    register("canvas", "bullet", drawIcebergBullet as never);

    register("skia", "player_ship", drawSkiaIcebergPlayerShip as never);
    register("skia", "asteroid", drawSkiaIcebergAsteroid as never);
    register("skia", "bullet", drawSkiaIcebergBullet as never);
  }
};
