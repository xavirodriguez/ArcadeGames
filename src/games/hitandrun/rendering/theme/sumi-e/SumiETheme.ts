/**
 * Sumi-e Theme — Modern Ukiyo-e / Sumi-e procedural aesthetic for Hit & Run.
 * Features parchment paper, ink wash parallax, world-space ink decals, and red seal HUD.
 */

import type { HitRunTheme, HitRunThemePaletteTokens } from "../HitRunTheme";
import type {
  EntityRenderSnapshot,
  HudRenderSnapshot,
  BannerRenderSnapshot,
  FeedbackEventSnapshot
} from "../HitRunThemeTypes";
import { computeInkWashLayers, drawInkWashLayersCanvas, drawInkWashLayersSkia } from "../../../../shared/rendering/InkWashParallaxBackdrop";
import { Skia, getPaint, type SkCanvas } from "../../../../shared/rendering/SkiaContext";

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

  private prng = new ThemePRNG(98765);
  private paperCanvas: HTMLCanvasElement | null = null;
  private goldBorderCanvas: HTMLCanvasElement | null = null;
  private decalRingBuffer: InkDecal[] = [];
  private maxDecals = 32;

  public constructor() {
    // Pre-seed decal buffer
  }

  private initParchmentAndBorder(w: number, h: number): void {
    if (typeof document === "undefined" || typeof document.createElement !== "function") return;

    // 1. Parchment texture offscreen canvas
    this.paperCanvas = document.createElement("canvas");
    this.paperCanvas.width = w;
    this.paperCanvas.height = h;
    const pCtx = this.paperCanvas.getContext("2d");
    if (pCtx) {
      pCtx.fillStyle = SUMI_E_PALETTE.background;
      pCtx.fillRect(0, 0, w, h);

      // Fine paper grain noise
      const imgData = pCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (this.prng.next() - 0.5) * 12;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      pCtx.putImageData(imgData, 0, 0);

      // Soft vignette
      const vig = pCtx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.7);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(70, 50, 30, 0.18)");
      pCtx.fillStyle = vig;
      pCtx.fillRect(0, 0, w, h);
    }

    // 2. Gold ornamental frame offscreen canvas
    this.goldBorderCanvas = document.createElement("canvas");
    this.goldBorderCanvas.width = w;
    this.goldBorderCanvas.height = h;
    const gCtx = this.goldBorderCanvas.getContext("2d");
    if (gCtx) {
      const margin = 12;
      gCtx.strokeStyle = SUMI_E_PALETTE.goldOrYellow;
      gCtx.lineWidth = 3;
      gCtx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

      // Corner ornaments
      const cornerSize = 24;
      const corners = [
        { x: margin, y: margin },
        { x: w - margin, y: margin },
        { x: margin, y: h - margin },
        { x: w - margin, y: h - margin }
      ];
      gCtx.fillStyle = SUMI_E_PALETTE.goldOrYellow;
      for (let i = 0; i < corners.length; i++) {
        const c = corners[i];
        gCtx.beginPath();
        gCtx.arc(c.x, c.y, cornerSize * 0.35, 0, Math.PI * 2);
        gCtx.fill();
      }
    }
  }

  public renderBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cameraX: number,
    _cameraY: number,
    elapsed: number
  ): void {
    if (!this.paperCanvas || this.paperCanvas.width !== w || this.paperCanvas.height !== h) {
      this.initParchmentAndBorder(w, h);
    }

    // 1. Parchment paper background
    if (this.paperCanvas) {
      ctx.drawImage(this.paperCanvas, 0, 0);
    } else {
      ctx.fillStyle = SUMI_E_PALETTE.background;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();

    // 2. Parallax layers (4 layers of ink wash: far mountains, pagodas, pines, houses)
    const inkWashGeometry = computeInkWashLayers(w, h, cameraX);
    drawInkWashLayersCanvas(ctx, inkWashGeometry, SUMI_E_PALETTE.inkOrOutline);

    // Faded ghost dragon in sky background
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

    // 3. Wash ink lane floor
    const laneY = h * 0.45;
    const laneH = h * 0.48;
    ctx.fillStyle = "rgba(220, 214, 194, 0.4)";
    ctx.fillRect(0, laneY, w, laneH);
    ctx.strokeStyle = "rgba(23, 24, 23, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, laneY);
    ctx.lineTo(w, laneY);
    ctx.moveTo(0, laneY + laneH);
    ctx.lineTo(w, laneY + laneH);
    ctx.stroke();

    // 4. World-space Decals (anchored in world coordinates, translated by cameraX)
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

      // Splatter satellite drops
      for (let s = 0; s < 5; s++) {
        const angle = (s / 5) * Math.PI * 2;
        const dist = decal.radius * (1.2 + (s % 3) * 0.4);
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(angle) * dist, decal.y + Math.sin(angle) * dist, decal.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Kanji
      if (decal.kanji) {
        ctx.font = `bold ${Math.round(decal.radius * 1.4)}px 'Yuji Boku', 'Share Tech Mono', serif`;
        ctx.textAlign = "center";
        ctx.fillText(decal.kanji, screenX, decal.y + decal.radius * 0.4);
      }
      ctx.restore();
    }

    // 5. Foreground roof/branch silhouettes strictly on margins
    ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
    ctx.beginPath();
    // Top-left roof
    ctx.moveTo(0, 0);
    ctx.lineTo(140, 0);
    ctx.lineTo(110, 35);
    ctx.lineTo(0, 25);
    ctx.fill();

    // Bottom-right roof
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w - 150, h);
    ctx.lineTo(w - 120, h - 45);
    ctx.lineTo(w, h - 30);
    ctx.fill();

    // Gold border frame
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
    _elapsed: number
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

    paint.setColor(Skia.Color(SUMI_E_PALETTE.paperOrFloor));
    paint.setAlphaf(0.4);
    const laneY = h * 0.45;
    const laneH = h * 0.48;
    canvas.drawRect(Skia.XYWHRect(0, laneY, w, laneH), paint);

    paint.setColor(Skia.Color(SUMI_E_PALETTE.inkOrOutline));
    paint.setAlphaf(0.15);
    const lanePath = Skia.Path.Make();
    lanePath.moveTo(0, laneY);
    lanePath.lineTo(w, laneY);
    lanePath.moveTo(0, laneY + laneH);
    lanePath.lineTo(w, laneY + laneH);
    canvas.drawPath(lanePath, paint);

    paint.setAlphaf(1);
    canvas.restore();
  }

  public renderGroundShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elevation: number,
    rxRatio = 0.5,
    ryRatio = 0.16
  ): void {
    const shadowScale = Math.min(1, Math.max(0.3, 1 - elevation / 120));
    const shadowAlpha = 0.42 * shadowScale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(23, 24, 23, ${shadowAlpha.toFixed(3)})`;
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

    // Ground ink shadow
    this.renderGroundShadow(ctx, 0, 0, snapshot.size, snapshot.elevation);

    // Entity body
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

    ctx.restore();
    ctx.restore();
  }

  public renderProjectile(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    _elapsed: number
  ): void {
    const size = snapshot.size || 4;

    ctx.save();
    ctx.translate(snapshot.x, snapshot.y);
    this.renderGroundShadow(ctx, 0, 0, size * 1.5, snapshot.elevation, 0.4, 0.12);

    ctx.save();
    ctx.translate(0, -snapshot.elevation);

    // Ofuda talisman card
    ctx.shadowColor = SUMI_E_PALETTE.accent;
    ctx.shadowBlur = 10;
    ctx.fillStyle = SUMI_E_PALETTE.goldOrYellow;
    ctx.fillRect(-size * 1.8, -size * 1.0, size * 3.6, size * 2.0);

    // Kanji seal on talisman
    ctx.shadowBlur = 0;
    ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
    ctx.font = `bold ${Math.round(size * 1.2)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("封", 0, size * 0.4);

    ctx.restore();
    ctx.restore();
  }

  public renderFeedback(
    _ctx: CanvasRenderingContext2D,
    event: FeedbackEventSnapshot,
    _cameraX: number,
    _cameraY: number,
    _elapsed: number
  ): void {
    if (event.type === "hit" || event.type === "death" || event.type === "explosion") {
      const x = event.x ?? 0;
      const y = event.y ?? 0;
      const isHeavy = (event.amount ?? 0) >= 3 || event.type === "explosion";
      const kanjis = isHeavy ? ["爆", "轟"] : ["斬"];
      const kanji = kanjis[Math.floor(this.prng.next() * kanjis.length)];

      if (this.decalRingBuffer.length >= this.maxDecals) {
        this.decalRingBuffer.shift();
      }
      this.decalRingBuffer.push({
        x,
        y,
        radius: isHeavy ? 18 : 10,
        opacity: 0.85,
        kanji,
        isGold: isHeavy
      });
    }
  }

  public renderHud(
    ctx: CanvasRenderingContext2D,
    snapshot: HudRenderSnapshot,
    _elapsed: number
  ): void {
    const { viewportWidth: w, viewportHeight: h, player, score, isGameOver } = snapshot;

    ctx.save();

    // 1. Red seal stamp top-left (Lives)
    const sealX = 28;
    const sealY = 28;
    const sealRadius = 20;
    ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 14px 'Yuji Boku', 'Share Tech Mono', serif";
    ctx.fillStyle = SUMI_E_PALETTE.background;
    ctx.textAlign = "center";
    ctx.fillText("生", sealX, sealY + 5);

    // Ink pots for player HP
    if (player) {
      const maxHp = player.maxHp || 4;
      const curHp = player.currentHp;
      for (let i = 0; i < maxHp; i++) {
        const potX = sealX + 32 + i * 22;
        const potY = sealY - 10;
        ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
        ctx.fillRect(potX, potY, 16, 20);
        if (i >= curHp) {
          // Empty pot overlay
          ctx.fillStyle = SUMI_E_PALETTE.background;
          ctx.fillRect(potX + 2, potY + 2, 12, 12);
        }
      }
    }

    // 2. Score stamp top-right with slight rotation
    if (score) {
      ctx.save();
      ctx.translate(w - 70, 30);
      ctx.rotate(-0.06);

      ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
      ctx.strokeRect(-40, -16, 80, 32);
      ctx.fillStyle = SUMI_E_PALETTE.inkOrOutline;
      ctx.font = "bold 16px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(score.score).padStart(6, "0"), 0, 6);

      ctx.restore();
    }

    // Big red seal bottom-right
    ctx.save();
    ctx.translate(w - 45, h - 45);
    ctx.rotate(0.08);
    ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
    ctx.fillRect(-24, -24, 48, 48);
    ctx.fillStyle = SUMI_E_PALETTE.background;
    ctx.font = "bold 12px serif";
    ctx.textAlign = "center";
    ctx.fillText("正野", 0, -4);
    ctx.fillText("廣果", 0, 12);
    ctx.restore();

    if (isGameOver) {
      ctx.fillStyle = "rgba(23, 24, 23, 0.75)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = "bold 36px 'Yuji Boku', serif";
      ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
      ctx.fillText("敗 散", w * 0.5, h * 0.5);
    }

    ctx.restore();
  }

  public renderSectionBanner(
    ctx: CanvasRenderingContext2D,
    snapshot: BannerRenderSnapshot,
    w: number,
    h: number,
    _elapsed: number
  ): void {
    if (snapshot.remaining <= 0) return;
    const a = Math.min(1, snapshot.remaining / 0.35);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w * 0.5, h * 0.38);

    // Big red seal banner
    ctx.fillStyle = SUMI_E_PALETTE.vermilionOrRed;
    ctx.fillRect(-90, -35, 180, 70);

    ctx.fillStyle = SUMI_E_PALETTE.background;
    ctx.textAlign = "center";
    ctx.font = "bold 32px 'Yuji Boku', serif";
    const calligraphy = snapshot.text === "CLEAR" ? "全 滅" : "突 破";
    ctx.fillText(calligraphy, 0, 10);

    ctx.restore();
  }

  public onResize(w: number, h: number): void {
    this.initParchmentAndBorder(w, h);
  }

  public dispose(): void {
    this.paperCanvas = null;
    this.goldBorderCanvas = null;
    this.decalRingBuffer = [];
  }
}
