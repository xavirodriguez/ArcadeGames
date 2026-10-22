import type { Theme } from "@tiny-aster/core";
import type { AsteroidsVisualMod } from "../types";
import { ICEBERG_PALETTE } from "./IcebergPalette";
import {
  drawAsteroidsPlayerShip as canvasDrawAsteroidsPlayerShip,
  drawAsteroidsAsteroid as canvasDrawAsteroidsAsteroid,
  drawAsteroidsBullet as canvasDrawAsteroidsBullet
} from "../../rendering/AsteroidsCanvasVisuals";
import {
  drawSkiaAsteroidsPlayerShip as skiaDrawAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid as skiaDrawAsteroidsAsteroid,
  drawSkiaAsteroidsBullet as skiaDrawAsteroidsBullet
} from "../../rendering/AsteroidsSkiaVisuals";

/**
 * Iceberg visual mod — polar / cristal glaciar direction (ART_ICEBERG.md).
 *
 * Phase 1 (this PR): palette + theme override. Drawers still use classic
 * shapes so the mod is selectable and safe; facet shading, hard shadows,
 * icebreaker ship, and geometric aurora land in follow-up PRs.
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
        // Prefer hard geometric look: lower ambient glow / softer CRT
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

  registerDrawers(register) {
    // Temporary: classic drawers until IcebergCanvasVisuals / IcebergSkiaVisuals land.
    register("canvas", "player_ship", canvasDrawAsteroidsPlayerShip as never);
    register("canvas", "asteroid", canvasDrawAsteroidsAsteroid as never);
    register("canvas", "bullet", canvasDrawAsteroidsBullet as never);

    register("skia", "player_ship", skiaDrawAsteroidsPlayerShip as never);
    register("skia", "asteroid", skiaDrawAsteroidsAsteroid as never);
    register("skia", "bullet", skiaDrawAsteroidsBullet as never);
  }
};
