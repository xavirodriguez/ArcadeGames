import type { SkCanvas } from "@shopify/react-native-skia";
import { Skia } from "./SkiaContext";
import type { SkPaint } from "./SkiaContext";
import { renderCanvasGlow, renderSkiaGlow, getGlowStyle } from "./GlowSystem";
import {
  getActiveThemeTypography,
  canvasFontString,
} from "../presentation/ThemeTypography";

/**
 * Platform-agnostic drawing adapter interface for unifying Canvas 2D and Skia rendering operations.
 * @public
 */
export interface IDrawAdapter {
  save(): void;
  restore(): void;
  fillCircle(x: number, y: number, radius: number, color: string, alpha?: number): void;
  strokeCircle(x: number, y: number, radius: number, color: string, strokeWidth?: number, alpha?: number): void;
  fillRect(x: number, y: number, width: number, height: number, color: string, alpha?: number): void;
  strokeRect(x: number, y: number, width: number, height: number, color: string, strokeWidth?: number, alpha?: number): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth?: number, alpha?: number): void;
  drawArc(x: number, y: number, radius: number, startAngleRad: number, sweepAngleRad: number, color: string, strokeWidth?: number, alpha?: number): void;
  drawText(text: string, x: number, y: number, color: string, alpha?: number, fontSize?: number): void;
  drawGlow(glowColorStr: string, drawFn: (adapter: IDrawAdapter) => void): void;
}

interface SkiaCanvasLike {
  save?: () => void;
  restore?: () => void;
  drawCircle?: (x: number, y: number, radius: number, paint: unknown) => void;
  drawRect?: (rect: unknown, paint: unknown) => void;
  drawLine?: (x1: number, y1: number, x2: number, y2: number, paint: unknown) => void;
  drawPath?: (path: unknown, paint: unknown) => void;
  drawText?: (text: string, x: number, y: number, paint: unknown, font?: unknown) => void;
}

/**
 * IDrawAdapter implementation wrapping HTML CanvasRenderingContext2D.
 * @public
 */
export class CanvasDrawAdapter implements IDrawAdapter {
  private glowAlpha = 1;

  constructor(private ctx: CanvasRenderingContext2D) {}

  public save(): void {
    this.ctx.save();
  }

  public restore(): void {
    this.ctx.restore();
  }

  public fillCircle(x: number, y: number, radius: number, color: string, alpha: number = 1.0): void {
    if (alpha * this.glowAlpha <= 0.001) return;
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha * this.glowAlpha;
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    this.ctx.fill();
  }

  private prepareCanvasStroke(color: string, strokeWidth: number, alpha: number): boolean {
    if (alpha * this.glowAlpha <= 0.001) return false;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.globalAlpha = alpha * this.glowAlpha;
    return true;
  }

  public strokeCircle(x: number, y: number, radius: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.prepareCanvasStroke(color, strokeWidth, alpha)) return;
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    this.ctx.stroke();
  }

  public fillRect(x: number, y: number, width: number, height: number, color: string, alpha: number = 1.0): void {
    if (alpha * this.glowAlpha <= 0.001) return;
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha * this.glowAlpha;
    this.ctx.fillRect(x, y, width, height);
  }

  public strokeRect(x: number, y: number, width: number, height: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.prepareCanvasStroke(color, strokeWidth, alpha)) return;
    this.ctx.strokeRect(x, y, width, height);
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.prepareCanvasStroke(color, strokeWidth, alpha)) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  public drawArc(x: number, y: number, radius: number, startAngleRad: number, sweepAngleRad: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.prepareCanvasStroke(color, strokeWidth, alpha)) return;
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(0, radius), startAngleRad, startAngleRad + sweepAngleRad);
    this.ctx.stroke();
  }

  public drawText(text: string, x: number, y: number, color: string, alpha: number = 1.0, fontSize: number = 14): void {
    if (alpha * this.glowAlpha <= 0.001) return;
    this.ctx.font = canvasFontString(getActiveThemeTypography(), fontSize, "mono", "bold");
    this.ctx.textAlign = "center";
    this.ctx.globalAlpha = alpha * this.glowAlpha;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  public drawGlow(glowColorStr: string, drawFn: (adapter: IDrawAdapter) => void): void {
    const glowStyle = getGlowStyle(glowColorStr, "normal");
    renderCanvasGlow(this.ctx, glowStyle, (_context, _isHighlight, layerAlpha = 1) => {
      const previousAlpha = this.glowAlpha;
      this.glowAlpha = layerAlpha;
      try {
        drawFn(this);
      } finally {
        this.glowAlpha = previousAlpha;
      }
    });
  }
}

/**
 * IDrawAdapter implementation wrapping React Native Skia Canvas.
 * @public
 */
