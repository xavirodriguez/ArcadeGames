import { TransitionRegistry } from "@tiny-aster/core";
import { colors } from "../../theme/colors";

/**
 * Type representing all supported built-in transition keys from TransitionRegistry.
 * @public
 */
export type TransitionRegistryKey = keyof typeof TransitionRegistry;

/**
 * Visual presentation style profile mapped to a transition effect name for Reanimated presentation.
 * @public
 */
export interface CutsceneTransitionProfile {
  /** Underlying transition key identifier. */
  key: TransitionRegistryKey;
  /** Primary accent color used in presentation overlay animations. */
  primaryColor: string;
  /** Secondary accent color for flash/glitch effects. */
  secondaryColor?: string;
  /** Animation preset type identifier for Reanimated presentation rendering. */
  preset: "fade" | "crt" | "danger" | "iris" | "pixelate" | "scanline" | "curtain" | "grid" | "sweep";
  /** Default duration override in milliseconds (<= 600ms). */
  durationMs: number;
}

/**
 * Explicit mapping between TransitionRegistry keys and presentation animation profiles.
 *
 * @remarks
 * Mapped against TransitionRegistry keys to ensure full compiler type safety.
 *
 * @public
 */
export const CUTSCENE_TRANSITION_MAP: Record<TransitionRegistryKey, CutsceneTransitionProfile> = {
  fade: {
    key: "fade",
    primaryColor: colors.overlay,
    preset: "fade",
    durationMs: 400
  },
  iris: {
    key: "iris",
    primaryColor: colors.backgroundDark,
    secondaryColor: colors.cyan,
    preset: "iris",
    durationMs: 500
  },
  dither: {
    key: "dither",
    primaryColor: colors.background,
    secondaryColor: colors.violet,
    preset: "pixelate",
    durationMs: 450
  },
  pixelate: {
    key: "pixelate",
    primaryColor: colors.backgroundDark,
    secondaryColor: colors.cyan,
    preset: "pixelate",
    durationMs: 500
  },
  scanline: {
    key: "scanline",
    primaryColor: colors.background,
    secondaryColor: colors.green,
    preset: "scanline",
    durationMs: 450
  },
  crossfade: {
    key: "crossfade",
    primaryColor: colors.overlay,
    secondaryColor: colors.pink,
    preset: "fade",
    durationMs: 400
  },
  curtain: {
    key: "curtain",
    primaryColor: colors.backgroundDark,
    secondaryColor: colors.cyan,
    preset: "curtain",
    durationMs: 500
  },
  grid: {
    key: "grid",
    primaryColor: colors.background,
    secondaryColor: colors.pink,
    preset: "grid",
    durationMs: 500
  },
  diagonal: {
    key: "diagonal",
    primaryColor: colors.backgroundDark,
    secondaryColor: colors.gold,
    preset: "sweep",
    durationMs: 450
  },
  radial: {
    key: "radial",
    primaryColor: colors.backgroundDark,
    secondaryColor: colors.cyan,
    preset: "iris",
    durationMs: 500
  },
  crt: {
    key: "crt",
    primaryColor: colors.background,
    secondaryColor: colors.cyan,
    preset: "crt",
    durationMs: 450
  },
  danger: {
    key: "danger",
    primaryColor: colors.danger,
    secondaryColor: colors.redHot,
    preset: "danger",
    durationMs: 400
  }
};

/**
 * Case-insensitive alias dictionary mapping class names or alternative keys to TransitionRegistry keys.
 */
const TRANSITION_ALIASES: Record<string, TransitionRegistryKey> = {
  fadetransition: "fade",
  iristransition: "iris",
  dithertransition: "dither",
  pixelatetransition: "pixelate",
  scanlinewipetransition: "scanline",
  crossfadetransition: "crossfade",
  curtaintransition: "curtain",
  retrogridtransition: "grid",
  diagonalsweeptransition: "diagonal",
  radialwipetransition: "radial",
  crtglitchtransition: "crt",
  dangerpulsetransition: "danger"
};

/** Tracked set of unknown effect names to ensure console.warn fires exactly once per unknown name. */
const warnedUnknownEffects = new Set<string>();

/**
 * Resolves a transition effect name to its corresponding CutsceneTransitionProfile.
 *
 * @remarks
 * Unmapped/unknown effect strings trigger a `console.warn` once per unknown name
 * and gracefully fall back to the default `"fade"` transition profile.
 *
 * @param effectName - String key or class name of the transition effect.
 * @returns Resolved CutsceneTransitionProfile.
 * @public
 */
export function resolveCutsceneTransitionProfile(effectName?: string): CutsceneTransitionProfile {
  if (!effectName) {
    return CUTSCENE_TRANSITION_MAP.fade;
  }

  const normalized = effectName.trim().toLowerCase();

  // 1. Direct registry lookup
  if (normalized in CUTSCENE_TRANSITION_MAP) {
    return CUTSCENE_TRANSITION_MAP[normalized as TransitionRegistryKey];
  }

  // 2. Class name alias lookup
  if (normalized in TRANSITION_ALIASES) {
    const aliasKey = TRANSITION_ALIASES[normalized];
    return CUTSCENE_TRANSITION_MAP[aliasKey];
  }

  // 3. Unknown transition effect fallback
  if (!warnedUnknownEffects.has(effectName)) {
    warnedUnknownEffects.add(effectName);
    console.warn(`[CutsceneTransitionMap] Unknown cutscene transition effect '${effectName}'. Degrading to default 'fade' transition.`);
  }

  return CUTSCENE_TRANSITION_MAP.fade;
}

/**
 * Clears the set of warned unknown effect names (primarily for unit test isolation).
 * @internal
 */
export function clearWarnedUnknownEffects(): void {
  warnedUnknownEffects.clear();
}
