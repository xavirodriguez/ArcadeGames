/**
 * SumiEJuice.ts
 * Phase 2: ink-wash juice vocabulary and per-game catalog overrides.
 *
 * Extends the SharedVFX / JuiceOrchestrator language with sumi-e primitives.
 * Games can call juice.spawn("ink_splash", ...) or use SUMI_E_JUICE_CATALOG
 * via a theme-aware orchestrator path.
 */

import { colors } from "../../../../theme/colors";
import { SUMI_E_PALETTE } from "./SumiEPalette";
import type { JuiceProfile, SupportedGameId, GameJuiceEventMap } from "../JuiceOrchestrator";
import { HitStopPriority } from "../HitStopSystem";

/**
 * Additional VFX primitive names for the sumi-e aesthetic.
 * These are registered as shape drawers and can be spawned via Juice.
 */
export type SumiEVFXPrimitiveName =
  | "ink_splash"
  | "ink_bleed"
  | "brush_stroke"
  | "dry_brush_trail"
  | "seal_stamp"
  | "mist_layer"
  | "water_ripple"
  | "floating_kanji";

/** Union of all juice-spawnable effect names when sumi-e is active. */
export type ExtendedVFXPrimitiveName =
  | import("../JuiceOrchestrator").SharedVFXPrimitiveName
  | SumiEVFXPrimitiveName;

export type SumiEJuiceProfile = import("../JuiceOrchestrator").BaseJuiceOptions & {
  effect: ExtendedVFXPrimitiveName;
};

/**
 * Default juice profiles for sumi-e primitives (used when spawning by name).
 */
export const SUMI_E_PRIMITIVE_DEFAULTS: Record<SumiEVFXPrimitiveName, SumiEJuiceProfile> = {
  ink_splash: {
    effect: "ink_splash",
    tint: SUMI_E_PALETTE.ink,
    scale: 1.0,
    ttl: 0.45,
    hitStopMs: 40,
    hitStopPriority: HitStopPriority.NORMAL,
    shakeIntensity: 1.2,
    shakeDurationMs: 50
  },
  ink_bleed: {
    effect: "ink_bleed",
    tint: SUMI_E_PALETTE.inkSoft,
    scale: 1.2,
    ttl: 0.7,
    intensity: 0.8
  },
  brush_stroke: {
    effect: "brush_stroke",
    tint: SUMI_E_PALETTE.ink,
    scale: 1.0,
    ttl: 0.35
  },
  dry_brush_trail: {
    effect: "dry_brush_trail",
    tint: SUMI_E_PALETTE.inkSoft,
    scale: 0.8,
    ttl: 0.25
  },
  seal_stamp: {
    effect: "seal_stamp",
    tint: SUMI_E_PALETTE.vermilion,
    scale: 1.0,
    ttl: 0.6,
    hitStopMs: 60,
    hitStopPriority: HitStopPriority.LOW
  },
  mist_layer: {
    effect: "mist_layer",
    tint: SUMI_E_PALETTE.paperWarm,
    scale: 1.5,
    ttl: 1.2,
    intensity: 0.4
  },
  water_ripple: {
    effect: "water_ripple",
    tint: SUMI_E_PALETTE.distantBlue,
    scale: 1.0,
    ttl: 0.5
  },
  floating_kanji: {
    effect: "floating_kanji",
    tint: SUMI_E_PALETTE.ink,
    scale: 1.0,
    ttl: 0.9,
    text: "墨"
  }
};

/**
 * Sumi-e oriented juice catalog: same event keys as JUICE_CATALOG, but mapped
 * to ink primitives and subtler feedback (preferSubtleJuice).
 */
