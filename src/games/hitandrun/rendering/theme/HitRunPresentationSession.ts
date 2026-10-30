import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import type {
  PresentationRandom,
  PresentationSceneSnapshot,
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
import type {
  HitRunPresentationEntitySnapshot,
  HitRunPresentationHudSnapshot
} from "./HitRunPresentationSnapshots";
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
  HitRunPresentationEntitySnapshot,
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
  HitRunPresentationEntitySnapshot,
  PresentationFeedbackEventSnapshot,
  HitRunPresentationHudSnapshot,
  PresentationBannerSnapshot,
  HitRunThemePaletteTokens
>;

type PresentationWorldReader = Pick<World<CoreComponentRegistry>, "getResource">;

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

const HIT_RUN_PRESENTATION_CAPABILITIES = [
  "ground-shadow",
  "entity",
  "projectile",
  "hud",
  "banner"
] as const;

const FANTASY_DESCRIPTOR: PresentationThemeDescriptor = {
  id: "fantasy",
  displayName: "Dark Fantasy",
  capabilities: HIT_RUN_PRESENTATION_CAPABILITIES
};

const SUMI_E_DESCRIPTOR: PresentationThemeDescriptor = {
  id: "sumi-e",
  displayName: "Ukiyo-e Sumi-e",
  capabilities: HIT_RUN_PRESENTATION_CAPABILITIES
};

function renderFantasyEntity(
  painter: PresentationPainter,
  entity: HitRunPresentationEntitySnapshot,
  palette: HitRunThemePaletteTokens,
  size: number
): void {
  switch (entity.visualId) {
    case "player": {
      const body = painter.createLinearGradient(-size * 0.3, -size * 0.85, size * 0.3, -size * 0.35);
      body.addColorStop(0, "#3d4a5c");
      body.addColorStop(0.5, "#5a6a80");
      body.addColorStop(1, "#2a3340");
      painter.beginPath();
      painter.moveTo(-size * 0.12, -size * 0.35);
      painter.lineTo(-size * 0.18, 0);
      painter.moveTo(size * 0.12, -size * 0.35);
      painter.lineTo(size * 0.18, 0);
      painter.stroke({ color: "#1a1220", width: 3, lineCap: "round" });
      painter.fillRect({ x: -size * 0.29, y: -size * 0.08, width: size * 0.2, height: size * 0.08 }, { color: "#151b23" });
      painter.fillRect({ x: size * 0.09, y: -size * 0.08, width: size * 0.2, height: size * 0.08 }, { color: "#151b23" });
      painter.fillRect({ x: -size * 0.28, y: -size * 0.85, width: size * 0.56, height: size * 0.5 }, { gradient: body });
      painter.strokeRect({ x: -size * 0.28, y: -size * 0.85, width: size * 0.56, height: size * 0.5 }, { color: palette.vermilionOrRed, width: 1.5 });
      painter.fillCircle(0, -size * 0.98, size * 0.22, { color: "#1e2430" });
      painter.fillEllipse(size * 0.08, -size, size * 0.12, size * 0.08, 0, { color: palette.goldOrYellow });
      painter.fillRect({ x: size * 0.15, y: -size * 0.68, width: size * 0.55, height: size * 0.14 }, { color: "#1a1a22" });
      painter.fillRect({ x: size * 0.65, y: -size * 0.64, width: size * 0.22, height: size * 0.06 }, { color: "#3a3a48" });
      return;
    }
    case "popcorn":
    case "goblin": {
      const color = entity.tint ?? "#f97316";
      painter.fillCircle(0, -size * 0.45, size * 0.45, { color, alpha: 0.3 });
      painter.fillCircle(0, -size * 0.45, size * 0.38, { color });
      painter.fillCircle(-size * 0.12, -size * 0.53, size * 0.115, { color: "#fff4db" });
      painter.fillCircle(size * 0.14, -size * 0.53, size * 0.115, { color: "#fff4db" });
      return;
    }
    case "wall_trooper":
    case "skeleton":
      painter.fillRect({ x: -size * 0.4, y: -size, width: size * 0.8, height: size }, { color: entity.tint ?? "#78716c" });
      painter.strokeRect({ x: -size * 0.4, y: -size, width: size * 0.8, height: size }, { color: "#a8a29e", width: 2 });
      return;
    case "hopper":
    case "cave_hopper":
      painter.fillEllipse(0, -size * 0.55, size * 0.5, size * 0.35, 0, { color: entity.tint ?? "#a855f7" });
      return;
    case "charger":
    case "orc_berserker":
      painter.beginPath();
      painter.moveTo(size * 0.65, -size * 0.42);
      painter.lineTo(-size * 0.45, -size * 0.84);
      painter.lineTo(-size * 0.25, -size * 0.42);
      painter.lineTo(-size * 0.45, 0);
      painter.closePath();
      painter.fill({ color: entity.tint ?? "#ef4444" });
      return;
    case "elite":
    case "dark_knight":
    case "warlord":
    default:
      painter.fillCircle(0, -size * 0.5, size * 0.42, { color: entity.tint ?? "#eab308" });
  }
}

function renderSumiEEntity(
  painter: PresentationPainter,
  entity: HitRunPresentationEntitySnapshot,
  palette: HitRunThemePaletteTokens,
  size: number
): void {
  switch (entity.visualId) {
    case "player":
      painter.fillRect({ x: -size * 0.25, y: -size * 0.8, width: size * 0.5, height: size * 0.5 }, { color: palette.inkOrOutline });
      painter.beginPath();
      painter.moveTo(-size * 0.55, -size * 0.85);
      painter.lineTo(0, -size * 1.15);
      painter.lineTo(size * 0.55, -size * 0.85);
      painter.closePath();
      painter.fill({ color: palette.goldOrYellow });
      painter.fillRect({ x: size * 0.1, y: -size * 0.65, width: size * 0.75, height: size * 0.1 }, { color: palette.inkOrOutline });
      return;
    case "popcorn":
    case "goblin":
      painter.fillCircle(0, -size * 0.45, size * 0.45, { color: palette.inkOrOutline });
      painter.fillCircle(size * 0.15, -size * 0.55, size * 0.12, { color: palette.vermilionOrRed });
      return;
    case "charger":
    case "orc_berserker":
    case "red_oni":
      painter.fillCircle(0, -size * 0.55, size * 0.5, { color: palette.redOniOrCharger });
      painter.beginPath();
      painter.moveTo(-size * 0.2, -size * 0.9);
      painter.lineTo(-size * 0.35, -size * 1.2);
      painter.lineTo(-size * 0.05, -size * 0.95);
      painter.closePath();
      painter.fill({ color: palette.goldOrYellow });
      return;
    case "elite":
    case "dark_knight":
    case "blue_oni":
    default:
      painter.fillCircle(0, -size * 0.55, size * 0.52, { color: palette.darkOniOrElite });
      painter.fillCircle(0, -size * 0.95, size * 0.15, { color: palette.goldOrYellow });
  }
}

function renderSamurai(
  painter: PresentationPainter,
  entity: HitRunPresentationEntitySnapshot,
  frame: PresentationFrame,
  palette: HitRunThemePaletteTokens,
  size: number
): void {
  const custom = entity.custom;
  if (!custom) return;
  if (custom.isDead) {
    painter.save();
    try {
      painter.translate(0, -size * 0.22);
      painter.rotate(-0.1);
      painter.fillEllipse(0, -size * 0.12, size * 0.52, size * 0.2, 0, { color: "#171923" });
      painter.fillRect({ x: -size * 0.3, y: -size * 0.25, width: size * 0.72, height: size * 0.25 }, { color: palette.redOniOrCharger });
      painter.beginPath();
      painter.moveTo(size * 0.22, -size * 0.18);
      painter.lineTo(size * 0.78, size * 0.02);
      painter.stroke({ color: "#aeb8c8", width: Math.max(1.2, size * 0.045), lineCap: "round" });
    } finally {
      painter.restore();
    }
    return;
  }

  const sway = Math.sin(frame.elapsedSeconds * 6) * size * 0.018;
  painter.fillRect({ x: -size * 0.27, y: -size * 0.28, width: size * 0.19, height: size * 0.25 }, { color: "#303541" });
  painter.fillRect({ x: size * 0.07, y: -size * 0.28, width: size * 0.19, height: size * 0.25 }, { color: "#303541" });
  painter.beginPath();
  painter.moveTo(-size * 0.27, -size * 0.76);
  painter.lineTo(size * 0.25, -size * 0.76);
  painter.lineTo(size * 0.33, -size * 0.34);
  painter.lineTo(size * 0.11, -size * 0.28);
  painter.lineTo(-size * 0.35, -size * 0.37);
  painter.closePath();
  painter.fill({ color: "#171923" });
  painter.fillRect({ x: -size * 0.24, y: -size * 1.18, width: size * 0.45, height: size * 0.42 }, { color: palette.vermilionOrRed });
  painter.strokeRect({ x: -size * 0.29, y: -size * 1.22, width: size * 0.59, height: size * 0.53 }, { color: "#171923", width: Math.max(1, size * 0.045) });
  painter.fillCircle(-size * 0.01 + sway, -size * 1.42, size * 0.23, { color: "#34303a" });
  painter.fillEllipse(-size * 0.02 + sway, -size * 1.36, size * 0.11, size * 0.08, 0, { color: "#55505a" });
  painter.fillRect({ x: -size * 0.14 + sway, y: -size * 1.45, width: size * 0.09, height: size * 0.035 }, { color: "#ff554c" });
  painter.fillRect({ x: size * 0.02 + sway, y: -size * 1.45, width: size * 0.09, height: size * 0.035 }, { color: "#ff554c" });

  // Layered shoulder guards and lacquered forearm keep the silhouette readable at small scales.
  painter.fillEllipse(-size * 0.28, -size * 1.12, size * 0.16, size * 0.14, -0.25, { color: "#171923" });
  painter.fillEllipse(size * 0.23, -size * 1.11, size * 0.16, size * 0.14, 0.25, { color: "#171923" });
  painter.fillEllipse(-size * 0.28, -size * 1.13, size * 0.12, size * 0.09, -0.25, { color: palette.vermilionOrRed });
  painter.fillEllipse(size * 0.23, -size * 1.12, size * 0.12, size * 0.09, 0.25, { color: palette.vermilionOrRed });
  painter.beginPath();
  painter.moveTo(size * 0.2, -size * 1.02);
  painter.lineTo(size * 0.28, -size * 0.83);
  painter.stroke({ color: "#171923", width: size * 0.11, lineCap: "round" });
  painter.beginPath();
  painter.moveTo(size * 0.2, -size * 1.02);
  painter.lineTo(size * 0.28, -size * 0.83);
  painter.stroke({ color: palette.vermilionOrRed, width: size * 0.07, lineCap: "round" });

  painter.beginPath();
  painter.moveTo(-size * 0.14 + sway, -size * 1.56);
  painter.lineTo(-size * 0.28 + sway, -size * 1.72);
  painter.lineTo(-size * 0.2 + sway, -size * 1.88);
  painter.moveTo(size * 0.1 + sway, -size * 1.56);
  painter.lineTo(size * 0.27 + sway, -size * 1.72);
  painter.lineTo(size * 0.19 + sway, -size * 1.88);
  painter.stroke({ color: palette.goldOrYellow, width: size * 0.055, lineCap: "round" });

  painter.save();
  try {
    painter.translate(size * 0.25, -size * 0.87);
    const angle = custom.samuraiWindup ? -1.1 : custom.samuraiAttack ? 0.18 : -0.26;
    painter.rotate(angle + (custom.samuraiAttack ? Math.sin(frame.elapsedSeconds * 48) * 0.1 : 0));
    painter.beginPath();
    painter.moveTo(-size * 0.08, 0);
    painter.lineTo(size * 0.19, size * 0.01);
    painter.stroke({ color: "#171923", width: size * 0.11, lineCap: "round" });
    painter.beginPath();
    painter.moveTo(size * 0.04, -size * 0.075);
    painter.lineTo(size * 0.04, size * 0.08);
    painter.stroke({ color: palette.goldOrYellow, width: size * 0.045, lineCap: "round" });
    painter.beginPath();
    painter.moveTo(size * 0.16, 0);
    painter.lineTo(size * 0.98, -size * 0.08);
    painter.stroke({ color: "#aeb8c8", width: size * 0.075, lineCap: "round" });
    painter.beginPath();
    painter.moveTo(size * 0.18, -size * 0.018);
    painter.lineTo(size * 0.91, -size * 0.09);
    painter.stroke({ color: "#f4f5f8", width: size * 0.022, lineCap: "round" });
  } finally {
    painter.restore();
  }

  if (custom.samuraiAttack) {
    painter.beginPath();
    painter.moveTo(-size * 0.48, -size * 0.78);
    painter.quadraticCurveTo(size * 0.1, -size * 1.72, size * 0.92, -size * 0.72);
    painter.stroke({ color: "#f0f4ff", width: size * 0.035, alpha: 0.55, lineCap: "round" });
  }
}

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

      if (descriptor.id === "fantasy") {
        const metrics = hud.metrics;
        painter.save();
        try {
          const header = painter.createLinearGradient(0, 0, 0, 52);
          header.addColorStop(0, palette.inkOrOutline);
          header.addColorStop(1, palette.background);
          painter.fillRect({ x: 0, y: 0, width, height: 52 }, { gradient: header });

          if (hud.health) {
            const maxHealth = Math.max(0, Math.min(20, Math.floor(hud.health.max)));
            const currentHealth = Math.max(0, Math.min(maxHealth, Math.floor(hud.health.current)));
            const pipWidth = 18;
            const pipHeight = 10;
            for (let index = 0; index < maxHealth; index++) {
              const x = 16 + index * (pipWidth + 6);
              const color = index < currentHealth ? palette.vermilionOrRed : palette.paperOrFloor;
              painter.fillRect({ x, y: 14, width: pipWidth, height: pipHeight }, { color });
              painter.strokeRect({ x, y: 14, width: pipWidth, height: pipHeight }, {
                color: palette.inkOrOutline,
                width: 1
              });
            }

            const weaponId = metrics?.weaponId.toUpperCase() ?? "LONGBOW";
            const ammo = metrics && Number.isFinite(metrics.ammoCurrent)
              ? String(metrics.ammoCurrent) + "/" + String(metrics.ammoMax)
              : "∞";
            painter.fillText(weaponId + " [" + ammo + "]", 16 + maxHealth * 24 + 16, 22, {
              fontFamily: fonts.data ?? "monospace",
              fontSize: 12,
              fontWeight: "bold",
              color: palette.goldOrYellow,
              baseline: "middle"
            });
          }

          if (metrics?.wave) {
            painter.fillText(
              metrics.wave.sectionLabel + "  ·  " + metrics.wave.waveName,
              width * 0.5,
              16,
              {
                fontFamily: fonts.data ?? "monospace",
                fontSize: 12,
                fontWeight: "bold",
                align: "center",
                baseline: "middle",
                color: palette.paperOrFloor
              }
            );
            const gateLabel = metrics.wave.gateLocked ? "GATE LOCKED" : "GATE OPEN";
            painter.fillText(gateLabel + "  ·  ALIVE " + metrics.wave.aliveEnemies, width * 0.5, 30, {
              fontFamily: fonts.data ?? "monospace",
              fontSize: 10,
              align: "center",
              baseline: "middle",
              color: metrics.wave.gateLocked ? palette.vermilionOrRed : palette.goldOrYellow
            });
          }

          if (hud.score !== undefined) {
            painter.fillText(String(Math.max(0, Math.floor(hud.score))).padStart(6, "0"), width - 16, 22, {
              fontFamily: fonts.data ?? "monospace",
              fontSize: 14,
              fontWeight: "bold",
              align: "right",
              baseline: "middle",
              color: palette.paperOrFloor
            });
            if ((hud.combo ?? 1) > 1) {
              painter.fillText("COMBO x" + (hud.combo ?? 1).toFixed(1), width - 16, 38, {
                fontFamily: fonts.data ?? "monospace",
                fontSize: 11,
                fontWeight: "bold",
                align: "right",
                baseline: "middle",
                color: palette.vermilionOrRed
              });
            }
          }

          if (hud.isGameOver) {
            painter.fillRect({ x: 0, y: 0, width, height }, { color: palette.inkOrOutline, alpha: 0.78 });
            painter.fillText("DOWN", width * 0.5, height * 0.5, {
              fontFamily: fonts.data ?? "monospace",
              fontSize: 28,
              fontWeight: "bold",
              align: "center",
              baseline: "middle",
              color: palette.vermilionOrRed
            });
          }
        } finally {
          painter.restore();
        }
        return;
      }

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

      } finally {
        painter.restore();
      }
    },
    renderBanner(painter: PresentationPainter, banner: PresentationBannerSnapshot, frame: PresentationFrame): void {
      if (!Number.isFinite(banner.remainingSeconds) || banner.remainingSeconds <= 0) return;
      const alpha = frame.reduceMotion
        ? 1
        : Math.min(1, Math.max(0, banner.remainingSeconds / 0.35));
      const width = Math.max(0, Math.min(180, frame.viewport.width - 32));
      const height = 70;

      painter.save();
      try {
        painter.setAlpha(alpha);
        if (descriptor.id === "fantasy") {
          painter.fillText(banner.text, frame.viewport.width * 0.5, frame.viewport.height * 0.38, {
            fontFamily: fonts.data ?? "monospace",
            fontSize: 42,
            fontWeight: "bold",
            align: "center",
            baseline: "middle",
            color: banner.text === "CLEAR" ? palette.goldOrYellow : palette.vermilionOrRed
          });
          if (banner.subtext) {
            painter.fillText(banner.subtext, frame.viewport.width * 0.5, frame.viewport.height * 0.38 + 28, {
              fontFamily: fonts.data ?? "monospace",
              fontSize: 14,
              align: "center",
              baseline: "middle",
              color: palette.secondary
            });
          }
          return;
        }
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
    renderGroundShadow(
      painter: PresentationPainter,
      entity: HitRunPresentationEntitySnapshot,
      _frame: PresentationFrame
    ): void {
      const data = entity.custom;
      if (!data) return;
      const elevation = Math.max(0, entity.elevation ?? 0);
      const size = Math.max(0, data.size * data.shadowSizeMultiplier);
      const isSumiE = descriptor.id === "sumi-e";
      const shadowScale = isSumiE
        ? Math.min(1, Math.max(0.3, 1 - elevation / 120))
        : Math.min(1, Math.max(0.4, 1 - elevation / 120));
      const alpha = (isSumiE ? 0.42 : 0.35) * shadowScale;
      const radiusX = size * (data.shadowRxRatio ?? (isSumiE ? 0.5 : 0.45)) * shadowScale;
      const radiusY = size * (data.shadowRyRatio ?? (isSumiE ? 0.16 : 0.15)) * shadowScale;

      painter.save();
      try {
        painter.translate(entity.transform.x, entity.transform.y);
        painter.fillEllipse(0, 0, radiusX, radiusY, 0, {
          color: isSumiE ? palette.inkOrOutline : "#000000",
          alpha
        });
      } finally {
        painter.restore();
      }
    },
    renderEntity(
      painter: PresentationPainter,
      entity: HitRunPresentationEntitySnapshot,
      frame: PresentationFrame
    ): void {
      const data = entity.custom;
      if (!data) return;
      const size = Math.max(1, data.size);
      const isSumiE = descriptor.id === "sumi-e";

      painter.save();
      try {
        painter.translate(entity.transform.x, entity.transform.y - Math.max(0, entity.elevation ?? 0));
        painter.scale(entity.facing ?? 1, 1);
        painter.setAlpha(entity.opacity);

        if (entity.visualId === "samurai") {
          renderSamurai(painter, entity, frame, palette, size);
          if ((entity.hitFlash ?? 0) > 0) {
            painter.fillEllipse(0, -size * 0.94, size * 0.38, size * 0.72, 0, {
              color: "#ffffff",
              alpha: 0.35
            });
          }
          return;
        }
        if ((entity.hitFlash ?? 0) > 0) {
          painter.fillCircle(0, -size * 0.5, size * 0.55, { color: "#ffffff" });
          return;
        }
        if (isSumiE) renderSumiEEntity(painter, entity, palette, size);
        else renderFantasyEntity(painter, entity, palette, size);
      } finally {
        painter.restore();
      }
    },
    renderProjectile(
      painter: PresentationPainter,
      entity: HitRunPresentationEntitySnapshot,
      _frame: PresentationFrame
    ): void {
      const data = entity.custom;
      if (!data) return;
      const size = Math.max(1, data.size);
      painter.save();
      try {
        painter.translate(entity.transform.x, entity.transform.y - Math.max(0, entity.elevation ?? 0));
        painter.scale(entity.facing ?? 1, 1);
        painter.setAlpha(entity.opacity);
        if (descriptor.id === "sumi-e") {
          painter.fillRect(
            { x: -size * 1.8, y: -size, width: size * 3.6, height: size * 2 },
            { color: palette.goldOrYellow }
          );
          painter.strokeRect(
            { x: -size * 1.8, y: -size, width: size * 3.6, height: size * 2 },
            { color: palette.inkOrOutline, width: 1 }
          );
          painter.fillText("封", 0, size * 0.4, {
            fontFamily: fonts.display ?? "serif",
            fontSize: Math.max(8, size * 1.2),
            fontWeight: "bold",
            align: "center",
            baseline: "middle",
            color: palette.vermilionOrRed
          });
        } else {
          const color = entity.tint ?? palette.accent;
          painter.fillEllipse(0, 0, size * 2.2, size * 0.7, 0, { color, alpha: 0.28 });
          painter.fillEllipse(0, 0, size * 1.5, size * 0.48, 0, { color, alpha: 0.55 });
          painter.fillEllipse(0, 0, size, size * 0.32, 0, { color });
        }
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
  HitRunPresentationEntitySnapshot,
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

