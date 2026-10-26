/**
 * FantasyTheme — default theme for Hit & Run replicating existing visual art.
 * Optimized with offscreen gradient/canvas caching and procedural urban backdrop scenery.
 */

import type { HitRunTheme, HitRunThemePaletteTokens } from "../HitRunTheme";
import type {
  EntityRenderSnapshot,
  HudRenderSnapshot,
  BannerRenderSnapshot,
  FeedbackEventSnapshot
} from "../HitRunThemeTypes";
import { HIT_PALETTE } from "../../HitAndRunPalette";
import { colors } from "../../../../../theme/colors";
import { generateProceduralScene } from "../../../../shared/procedural/scene/ProceduralSceneGenerator";
import { drawProceduralSceneCanvas } from "../../../../shared/procedural/rendering/drawProceduralSceneCanvas";

export const FANTASY_PALETTE_TOKENS: HitRunThemePaletteTokens = {
  primary: "#3d4a5c",
  secondary: "#5a6a80",
  accent: HIT_PALETTE.hitRunYellow,
  background: "#0a0612",
  paperOrFloor: "#243028",
  inkOrOutline: "#1a1220",
  vermilionOrRed: HIT_PALETTE.hitRunRed,
  goldOrYellow: HIT_PALETTE.hitRunYellow,
  darkOniOrElite: HIT_PALETTE.wraithViolet,
  redOniOrCharger: "#ef4444"
};

export class FantasyTheme implements HitRunTheme {
  public readonly id = "fantasy";
  public readonly name = "Dark Fantasy";
  public readonly palette = FANTASY_PALETTE_TOKENS;

  private bodyGrad: CanvasGradient | null = null;
  private topHudGrad: CanvasGradient | null = null;

  private getBodyGrad(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
    if (!this.bodyGrad) {
      this.bodyGrad = ctx.createLinearGradient(-size * 0.3, -size * 0.85, size * 0.3, -size * 0.35);
      this.bodyGrad.addColorStop(0, "#3d4a5c");
      this.bodyGrad.addColorStop(0.5, "#5a6a80");
      this.bodyGrad.addColorStop(1, "#2a3340");
    }
    return this.bodyGrad;
  }

