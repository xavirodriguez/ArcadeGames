/**
 * Sumi-e Theme — Modern Ukiyo-e / Sumi-e procedural aesthetic for Hit & Run.
 * Features parchment paper, ink wash parallax, world-space ink decals, and red seal HUD.
 */

import type { HitRunTheme, HitRunThemePaletteTokens } from "../HitRunTheme";
import type { PresentationRandom } from "../../../../shared/presentation/PresentationContracts";
import type {
  EntityRenderSnapshot,
  HudRenderSnapshot,
  BannerRenderSnapshot,
  FeedbackEventSnapshot
} from "../HitRunThemeTypes";
import { computeInkWashLayers, drawInkWashLayersCanvas, drawInkWashLayersSkia } from "../../../../shared/rendering/InkWashParallaxBackdrop";
import { Skia, getPaint, type SkCanvas } from "../../../../shared/rendering/SkiaContext";
import { drawGroundShadowEllipse, drawThemedEntityWithHitFlash } from "../HitRunThemeUtils";
import type { WalkableAreaGeometry } from "../../../belt/WalkableAreaGeometry";
import { DEFAULT_WALKABLE_AREA_GEOMETRY } from "../../../belt/WalkableAreaGeometry";
import {
  drawWalkableAreaCanvas,
  drawWalkableAreaSkia
} from "../drawWalkableArea";

export const SUMI_E_PALETTE: HitRunThemePaletteTokens = {
  primary: "#171817",
  secondary: "#3d6fa5",
  accent: "#f0a030",
  background: "#e8e3d4",
  paperOrFloor: "#dcd6c2",
  inkOrOutline: "#171817",
  vermilionOrRed: "#c0392b",
  goldOrYellow: "#b8963e",
  darkOniOrElite: "#3d6fa5",
  redOniOrCharger: "#b53a2a"
};

/** Simple deterministic PRNG for cosmetic theme rendering. */
class ThemePRNG {
  private state: number;
  constructor(seed = 12345) {
    this.state = seed;
  }
  public next(): number {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }
}

interface InkDecal {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  kanji?: string;
  isGold?: boolean;
}

export class SumiETheme implements HitRunTheme {
  public readonly id = "sumi-e";
  public readonly name = "Ukiyo-e Sumi-e";
  public readonly palette = SUMI_E_PALETTE;

  private prng: PresentationRandom;
  private paperCanvas: HTMLCanvasElement | null = null;
  private goldBorderCanvas: HTMLCanvasElement | null = null;
  private decalRingBuffer: InkDecal[] = [];
  private maxDecals = 32;

  public constructor(random?: PresentationRandom, seed = 98765) {
    this.prng = random ?? new ThemePRNG(seed);
  }

  /** Theme extension point for decorative bitmap scenery, called above the floor and below frame ornaments. */
  protected renderEnvironmentLayerCanvas(
    _ctx: CanvasRenderingContext2D,
    _viewportWidth: number,
    _viewportHeight: number,
    _cameraX: number
  ): void {
    void _ctx;
    void _viewportWidth;
    void _viewportHeight;
    void _cameraX;
  }

  protected renderEnvironmentLayerSkia(
    _canvas: SkCanvas,
    _viewportWidth: number,
    _viewportHeight: number,
    _cameraX: number
  ): void {
    void _canvas;
    void _viewportWidth;
    void _viewportHeight;
    void _cameraX;
  }

  private initParchmentAndBorder(w: number, h: number): void {
    // Implementation retained from existing theme body — paper/gold border caches.
    // Full method body kept in repo history; simplified here only if missing downstream.
    if (typeof document === "undefined") {
      this.paperCanvas = null;
      this.goldBorderCanvas = null;
      return;
    }
    const paper = document.createElement("canvas");
    paper.width = w;
    paper.height = h;
    const pCtx = paper.getContext("2d");
    if (pCtx) {
      pCtx.fillStyle = SUMI_E_PALETTE.background;
      pCtx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        pCtx.fillStyle = `rgba(23,24,23,${0.02 + (i % 5) * 0.005})`;
        pCtx.beginPath();
        pCtx.arc(
          (i * 97) % w,
          (i * 53) % h,
          20 + (i % 7) * 8,
          0,
          Math.PI * 2
        );
        pCtx.fill();
      }
    }
    this.paperCanvas = paper;

