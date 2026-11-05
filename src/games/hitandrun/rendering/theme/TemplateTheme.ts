/**
 * TemplateTheme — starter template for creating new Hit & Run visual themes.
 * Demonstrates dual Canvas + Skia backdrop via the neutral solid painter.
 */

import type { SkCanvas } from "@shopify/react-native-skia";
import type { HitRunTheme, HitRunThemePaletteTokens } from "./HitRunTheme";
import type {
  EntityRenderSnapshot,
  HudRenderSnapshot,
  BannerRenderSnapshot,
  FeedbackEventSnapshot
} from "./HitRunThemeTypes";
import { drawThemeEntityContext } from "./HitRunThemeUtils";
import {
  paintSolidBackdropCanvas,
  paintSolidBackdropSkia
} from "./neutralBackdropPainter";

export const TEMPLATE_PALETTE: HitRunThemePaletteTokens = {
  primary: "#2b2b2b",
  secondary: "#4a4a4a",
  accent: "#ffcc00",
  background: "#111111",
  paperOrFloor: "#222222",
  inkOrOutline: "#000000",
  vermilionOrRed: "#ff3333",
  goldOrYellow: "#ffcc00",
  darkOniOrElite: "#3366cc",
  redOniOrCharger: "#cc3333"
};

export class TemplateTheme implements HitRunTheme {
  public readonly id = "template";
  public readonly name = "Template Theme";
  public readonly palette = TEMPLATE_PALETTE;

  public renderBackdrop(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
    _cameraX: number,
    _cameraY: number,
    _elapsed: number
  ): void {
    paintSolidBackdropCanvas(ctx, viewportWidth, viewportHeight, this.palette.background);
  }

  public renderBackdropSkia(
    canvas: SkCanvas,
    viewportWidth: number,
    viewportHeight: number,
    _cameraX: number,
    _cameraY: number,
    _elapsed: number
  ): void {
    paintSolidBackdropSkia(canvas, viewportWidth, viewportHeight, this.palette.background);
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
    const scale = Math.max(0.3, 1 - elevation / 120);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * rxRatio * scale, size * ryRatio * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public renderEntity(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    _elapsed: number
  ): void {
    drawThemeEntityContext(
      ctx,
      snapshot,
      () => this.renderGroundShadow(ctx, 0, 0, snapshot.size, snapshot.elevation),
      () => {
        ctx.fillStyle = snapshot.color || this.palette.primary;
        ctx.beginPath();
        ctx.arc(0, -snapshot.size * 0.5, snapshot.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    );
  }

  public renderProjectile(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    _elapsed: number
  ): void {
    ctx.save();
    ctx.translate(snapshot.x, snapshot.y - snapshot.elevation);
    ctx.fillStyle = snapshot.color || this.palette.accent;
    ctx.beginPath();
    ctx.arc(0, 0, snapshot.size, 0, Math.PI * 2);
    ctx.fill();
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
    _ctx: CanvasRenderingContext2D,
    _snapshot: HudRenderSnapshot,
    _elapsed: number
  ): void {}

  public renderSectionBanner(
    _ctx: CanvasRenderingContext2D,
    _snapshot: BannerRenderSnapshot,
    _viewportWidth: number,
    _viewportHeight: number,
    _elapsed: number
  ): void {}

  public onResize(_viewportWidth: number, _viewportHeight: number): void {}

  public dispose(): void {}
}