  private getTopHudGrad(ctx: CanvasRenderingContext2D): CanvasGradient {
    if (!this.topHudGrad) {
      this.topHudGrad = ctx.createLinearGradient(0, 0, 0, 48);
      this.topHudGrad.addColorStop(0, colors.panelStrong);
      this.topHudGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    return this.topHudGrad;
  }

  public renderBackdrop(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
    _cameraX: number,
    _cameraY: number,
    _elapsed: number
  ): void {
    ctx.save();
    ctx.fillStyle = FANTASY_PALETTE_TOKENS.background;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    // Controlled alpha procedural backdrop to preserve combat legibility
    ctx.globalAlpha = 0.35;
    const procScene = generateProceduralScene({
      seed: 41873,
      width: viewportWidth,
      height: viewportHeight,
      theme: "urban",
      density: 0.6
    });
    drawProceduralSceneCanvas(ctx, procScene);
    ctx.restore();
  }

  public renderGroundShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elevation: number,
    rxRatio = 0.45,
    ryRatio = 0.15
  ): void {
    const shadowScale = Math.min(1, Math.max(0.4, 1 - elevation / 120));
    const shadowAlpha = 0.35 * shadowScale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * rxRatio * shadowScale, size * ryRatio * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public renderEntity(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    _elapsed: number
  ): void {
    ctx.save();
    ctx.translate(snapshot.x, snapshot.y);

    this.renderGroundShadow(ctx, 0, 0, snapshot.size, snapshot.elevation);

    ctx.save();
    ctx.translate(0, -snapshot.elevation);
    ctx.scale(snapshot.facing, 1);

    if (snapshot.hitFlash > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -snapshot.size * 0.5, snapshot.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
      return;
    }

    const size = snapshot.size;

    switch (snapshot.visualId) {
      case "player": {
        // Legs
        ctx.strokeStyle = "#1a1220";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, -size * 0.35);
        ctx.lineTo(-size * 0.18, 0);
        ctx.moveTo(size * 0.12, -size * 0.35);
        ctx.lineTo(size * 0.18, 0);
        ctx.stroke();

        // Boots
        ctx.fillStyle = "#151b23";
        ctx.fillRect(-size * 0.29, -size * 0.08, size * 0.2, size * 0.08);
        ctx.fillRect(size * 0.09, -size * 0.08, size * 0.2, size * 0.08);

        // Body
        ctx.fillStyle = this.getBodyGrad(ctx, size);
        ctx.strokeStyle = HIT_PALETTE.hitRunRed;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-size * 0.28, -size * 0.85, size * 0.56, size * 0.5, 4);
        else ctx.rect(-size * 0.28, -size * 0.85, size * 0.56, size * 0.5);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = "#1e2430";
        ctx.beginPath();
        ctx.arc(0, -size * 0.98, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HIT_PALETTE.hitRunYellow;
        ctx.beginPath();
        ctx.ellipse(size * 0.08, -size * 1.0, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // HMG Weapon
        ctx.fillStyle = "#1a1a22";
        ctx.fillRect(size * 0.15, -size * 0.68, size * 0.55, size * 0.14);
        ctx.fillStyle = "#3a3a48";
        ctx.fillRect(size * 0.65, -size * 0.64, size * 0.22, size * 0.06);
        break;
      }

      case "popcorn":
      case "goblin": {
        ctx.fillStyle = snapshot.color || "#f97316";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -size * 0.45, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff4db";
        ctx.beginPath();
        ctx.arc(-size * 0.12, -size * 0.53, size * 0.115, 0, Math.PI * 2);
        ctx.arc(size * 0.14, -size * 0.53, size * 0.115, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "wall_trooper":
      case "skeleton": {
        ctx.fillStyle = snapshot.color || "#78716c";
        ctx.strokeStyle = "#a8a29e";
        ctx.lineWidth = 2;
        ctx.fillRect(-size * 0.4, -size, size * 0.8, size);
        ctx.strokeRect(-size * 0.4, -size, size * 0.8, size);
        break;
      }

      case "hopper":
      case "cave_hopper": {
        ctx.fillStyle = snapshot.color || "#a855f7";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.55, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "charger":
      case "orc_berserker": {
        ctx.fillStyle = snapshot.color || "#ef4444";
        ctx.beginPath();
        ctx.moveTo(size * 0.65, -size * 0.42);
        ctx.lineTo(-size * 0.45, -size * 0.84);
        ctx.lineTo(-size * 0.25, -size * 0.42);
        ctx.lineTo(-size * 0.45, 0);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case "elite":
      case "dark_knight":
      case "warlord":
      default: {
        ctx.fillStyle = snapshot.color || "#eab308";
        ctx.beginPath();
        ctx.arc(0, -size * 0.5, size * 0.42, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
    ctx.restore();
  }

  public renderProjectile(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    _elapsed: number
  ): void {
    const size = snapshot.size || 3;
    const color = snapshot.color || "#fbbf24";

    ctx.save();
    ctx.translate(snapshot.x, snapshot.y);
    this.renderGroundShadow(ctx, 0, 0, size * 1.5, snapshot.elevation, 0.4, 0.12);

    ctx.save();
    ctx.translate(0, -snapshot.elevation);
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 2.2, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  public renderFeedback(
    _ctx: CanvasRenderingContext2D,
    _event: FeedbackEventSnapshot,
    _cameraX: number,
    _cameraY: number,
    _elapsed: number
  ): void {}

  public renderHud(
    ctx: CanvasRenderingContext2D,
    snapshot: HudRenderSnapshot,
    _elapsed: number
  ): void {
    const { viewportWidth: w, viewportHeight: h, player, wave, score, isGameOver } = snapshot;

    ctx.save();

    const barH = 36;
    ctx.fillStyle = this.getTopHudGrad(ctx);
    ctx.fillRect(0, 0, w, barH + 16);

    if (player) {
      const maxHp = player.maxHp || 3;
      const curHp = player.currentHp;
      const pipW = 18;
      const pipH = 10;
      const startX = 16;
      const pipY = 14;
      for (let i = 0; i < maxHp; i++) {
        const x = startX + i * (pipW + 6);
        ctx.fillStyle = i < curHp ? HIT_PALETTE.hitRunRed : colors.surface;
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, pipY, pipW, pipH, 2);
        else ctx.rect(x, pipY, pipW, pipH);
        ctx.fill();
        ctx.stroke();
      }

      const weaponId = (player.weaponId || "longbow").toUpperCase();
      const ammoText = player.ammoCurrent === Number.POSITIVE_INFINITY ? "∞" : `${player.ammoCurrent}/${player.ammoMax}`;
      ctx.font = "bold 12px 'Share Tech Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = HIT_PALETTE.hitRunYellow;
      ctx.fillText(`${weaponId} [${ammoText}]`, startX + maxHp * (pipW + 6) + 16, 22);
    }

    if (wave) {
      ctx.textAlign = "center";
      ctx.font = "bold 12px 'Share Tech Mono', monospace";
      ctx.fillStyle = colors.neutral[100];
      ctx.fillText(`${wave.sectionLabel}  ·  ${wave.waveName}`, w * 0.5, 16);
      ctx.font = "10px 'Share Tech Mono', monospace";
      ctx.fillStyle = wave.gateLocked ? HIT_PALETTE.hitRunRed : HIT_PALETTE.hitRunYellow;
      const gateTag = wave.gateLocked ? "GATE LOCKED" : wave.sectionCleared ? "GATE OPEN" : "GATE LOCKED";
      ctx.fillText(`${gateTag}  ·  ALIVE ${wave.aliveEnemies}`, w * 0.5, 30);
    }

    if (score) {
      ctx.textAlign = "right";
      ctx.font = "bold 14px 'Share Tech Mono', monospace";
      ctx.fillStyle = colors.neutral[200];
      ctx.fillText(String(score.score).padStart(6, "0"), w - 16, 22);
      if (score.comboMultiplier > 1) {
        ctx.font = "bold 11px 'Share Tech Mono', monospace";
        ctx.fillStyle = HIT_PALETTE.hitRunRed;
        ctx.fillText(`COMBO x${score.comboMultiplier.toFixed(1)}`, w - 16, 36);
      }
    }

    if (isGameOver) {
      ctx.fillStyle = colors.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = "bold 28px 'Share Tech Mono', monospace";
      ctx.fillStyle = HIT_PALETTE.hitRunRed;
      ctx.fillText("DOWN", w * 0.5, h * 0.5);
    }

    ctx.restore();
  }

  public renderSectionBanner(
    ctx: CanvasRenderingContext2D,
    snapshot: BannerRenderSnapshot,
    viewportWidth: number,
    viewportHeight: number,
    _elapsed: number
  ): void {
    if (snapshot.remaining <= 0) return;
    const a = Math.min(1, snapshot.remaining / 0.35);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.font = "bold 42px 'Share Tech Mono', monospace";
    ctx.fillStyle = snapshot.text === "CLEAR" ? HIT_PALETTE.hitRunYellow : HIT_PALETTE.hitRunRed;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fillText(snapshot.text, viewportWidth * 0.5, viewportHeight * 0.38);
    if (snapshot.sub) {
      ctx.shadowBlur = 0;
      ctx.font = "14px 'Share Tech Mono', monospace";
      ctx.fillStyle = colors.textSecondary;
      ctx.fillText(snapshot.sub, viewportWidth * 0.5, viewportHeight * 0.38 + 28);
    }
    ctx.restore();
  }

  public onResize(_viewportWidth: number, _viewportHeight: number): void {
    this.bodyGrad = null;
    this.topHudGrad = null;
  }

  public dispose(): void {
    this.bodyGrad = null;
    this.topHudGrad = null;
  }
}
