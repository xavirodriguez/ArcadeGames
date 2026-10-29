import type {
  PresentationRandom,
  PresentationSceneSnapshot,
  PresentationEntitySnapshot,
  PresentationFeedbackEventSnapshot,
  PresentationHudSnapshot,
  PresentationBannerSnapshot,
  PresentationTheme,
  PresentationThemeDescriptor,
  PresentationThemeSession,
  PresentationThemeTokens
} from "../../../shared/presentation/PresentationContracts";
import { PresentationThemeRegistry } from "../../../shared/presentation/PresentationThemeRegistry";
import { fonts, typography } from "../../../../theme/typography";
import { spacing } from "../../../../theme/spacing";
import { radius } from "../../../../theme/radius";
import type { HitRunTheme, HitRunThemePaletteTokens } from "./HitRunTheme";
import { FANTASY_PALETTE_TOKENS } from "./fantasy/FantasyTheme";
import { SUMI_E_PALETTE } from "./sumi-e/SumiETheme";
import { ThemeRegistry as LegacyThemeRegistry } from "./ThemeRegistry";

export const HIT_RUN_PRESENTATION_SESSION_RESOURCE = "HitRunPresentationSession";

type HitRunPresentationSharedTheme = PresentationTheme<
  PresentationSceneSnapshot,
  PresentationEntitySnapshot,
  PresentationFeedbackEventSnapshot,
  PresentationHudSnapshot,
  PresentationBannerSnapshot,
  HitRunThemePaletteTokens
>;

export interface HitRunPresentationBridge extends HitRunPresentationSharedTheme {
  /** Compatibility renderer retained until all layers migrate to PresentationPainter. */
  readonly legacyTheme: HitRunTheme;
}

export type HitRunPresentationSession = PresentationThemeSession<
  PresentationSceneSnapshot,
  PresentationEntitySnapshot,
  PresentationFeedbackEventSnapshot,
  PresentationHudSnapshot,
  PresentationBannerSnapshot,
  HitRunThemePaletteTokens
>;

interface PresentationWorldReader {
  getResource<T = unknown>(key: string): T | undefined;
}

function createRandom(seed: number): PresentationRandom {
  let state = seed >>> 0;
  return Object.freeze({
    next(): number {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    }
  });
}

function createTokens(palette: HitRunThemePaletteTokens): PresentationThemeTokens<HitRunThemePaletteTokens> {
  return {
    colors: {
      background: palette.background,
      surface: palette.paperOrFloor,
      textPrimary: palette.inkOrOutline,
      textSecondary: palette.secondary,
      accent: palette.accent,
      player: palette.primary,
      threat: palette.redOniOrCharger,
      reward: palette.goldOrYellow,
      danger: palette.vermilionOrRed,
      success: palette.secondary,
      warning: palette.goldOrYellow,
      outline: palette.inkOrOutline
    },
    typography: {
      display: fonts.display ?? "sans-serif",
      body: fonts.ui ?? "sans-serif",
      monospace: fonts.data ?? typography.game ?? "monospace"
    },
    layout: {
      spacing: {
        xs: spacing.xs,
        sm: spacing.sm,
        md: spacing.md,
        lg: spacing.lg,
        xl: spacing.xl
      },
      radius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        pill: radius.round
      }
    },
    custom: palette
  };
}

const FANTASY_DESCRIPTOR: PresentationThemeDescriptor = {
  id: "fantasy",
  displayName: "Dark Fantasy",
  capabilities: []
};

const SUMI_E_DESCRIPTOR: PresentationThemeDescriptor = {
  id: "sumi-e",
  displayName: "Ukiyo-e Sumi-e",
  capabilities: []
};

function createBridge(
  descriptor: PresentationThemeDescriptor,
  legacyTheme: HitRunTheme
): HitRunPresentationBridge {
  return {
    descriptor,
    legacyTheme,
    onResize(viewport): void {
      legacyTheme.onResize(viewport.width, viewport.height);
    },
    dispose(): void {
      legacyTheme.dispose();
    }
  };
}

/**
 * The shared registry owns selection, resolved tokens, theme instance and lifecycle.
 * The nested legacy theme is a temporary drawing adapter, not a second session authority.
 */
const presentationRegistry = new PresentationThemeRegistry<
  PresentationSceneSnapshot,
  PresentationEntitySnapshot,
  PresentationFeedbackEventSnapshot,
  PresentationHudSnapshot,
  PresentationBannerSnapshot,
  HitRunThemePaletteTokens
>("hitandrun", "fantasy");

presentationRegistry.register({
  descriptor: FANTASY_DESCRIPTOR,
  tokens: createTokens(FANTASY_PALETTE_TOKENS),
  create: (context) => createBridge(
    FANTASY_DESCRIPTOR,
    LegacyThemeRegistry.get("fantasy", {
      cosmeticSeed: context.cosmeticSeed,
      random: context.random
    })
  )
});

presentationRegistry.register({
  descriptor: SUMI_E_DESCRIPTOR,
  tokens: createTokens(SUMI_E_PALETTE),
  create: (context) => createBridge(
    SUMI_E_DESCRIPTOR,
    LegacyThemeRegistry.get("sumi-e", {
      cosmeticSeed: context.cosmeticSeed,
      random: context.random
    })
  )
});

export function createHitRunPresentationSession(
  requestedThemeId: string,
  sessionId: string,
  cosmeticSeed: number
): HitRunPresentationSession {
  const normalizedSeed = Number.isFinite(cosmeticSeed) ? Math.trunc(cosmeticSeed) >>> 0 : 41873;
  return presentationRegistry.createSession(requestedThemeId, {
    gameId: "hitandrun",
    sessionId,
    cosmeticSeed: normalizedSeed,
    random: createRandom(normalizedSeed)
  });
}

export function getHitRunPresentationSession(world: PresentationWorldReader): HitRunPresentationSession {
  const session = world.getResource<HitRunPresentationSession>(HIT_RUN_PRESENTATION_SESSION_RESOURCE);
  if (!session || session.disposed) {
    throw new Error("[HitRunPresentationSession] World has no active presentation session.");
  }
  return session;
}

export function getHitRunTheme(world: PresentationWorldReader): HitRunTheme {
  return (getHitRunPresentationSession(world).theme as HitRunPresentationBridge).legacyTheme;
}

export function resizeHitRunPresentationSession(
  world: PresentationWorldReader,
  viewportWidth: number,
  viewportHeight: number
): void {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) return;
  const session = getHitRunPresentationSession(world);
  const previous = sessionViewport.get(session);
  if (previous?.width === viewportWidth && previous.height === viewportHeight) return;
  sessionViewport.set(session, { width: viewportWidth, height: viewportHeight });
  session.theme.onResize?.({ width: viewportWidth, height: viewportHeight, pixelRatio: 1 });
}
