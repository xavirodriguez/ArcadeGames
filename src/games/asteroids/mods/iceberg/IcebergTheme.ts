import type { Theme } from "@tiny-aster/core";
import type { ThemeModule } from "../../presentation/types";
import { ICEBERG_PALETTE } from "./IcebergPalette";
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
import {
  drawIcebergParticle,
  drawSkiaIcebergParticle
} from "./IcebergParticleVisuals";
import {
  PolarOceanBackgroundEffect,
  GeometricAuroraBackgroundEffect,
  SkiaPolarOceanBackgroundEffect,
  SkiaGeometricAuroraBackgroundEffect
} from "./IcebergBackground";

/** Borealis presentation: palette, Canvas/Skia drawers, background and particles. */
export const icebergTheme: ThemeModule = {
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
        starDensity: 0.2,
        starSpeed: 0.2,
        ambientGlow: 0.12,
        particleShape: "shard",
        backgroundLayers: ["polar_ocean", "geometric_aurora"]
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
    register("canvas", "player_ship", drawIcebergPlayerShip as never);
    register("canvas", "asteroid", drawIcebergAsteroid as never);
    register("canvas", "bullet", drawIcebergBullet as never);
    register("canvas", "particle", drawIcebergParticle as never);

    register("skia", "player_ship", drawSkiaIcebergPlayerShip as never);
    register("skia", "asteroid", drawSkiaIcebergAsteroid as never);
    register("skia", "bullet", drawSkiaIcebergBullet as never);
    register("skia", "particle", drawSkiaIcebergParticle as never);
  },

  registerBackgroundEffects(register) {
    register("canvas", "polar_ocean", PolarOceanBackgroundEffect as never);
    register("canvas", "geometric_aurora", GeometricAuroraBackgroundEffect as never);
    register("skia", "polar_ocean", SkiaPolarOceanBackgroundEffect as never);
    register("skia", "geometric_aurora", SkiaGeometricAuroraBackgroundEffect as never);
  }
};
