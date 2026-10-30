import type {
  PresentationRandom,
  PresentationSceneSnapshot,
  PresentationEntitySnapshot,
  PresentationFeedbackEventSnapshot,
  PresentationFrame,
  PresentationPainter,
  PresentationBannerSnapshot,
  PresentationTheme,
  PresentationThemeDescriptor,
  PresentationThemeSession,
  PresentationThemeTokens
} from "../../../shared/presentation/PresentationContracts";
import { PresentationThemeRegistry } from "../../../shared/presentation/PresentationThemeRegistry";
import type { HitRunPresentationHudSnapshot } from "./HitRunPresentationSnapshots";
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
  HitRunPresentationHudSnapshot,
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
  HitRunPresentationHudSnapshot,
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

const HIT_RUN_HUD_CAPABILITIES = ["hud", "banner"] as const;

const FANTASY_DESCRIPTOR: PresentationThemeDescriptor = {
  id: "fantasy",
  displayName: "Dark Fantasy",
  capabilities: HIT_RUN_HUD_CAPABILITIES
};

const SUMI_E_DESCRIPTOR: PresentationThemeDescriptor = {
  id: "sumi-e",
  displayName: "Ukiyo-e Sumi-e",
  capabilities: HIT_RUN_HUD_CAPABILITIES
};

function createBridge(
  descriptor: PresentationThemeDescriptor,
  legacyTheme: HitRunTheme
): HitRunPresentationBridge {
  const palette = legacyTheme.palette;

  return {
    descriptor,
    legacyTheme,
    renderHud(painter: PresentationPainter, hud: HitRunPresentationHudSnapshot, frame: PresentationFrame): void {
      const width = frame.viewport.width;
      const height = frame.viewport.height;
      const sealX = 28;
      const sealY = 28;

      painter.save();
      try {
        painter.fillCircle(sealX, sealY, 20, { color: palette.vermilionOrRed });
        painter.fillText("生", sealX, sealY + 1, {
          fontFamily: fonts.display ?? "serif",
          fontSize: 14,
          fontWeight: "bold",
          align: "center",
          baseline: "middle",
          color: palette.background
        });

        if (hud.health) {
          const maxHealth = Math.max(0, Math.min(20, Math.floor(hud.health.max)));
          const currentHealth = Math.max(0, Math.min(maxHealth, Math.floor(hud.health.current)));
          for (let index = 0; index < maxHealth; index++) {
            const x = sealX + 32 + index * 22;
            const y = sealY - 10;
            painter.fillRect({ x, y, width: 16, height: 20 }, { color: palette.inkOrOutline });
            if (index >= currentHealth) {
              painter.fillRect({ x: x + 2, y: y + 2, width: 12, height: 12 }, { color: palette.background });
            }
          }
        }

        if (hud.score !== undefined) {
          painter.save();
          try {
            painter.translate(width - 70, 30);
            painter.rotate(-0.06);
            painter.fillRect(
              { x: -40, y: -16, width: 80, height: 32 },
              { color: palette.background, alpha: 0.82 }
            );
            painter.strokeRect(
              { x: -40, y: -16, width: 80, height: 32 },
              { color: palette.vermilionOrRed, width: 2 }
            );
            painter.fillText(String(Math.max(0, Math.floor(hud.score))).padStart(6, "0"), 0, 6, {
              fontFamily: fonts.data ?? "monospace",
              fontSize: 16,
              fontWeight: "bold",
              align: "center",
              baseline: "middle",
              color: palette.inkOrOutline
            });
          } finally {
            painter.restore();
          }
        }

        painter.save();
        try {
          painter.translate(width - 45, height - 45);
          painter.rotate(0.08);
          painter.fillRect({ x: -24, y: -24, width: 48, height: 48 }, { color: palette.vermilionOrRed });
          painter.fillText("正野", 0, -5, {
            fontFamily: fonts.display ?? "serif",
            fontSize: 12,
            fontWeight: "bold",
            align: "center",
            baseline: "middle",
            color: palette.background
          });
          painter.fillText("廣果", 0, 11, {
            fontFamily: fonts.display ?? "serif",
            fontSize: 12,
            fontWeight: "bold",
            align: "center",
            baseline: "middle",
            color: palette.background
          });
        } finally {
          painter.restore();
        }

        if (hud.isGameOver) {
          painter.fillRect({ x: 0, y: 0, width, height }, { color: palette.inkOrOutline, alpha: 0.75 });
          painter.fillText(descriptor.id === "sumi-e" ? "敗 散" : "GAME OVER", width * 0.5, height * 0.5, {
            fontFamily: fonts.display ?? "serif",
            fontSize: 36,
            fontWeight: "bold",
            align: "center",
            baseline: "middle",
            color: palette.vermilionOrRed
          });
        }

        const sectionLabel = hud.metrics?.wave.sectionLabel;
        if (sectionLabel && sectionLabel !== "—") {
          painter.fillText(sectionLabel, width * 0.5, 24, {
            fontFamily: fonts.data ?? "monospace",
            fontSize: 11,
            fontWeight: "bold",
            align: "center",
            baseline: "middle",
            color: palette.inkOrOutline,
            alpha: frame.highContrast ? 1 : 0.78
          });
        }
      } finally {
        painter.restore();
      }
    },
    renderBanner(painter: PresentationPainter, banner: PresentationBannerSnapshot, frame: PresentationFrame): void {
      if (banner.remainingSeconds <= 0) return;
      const alpha = frame.reduceMotion ? 1 : Math.min(1, banner.remainingSeconds / 0.35);
      const width = Math.min(180, frame.viewport.width - 32);
      const height = 70;

      painter.save();
      try {
        painter.setAlpha(alpha);
        painter.translate(frame.viewport.width * 0.5, frame.viewport.height * 0.38);
        painter.fillRect(
          { x: -width * 0.5, y: -height * 0.5, width, height },
          { color: palette.vermilionOrRed }
        );
        if (frame.highContrast) {
          painter.strokeRect(
            { x: -width * 0.5, y: -height * 0.5, width, height },
            { color: palette.inkOrOutline, width: 3 }
          );
        }
        const calligraphy = banner.text === "CLEAR"
          ? (descriptor.id === "sumi-e" ? "全 滅" : "CLEAR")
          : (descriptor.id === "sumi-e" ? "突 破" : banner.text.toUpperCase());
        painter.fillText(calligraphy, 0, 1, {
          fontFamily: fonts.display ?? "serif",
          fontSize: 32,
          fontWeight: "bold",
          align: "center",
          baseline: "middle",
          color: palette.background
        });
      } finally {
        painter.restore();
      }
    },
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
  HitRunPresentationHudSnapshot,
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

const sessionViewport = new WeakMap<HitRunPresentationSession, { readonly width: number; readonly height: number }>();

export function resizeHitRunPresentationSession(
  world: PresentationWorldReader,
  viewportWidth: number,
  viewportHeight: number
): void {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) return;
  const currentSession = getHitRunPresentationSession(world);
  const previous = sessionViewport.get(currentSession);
  if (previous?.width === viewportWidth && previous.height === viewportHeight) return;
  sessionViewport.set(currentSession, { width: viewportWidth, height: viewportHeight });
  currentSession.theme.onResize?.({ width: viewportWidth, height: viewportHeight, pixelRatio: 1 });
}