export const SUMI_E_JUICE_CATALOG: {
  [G in SupportedGameId]?: Partial<Record<GameJuiceEventMap[G], SumiEJuiceProfile>>;
} = {
  asteroids: {
    "rock:destroyed": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 1.1,
      ttl: 0.4,
      hitStopMs: 35,
      hitStopPriority: HitStopPriority.NORMAL,
      shakeIntensity: 1.5,
      shakeDurationMs: 60
    },
    "ship:damage": {
      effect: "ink_bleed",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.2,
      ttl: 0.5,
      hitStopMs: 100,
      hitStopPriority: HitStopPriority.CRITICAL,
      shakeIntensity: 3.0,
      shakeDurationMs: 100
    },
    "ship:fire": {
      effect: "dry_brush_trail",
      tint: SUMI_E_PALETTE.inkSoft,
      scale: 0.6,
      ttl: 0.15
    }
  },
  flappybird: {
    "pipe:passed": {
      effect: "seal_stamp",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 0.9,
      ttl: 0.5
    },
    "bird:flap": {
      effect: "brush_stroke",
      tint: SUMI_E_PALETTE.inkSoft,
      scale: 0.5,
      ttl: 0.2
    },
    "bird:crash": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 1.3,
      ttl: 0.5,
      hitStopMs: 80,
      hitStopPriority: HitStopPriority.HIGH,
      shakeIntensity: 2.5,
      shakeDurationMs: 90
    }
  },
  "space-invaders": {
    "alien:destroyed": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 0.9,
      ttl: 0.3,
      hitStopMs: 30,
      shakeIntensity: 1.2,
      shakeDurationMs: 40
    },
    "ufo:destroyed": {
      effect: "seal_stamp",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.4,
      ttl: 0.6,
      hitStopMs: 90,
      hitStopPriority: HitStopPriority.HIGH,
      shakeIntensity: 2.8,
      shakeDurationMs: 100
    },
    "shield:degraded": {
      effect: "ink_bleed",
      tint: SUMI_E_PALETTE.inkSoft,
      scale: 1.0,
      ttl: 0.35
    }
  },
  pong: {
    "paddle:hit": {
      effect: "water_ripple",
      tint: SUMI_E_PALETTE.distantBlue,
      scale: 0.8,
      ttl: 0.25,
      hitStopMs: 20
    },
    "goal:scored": {
      effect: "seal_stamp",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.3,
      ttl: 0.55,
      hitStopMs: 80,
      hitStopPriority: HitStopPriority.HIGH,
      shakeIntensity: 2.0,
      shakeDurationMs: 80
    },
    "ball:rally": {
      effect: "dry_brush_trail",
      tint: SUMI_E_PALETTE.inkSoft,
      scale: 0.5,
      ttl: 0.15
    }
  },
  arkanoid: {
    "brick:shatter": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 0.85,
      ttl: 0.3,
      hitStopMs: 25,
      shakeIntensity: 1.0,
      shakeDurationMs: 40
    },
    "brick:hit": {
      effect: "brush_stroke",
      tint: SUMI_E_PALETTE.inkSoft,
      scale: 0.5,
      ttl: 0.15
    },
    "paddle:bounce": {
      effect: "water_ripple",
      tint: SUMI_E_PALETTE.distantBlue,
      scale: 0.7,
      ttl: 0.2
    },
    "boss:hit": {
      effect: "ink_bleed",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.3,
      ttl: 0.45,
      hitStopMs: 70,
      hitStopPriority: HitStopPriority.HIGH,
      shakeIntensity: 2.5,
      shakeDurationMs: 90
    }
  },
  frogger: {
    "goal:reached": {
      effect: "seal_stamp",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.1,
      ttl: 0.55
    },
    "frog:hop": {
      effect: "dry_brush_trail",
      tint: SUMI_E_PALETTE.inkSoft,
      scale: 0.4,
      ttl: 0.18
    },
    "frog:splat": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 1.2,
      ttl: 0.45,
      hitStopMs: 60,
      shakeIntensity: 2.0,
      shakeDurationMs: 70
    }
  },
  "echo-runner": {
    "echo:ghost": {
      effect: "mist_layer",
      tint: SUMI_E_PALETTE.paperWarm,
      scale: 1.2,
      ttl: 0.8
    },
    "dash:boost": {
      effect: "brush_stroke",
      tint: SUMI_E_PALETTE.ink,
      scale: 0.9,
      ttl: 0.25
    },
    "obstacle:hit": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.0,
      ttl: 0.4,
      hitStopMs: 50,
      shakeIntensity: 2.0,
      shakeDurationMs: 60
    }
  },
  platformer: {
    "player:damage": {
      effect: "ink_bleed",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.0,
      ttl: 0.4,
      hitStopMs: 80,
      shakeIntensity: 2.5,
      shakeDurationMs: 80
    },
    "coin:collected": {
      effect: "seal_stamp",
      tint: SUMI_E_PALETTE.gold,
      scale: 0.7,
      ttl: 0.4
    },
    "enemy:stomp": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 0.9,
      ttl: 0.3,
      hitStopMs: 40,
      shakeIntensity: 1.5,
      shakeDurationMs: 50
    }
  },
  "geometry-wars": {
    "enemy:destroyed": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 1.0,
      ttl: 0.35,
      hitStopMs: 30
    },
    "bomb:trigger": {
      effect: "ink_bleed",
      tint: SUMI_E_PALETTE.vermilion,
      scale: 1.8,
      ttl: 0.7,
      hitStopMs: 120,
      hitStopPriority: HitStopPriority.HIGH,
      shakeIntensity: 4.0,
      shakeDurationMs: 140
    },
    "player:death": {
      effect: "ink_splash",
      tint: SUMI_E_PALETTE.ink,
      scale: 1.5,
      ttl: 0.6,
      hitStopMs: 150,
      hitStopPriority: HitStopPriority.CRITICAL,
      shakeIntensity: 3.5,
      shakeDurationMs: 120
    }
  }
};

/**
 * Returns the sumi-e juice profile for a game event, or undefined if not mapped.
 */
export function getSumiEJuiceProfile<
  G extends SupportedGameId
>(gameId: G, eventName: GameJuiceEventMap[G]): SumiEJuiceProfile | undefined {
  const gameMap = SUMI_E_JUICE_CATALOG[gameId];
  if (!gameMap) return undefined;
  return (gameMap as Record<string, SumiEJuiceProfile>)[eventName as string];
}

/** Fallback mapping: sumi primitive → closest classic SharedVFX name for drawers not yet implemented. */
export const SUMI_E_FALLBACK_SHAPE: Record<SumiEVFXPrimitiveName, string> = {
  ink_splash: "shockwave",
  ink_bleed: "shockwave",
  brush_stroke: "comet_trail",
  dry_brush_trail: "comet_trail",
  seal_stamp: "floating_text",
  mist_layer: "shield_bubble",
  water_ripple: "shockwave",
  floating_kanji: "floating_text"
};