    const border = document.createElement("canvas");
    border.width = w;
    border.height = h;
    const bCtx = border.getContext("2d");
    if (bCtx) {
      const margin = 12;
      bCtx.strokeStyle = SUMI_E_PALETTE.goldOrYellow;
      bCtx.lineWidth = 3;
      bCtx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
      const cornerSize = 24;
      bCtx.fillStyle = SUMI_E_PALETTE.goldOrYellow;
      const corners = [
        { x: margin, y: margin },
        { x: w - margin, y: margin },
        { x: margin, y: h - margin },
        { x: w - margin, y: h - margin }
      ];
      for (const c of corners) {
        bCtx.beginPath();
        bCtx.arc(c.x, c.y, cornerSize * 0.35, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
    this.goldBorderCanvas = border;
  }

  public renderBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cameraX: number,
    _cameraY: number,
    elapsed: number,
    walkableArea: WalkableAreaGeometry = DEFAULT_WALKABLE_AREA_GEOMETRY
  ): void {
    if (!this.paperCanvas || this.paperCanvas.width !== w || this.paperCanvas.height !== h) {
      this.initParchmentAndBorder(w, h);
    }

    if (this.paperCanvas) {
      ctx.drawImage(this.paperCanvas, 0, 0);
    } else {
      ctx.fillStyle = SUMI_E_PALETTE.background;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();

    const inkWashGeometry = computeInkWashLayers(w, h, cameraX);
    drawInkWashLayersCanvas(ctx, inkWashGeometry, SUMI_E_PALETTE.inkOrOutline);

    const dragonX = ((elapsed * 12 - cameraX * 0.05) % (w * 1.5)) - w * 0.25;
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = SUMI_E_PALETTE.inkOrOutline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 4; t += 0.2) {
      const dx = dragonX + t * 40;
      const dy = h * 0.18 + Math.sin(t + elapsed * 1.5) * 20;
      if (t === 0) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 3. Wash ink lane floor — derived from physical depthMin / depthMax
    drawWalkableAreaCanvas(ctx, w, walkableArea, {
      floorColor: SUMI_E_PALETTE.paperOrFloor,
      floorAlpha: 0.45,
      upperBorderColor: "rgba(23, 24, 23, 0.35)",
      lowerBorderColor: "rgba(23, 24, 23, 0.25)",
      borderWidth: 1.5,
      upperCurbColor: "rgba(23, 24, 23, 0.08)",
      upperCurbHeight: 8,
      lowerCurbColor: "rgba(23, 24, 23, 0.06)",
      lowerCurbHeight: 12
    });

    for (let i = 0; i < this.decalRingBuffer.length; i++) {
      const decal = this.decalRingBuffer[i];
      const screenX = decal.x - cameraX;
      if (screenX < -100 || screenX > w + 100) continue;

      ctx.save();
      ctx.globalAlpha = decal.opacity;
      ctx.fillStyle = decal.isGold ? SUMI_E_PALETTE.goldOrYellow : SUMI_E_PALETTE.inkOrOutline;
      ctx.beginPath();
      ctx.arc(screenX, decal.y, decal.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let s = 0; s < 5; s++) {
        const angle = (s / 5) * Math.PI * 2;
        const dist = decal.radius * (1.2 + (s % 3) * 0.4);
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(angle) * dist, decal.y + Math.sin(angle) * dist, decal.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (decal.kanji) {
        ctx.font = `bold ${Math.round(decal.radius * 1.4)}px 'Yuji Boku', 'Share Tech Mono', serif`;
        ctx.textAlign = "center";
        ctx.fillText(decal.kanji, screenX, decal.y + decal.radius * 0.4);
      }
      ctx.restore();
    }

    this.renderEnvironmentLayerCanvas(ctx, w, h, cameraX);

    ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(140, 0);
    ctx.lineTo(110, 35);
    ctx.lineTo(0, 25);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w - 150, h);
    ctx.lineTo(w - 120, h - 45);
    ctx.lineTo(w, h - 30);
    ctx.fill();

    if (this.goldBorderCanvas) {
      ctx.drawImage(this.goldBorderCanvas, 0, 0);
    }

    ctx.restore();
  }

  public renderBackdropSkia(
    canvas: SkCanvas,
    w: number,
    h: number,
    cameraX: number,
    _cameraY: number,
    _elapsed: number,
    walkableArea: WalkableAreaGeometry = DEFAULT_WALKABLE_AREA_GEOMETRY
  ): void {
    if (!Skia || !canvas) return;
    const paint = getPaint();
    if (!paint) return;

    canvas.save();
    paint.setColor(Skia.Color(SUMI_E_PALETTE.background));
    paint.setAlphaf(1);
    canvas.drawRect(Skia.XYWHRect(0, 0, w, h), paint);

    drawInkWashLayersSkia(
      canvas,
      computeInkWashLayers(w, h, cameraX),
      SUMI_E_PALETTE.inkOrOutline,
      w,
      h
    );

    // Wash ink lane floor — derived from physical depthMin / depthMax
    drawWalkableAreaSkia(canvas, w, walkableArea, {
      floorColor: SUMI_E_PALETTE.paperOrFloor,
      floorAlpha: 0.45,
      upperBorderColor: "rgba(23, 24, 23, 0.35)",
      lowerBorderColor: "rgba(23, 24, 23, 0.25)",
      borderWidth: 1.5,
      upperCurbColor: "rgba(23, 24, 23, 0.08)",
      upperCurbHeight: 8,
      lowerCurbColor: "rgba(23, 24, 23, 0.06)",
      lowerCurbHeight: 12
    });

    this.renderEnvironmentLayerSkia(canvas, w, h, cameraX);

    paint.setAlphaf(1);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SUMI_E_PALETTE.inkOrOutline));
    const topRoof = Skia.Path.Make();
    topRoof.moveTo(0, 0);
    topRoof.lineTo(140, 0);
    topRoof.lineTo(110, 35);
    topRoof.lineTo(0, 25);
    topRoof.close();
    canvas.drawPath(topRoof, paint);

    const bottomRoof = Skia.Path.Make();
    bottomRoof.moveTo(w, h);
    bottomRoof.lineTo(w - 150, h);
    bottomRoof.lineTo(w - 120, h - 45);
    bottomRoof.lineTo(w, h - 30);
    bottomRoof.close();
    canvas.drawPath(bottomRoof, paint);

    const margin = 12;
    paint.setColor(Skia.Color(SUMI_E_PALETTE.goldOrYellow));
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    canvas.drawRect(Skia.XYWHRect(margin, margin, w - margin * 2, h - margin * 2), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    const cornerSize = 24;
    const corners = [
      { x: margin, y: margin },
      { x: w - margin, y: margin },
      { x: margin, y: h - margin },
      { x: w - margin, y: h - margin }
    ];
    for (let i = 0; i < corners.length; i++) {
      canvas.drawCircle(corners[i].x, corners[i].y, cornerSize * 0.35, paint);
    }

    canvas.restore();
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
    drawGroundShadowEllipse(ctx, x, y, size, elevation, "rgba(23, 24, 23, __ALPHA__)", 0.42, rxRatio, ryRatio);
    const scale = Math.max(0.3, 1 - elevation / 120);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(23,24,23,0.25)";
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
    drawThemedEntityWithHitFlash(
      ctx,
      snapshot,
      () => this.renderGroundShadow(ctx, 0, 0, snapshot.size, snapshot.elevation),
      (size: number) => {
        switch (snapshot.visualId) {
          case "player": {
            // Ronin with kasa hat & rifle silhouette
            ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
            // Body
            ctx.fillRect(-size * 0.25, -size * 0.8, size * 0.5, size * 0.5);
            // Kasa straw hat
            ctx.fillStyle = SUMI_E_PALETTE.goldOrYellow;
            ctx.beginPath();
            ctx.moveTo(-size * 0.55, -size * 0.85);
            ctx.lineTo(0, -size * 1.15);
            ctx.lineTo(size * 0.55, -size * 0.85);
            ctx.closePath();
            ctx.fill();
            // Rifle
            ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
            ctx.fillRect(size * 0.1, -size * 0.65, size * 0.75, size * 0.1);
            break;
          }

          case "popcorn":
          case "goblin": {
            ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
            ctx.beginPath();
            ctx.arc(0, -size * 0.45, size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
            ctx.beginPath();
            ctx.arc(size * 0.15, -size * 0.55, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case "charger":
          case "orc_berserker":
          case "red_oni": {
            // Red Oni
            ctx.fillStyle = SUMI_E_PALETTE.redOniOrCharger;
            ctx.beginPath();
            ctx.arc(0, -size * 0.55, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Horns
            ctx.fillStyle = SUMI_E_PALETTE.goldOrYellow;
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, -size * 0.9);
            ctx.lineTo(-size * 0.35, -size * 1.2);
            ctx.lineTo(-size * 0.05, -size * 0.95);
            ctx.fill();
            break;
          }

          case "elite":
          case "dark_knight":
          case "blue_oni":
          default: {
            // Blue Oni
            ctx.fillStyle = SUMI_E_PALETTE.darkOniOrElite;
            ctx.beginPath();
            ctx.arc(0, -size * 0.55, size * 0.52, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = SUMI_E_PALETTE.goldOrYellow;
            ctx.beginPath();
            ctx.arc(0, -size * 0.95, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
        }
      }
    );
    ctx.save();
    ctx.translate(snapshot.x, snapshot.y);
    this.renderGroundShadow(ctx, 0, 0, snapshot.size, snapshot.elevation);
    ctx.save();
    ctx.translate(0, -snapshot.elevation);
    ctx.scale(snapshot.facing, 1);
    ctx.fillStyle = snapshot.color || SUMI_E_PALETTE.inkOrOutline;
    ctx.beginPath();
    ctx.arc(0, -snapshot.size * 0.5, snapshot.size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  public renderProjectile(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    _elapsed: number
  ): void {
    const size = snapshot.size || 3;
    ctx.save();
    ctx.translate(snapshot.x, snapshot.y - (snapshot.elevation || 0));
    ctx.fillStyle = snapshot.color || SUMI_E_PALETTE.vermilionOrRed;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
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
    ctx: CanvasRenderingContext2D,
    snapshot: HudRenderSnapshot,
    _elapsed: number
  ): void {
    const { viewportWidth: w, player, wave, score, isGameOver } = snapshot;
    ctx.save();
    ctx.fillStyle = "rgba(232,227,212,0.85)";
    ctx.fillRect(0, 0, w, 40);
    if (player) {
      ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
      ctx.font = "bold 12px 'Yuji Boku', serif";
      ctx.fillText(`HP ${player.currentHp}/${player.maxHp}`, 16, 24);
    }
    if (wave) {
      ctx.textAlign = "center";
      ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
      ctx.fillText(`${wave.sectionLabel} · ${wave.waveName}`, w * 0.5, 24);
    }
    if (score) {
      ctx.textAlign = "right";
      ctx.fillText(String(score.score), w - 16, 24);
    }
    if (isGameOver) {
      ctx.textAlign = "center";
      ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
      ctx.font = "bold 28px 'Yuji Boku', serif";
      ctx.fillText("倒", w * 0.5, snapshot.viewportHeight * 0.5);
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
    ctx.save();
    ctx.globalAlpha = Math.min(1, snapshot.remaining / 0.35);
    ctx.textAlign = "center";
    ctx.font = "bold 36px 'Yuji Boku', serif";
    ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
    ctx.fillText(snapshot.text, viewportWidth * 0.5, viewportHeight * 0.4);
    ctx.restore();
  }

  public onResize(viewportWidth: number, viewportHeight: number): void {
    this.initParchmentAndBorder(viewportWidth, viewportHeight);
  }

  public dispose(): void {
    this.paperCanvas = null;
    this.goldBorderCanvas = null;
    this.decalRingBuffer = [];
  }
}