export class SkiaDrawAdapter implements IDrawAdapter {
  private activeGlowPaint: SkPaint | null = null;
  private activeGlowAlpha = 1;

  private get skCanvas(): SkiaCanvasLike {
    return this.canvas as SkiaCanvasLike;
  }

  constructor(private canvas: SkCanvas | unknown) {}

  public save(): void {
    if (this.skCanvas.save) {
      this.skCanvas.save();
    }
  }

  public restore(): void {
    if (this.skCanvas.restore) {
      this.skCanvas.restore();
    }
  }

  private createSkiaPaint(
    style: unknown,
    color: string,
    alpha: number,
    strokeWidth?: number
  ): SkPaint | null {
    if (!Skia || alpha * (this.activeGlowPaint ? this.activeGlowAlpha : 1) <= 0.001) return null;
    const paint = this.activeGlowPaint ?? Skia.Paint();
    paint.setStyle(style);
    if (strokeWidth !== undefined) {
      paint.setStrokeWidth(strokeWidth);
    }
    paint.setColor(Skia.Color(color));
    paint.setAlphaf(alpha * (this.activeGlowPaint ? this.activeGlowAlpha : 1));
    return paint;
  }

  public fillCircle(x: number, y: number, radius: number, color: string, alpha: number = 1.0): void {
    if (!this.skCanvas.drawCircle) return;
    const paint = this.createSkiaPaint(Skia?.PaintStyle.Fill, color, alpha);
    if (!paint) return;
    this.skCanvas.drawCircle(x, y, Math.max(0, radius), paint);
  }

  public strokeCircle(x: number, y: number, radius: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.skCanvas.drawCircle) return;
    const paint = this.createSkiaPaint(Skia?.PaintStyle.Stroke, color, alpha, strokeWidth);
    if (!paint) return;
    this.skCanvas.drawCircle(x, y, Math.max(0, radius), paint);
  }

  public fillRect(x: number, y: number, width: number, height: number, color: string, alpha: number = 1.0): void {
    if (!this.skCanvas.drawRect) return;
    const paint = this.createSkiaPaint(Skia?.PaintStyle.Fill, color, alpha);
    if (!paint) return;
    this.skCanvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);
  }

  public strokeRect(x: number, y: number, width: number, height: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.skCanvas.drawRect) return;
    const paint = this.createSkiaPaint(Skia?.PaintStyle.Stroke, color, alpha, strokeWidth);
    if (!paint) return;
    this.skCanvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.skCanvas.drawLine) return;
    const paint = this.createSkiaPaint(Skia?.PaintStyle.Stroke, color, alpha, strokeWidth);
    if (!paint) return;
    this.skCanvas.drawLine(x1, y1, x2, y2, paint);
  }

  public drawArc(x: number, y: number, radius: number, startAngleRad: number, sweepAngleRad: number, color: string, strokeWidth: number = 1.0, alpha: number = 1.0): void {
    if (!this.skCanvas.drawPath) return;
    const paint = this.createSkiaPaint(Skia?.PaintStyle.Stroke, color, alpha, strokeWidth);
    if (!paint) return;

    const path = Skia.Path.Make();
    path.addArc(
      Skia.XYWHRect(x - radius, y - radius, radius * 2, radius * 2),
      (startAngleRad * 180) / Math.PI,
      (sweepAngleRad * 180) / Math.PI
    );
    this.skCanvas.drawPath(path, paint);
  }

  public drawText(text: string, x: number, y: number, color: string, alpha: number = 1.0, fontSize: number = 14): void {
    if (!Skia || alpha <= 0.001 || !this.skCanvas.drawText) return;
    const paint = this.createSkiaPaint(Skia.PaintStyle.Fill, color, alpha);
    if (!paint) return;
    const size = Math.max(1, fontSize);
    const font = typeof Skia.Font === "function" ? Skia.Font(null, size) : undefined;
    if (font) {
      this.skCanvas.drawText(text, x, y, paint, font);
    } else {
      this.skCanvas.drawText(text, x, y, paint);
    }
  }

  public drawGlow(glowColorStr: string, drawFn: (adapter: IDrawAdapter) => void): void {
    const glowStyle = getGlowStyle(glowColorStr, "normal");
    renderSkiaGlow(this.skCanvas, glowStyle, (paint, _isHighlight, layerAlpha = 1) => {
      const previousPaint = this.activeGlowPaint;
      const previousAlpha = this.activeGlowAlpha;
      this.activeGlowPaint = paint;
      this.activeGlowAlpha = layerAlpha;
      try {
        drawFn(this);
      } finally {
        this.activeGlowPaint = previousPaint;
        this.activeGlowAlpha = previousAlpha;
      }
    });
  }
}
