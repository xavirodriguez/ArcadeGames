import {
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkPaint
} from "@shopify/react-native-skia";
import type {
  PresentationFillStyle,
  PresentationGradient,
  PresentationPainter,
  PresentationRect,
  PresentationStrokeStyle,
  PresentationTextStyle
} from "../PresentationContracts";

interface GradientStop {
  readonly offset: number;
  readonly color: string;
}

type GradientGeometry =
  | {
      readonly kind: "linear";
      readonly startX: number;
      readonly startY: number;
      readonly endX: number;
      readonly endY: number;
    }
  | {
      readonly kind: "radial";
      readonly startX: number;
      readonly startY: number;
      readonly startRadius: number;
      readonly endX: number;
      readonly endY: number;
      readonly endRadius: number;
    };

class SkiaPresentationGradient implements PresentationGradient {
  private readonly stopValues: GradientStop[] = [];

  public constructor(
    public readonly owner: object,
    public readonly geometry: GradientGeometry
  ) {}

  public addColorStop(offset: number, color: string): void {
    if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
      throw new RangeError("[SkiaPresentationPainter] Gradient stop offset must be within [0, 1].");
    }
    this.stopValues.push({ offset, color });
  }

  public get stops(): ReadonlyArray<GradientStop> {
    return [...this.stopValues].sort((first, second) => first.offset - second.offset);
  }
}

export interface PresentationSkiaImageResolver {
  /** Returns a decoded native image, or undefined while the asset is unavailable. */
  getImage(assetId: string): SkImage | undefined;
}

export interface PresentationSkiaFontResolver {
  resolveFont(fontFamily: string, fontSize: number, fontWeight: "normal" | "bold"): SkFont | undefined;
}

/**
 * Skia implementation of the backend-neutral PresentationPainter contract.
 *
 * A font resolver can load actual theme font families. Without one, text uses Skia's
 * default typeface. Native image handles are resolved through the injected provider.
 */
export class SkiaPresentationPainter implements PresentationPainter {
  private readonly gradientOwner = {};
  private path = Skia.Path.Make();
  private alpha = 1;
  private readonly alphaStack: number[] = [];

  public constructor(
    private readonly canvas: SkCanvas,
    private readonly images?: PresentationSkiaImageResolver,
    private readonly fonts?: PresentationSkiaFontResolver
  ) {}

  public save(): void {
    this.alphaStack.push(this.alpha);
    this.canvas.save();
  }

  public restore(): void {
    const previousAlpha = this.alphaStack.pop();
    this.canvas.restore();
    if (previousAlpha !== undefined) this.alpha = previousAlpha;
  }

  public translate(x: number, y: number): void {
    this.canvas.translate(x, y);
  }

  public scale(x: number, y: number): void {
    this.canvas.scale(x, y);
  }

  public rotate(radians: number): void {
    this.canvas.rotate((radians * 180) / Math.PI, 0, 0);
  }

  public setAlpha(alpha: number): void {
    this.alpha = normalizeAlpha(alpha);
  }

  public beginPath(): void {
    this.path = Skia.Path.Make();
  }

  public moveTo(x: number, y: number): void {
    this.path.moveTo(x, y);
  }

  public lineTo(x: number, y: number): void {
    this.path.lineTo(x, y);
  }

  public quadraticCurveTo(controlX: number, controlY: number, x: number, y: number): void {
    this.path.quadTo(controlX, controlY, x, y);
  }

  public bezierCurveTo(
    control1X: number,
    control1Y: number,
    control2X: number,
    control2Y: number,
    x: number,
    y: number
  ): void {
    this.path.cubicTo(control1X, control1Y, control2X, control2Y, x, y);
  }

  public closePath(): void {
    this.path.close();
  }

  public fill(style: PresentationFillStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.canvas.drawPath(this.path, this.createFillPaint(style));
  }

  public stroke(style: PresentationStrokeStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.canvas.drawPath(this.path, this.createStrokePaint(style));
  }

  public fillRect(rect: PresentationRect, style: PresentationFillStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.canvas.drawRect(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height), this.createFillPaint(style));
  }

  public strokeRect(rect: PresentationRect, style: PresentationStrokeStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.canvas.drawRect(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height), this.createStrokePaint(style));
  }

  public fillCircle(x: number, y: number, radius: number, style: PresentationFillStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.canvas.drawCircle(x, y, Math.max(0, radius), this.createFillPaint(style));
  }

  public fillEllipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotationRadians: number,
    style: PresentationFillStyle
  ): void {
    if (this.isInvisible(style.alpha)) return;
    this.canvas.save();
    try {
      this.canvas.translate(x, y);
      this.canvas.rotate((rotationRadians * 180) / Math.PI, 0, 0);
      this.canvas.drawOval(
        Skia.XYWHRect(-Math.max(0, radiusX), -Math.max(0, radiusY), Math.max(0, radiusX) * 2, Math.max(0, radiusY) * 2),
        this.createFillPaint(style)
      );
    } finally {
      this.canvas.restore();
    }
  }

  public fillText(text: string, x: number, y: number, style: PresentationTextStyle): void {
    if (this.isInvisible(style.alpha)) return;
    const font = this.resolveFont(style);
    if (!font) return;
    const width = font.measureText(text).width;
    const drawX = style.align === "center" ? x - width / 2 : style.align === "right" ? x - width : x;
    const fontMetrics = font.getMetrics();
    const baselineOffset = style.baseline === "top"
      ? -fontMetrics.ascent
      : style.baseline === "middle"
        ? -(fontMetrics.ascent + fontMetrics.descent) / 2
        : style.baseline === "bottom"
          ? -fontMetrics.descent
          : 0;
    const paint = this.createFillPaint({ color: style.color, alpha: style.alpha });
    this.canvas.drawText(text, drawX, y + baselineOffset, paint, font);
  }

  public measureText(
    text: string,
    style: PresentationTextStyle
  ): { readonly width: number; readonly height: number } {
    const font = this.resolveFont(style);
    if (!font) return { width: text.length * style.fontSize * 0.56, height: Math.max(1, style.fontSize) };
    return {
      width: font.measureText(text).width,
      height: Math.max(1, style.fontSize)
    };
  }

  public createLinearGradient(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): PresentationGradient {
    return new SkiaPresentationGradient(this.gradientOwner, {
      kind: "linear",
      startX,
      startY,
      endX,
      endY
    });
  }

  public createRadialGradient(
    startX: number,
    startY: number,
    startRadius: number,
    endX: number,
    endY: number,
    endRadius: number
  ): PresentationGradient {
    return new SkiaPresentationGradient(this.gradientOwner, {
      kind: "radial",
      startX,
      startY,
      startRadius: Math.max(0, startRadius),
      endX,
      endY,
      endRadius: Math.max(0, endRadius)
    });
  }

  public drawImage(
    assetId: string,
    destination: PresentationRect,
    source?: PresentationRect,
    alpha = 1
  ): void {
    const image = this.images?.getImage(assetId);
    if (!image || this.isInvisible(alpha)) return;

    const sourceRect = source ?? {
      x: 0,
      y: 0,
      width: image.width(),
      height: image.height()
    };
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Fill);
    paint.setAlphaf(this.alpha * normalizeAlpha(alpha));
    this.canvas.drawImageRect(
      image,
      Skia.XYWHRect(sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height),
      Skia.XYWHRect(destination.x, destination.y, destination.width, destination.height),
      paint
    );
  }

  public clipRect(rect: PresentationRect): void {
    this.canvas.clipRect(
      Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height),
      ClipOp.Intersect,
      true
    );
  }

  private createFillPaint(style: PresentationFillStyle): SkPaint {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Fill);
    paint.setAlphaf(this.alpha * normalizeAlpha(style.alpha ?? 1));

    if ("color" in style) {
      paint.setColor(Skia.Color(style.color));
    } else {
      const gradient = this.assertOwnGradient(style.gradient);
      const stops = gradient.stops;
      if (stops.length === 0) {
        throw new Error("[SkiaPresentationPainter] A gradient needs at least one color stop.");
      }
      if (stops.length === 1) {
        paint.setColor(Skia.Color(stops[0].color));
      } else {
        paint.setShader(this.createGradientShader(gradient));
      }
    }

    return paint;
  }

  private createStrokePaint(style: PresentationStrokeStyle): SkPaint {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(0, style.width ?? 1));
    paint.setAlphaf(this.alpha * normalizeAlpha(style.alpha ?? 1));
    paint.setColor(Skia.Color(style.color));

    switch (style.lineCap ?? "butt") {
      case "round":
        paint.setStrokeCap(StrokeCap.Round);
        break;
      case "square":
        paint.setStrokeCap(StrokeCap.Square);
        break;
      default:
        paint.setStrokeCap(StrokeCap.Butt);
        break;
    }

    switch (style.lineJoin ?? "miter") {
      case "round":
        paint.setStrokeJoin(StrokeJoin.Round);
        break;
      case "bevel":
        paint.setStrokeJoin(StrokeJoin.Bevel);
        break;
      default:
        paint.setStrokeJoin(StrokeJoin.Miter);
        break;
    }

    return paint;
  }

  private createGradientShader(gradient: PresentationGradient) {
    const ownedGradient = this.assertOwnGradient(gradient);
    const stops = ownedGradient.stops;
    const colors = stops.map((stop) => Skia.Color(stop.color));
    const positions = stops.map((stop) => stop.offset);
    const geometry = ownedGradient.geometry;

    if (geometry.kind === "linear") {
      return Skia.Shader.MakeLinearGradient(
        Skia.Point(geometry.startX, geometry.startY),
        Skia.Point(geometry.endX, geometry.endY),
        colors,
        positions,
        TileMode.Clamp
      );
    }

    return Skia.Shader.MakeTwoPointConicalGradient(
      Skia.Point(geometry.startX, geometry.startY),
      geometry.startRadius,
      Skia.Point(geometry.endX, geometry.endY),
      geometry.endRadius,
      colors,
      positions,
      TileMode.Clamp
    );
  }

  private assertOwnGradient(gradient: PresentationGradient): SkiaPresentationGradient {
    if (
      !(gradient instanceof SkiaPresentationGradient) ||
      gradient.owner !== this.gradientOwner
    ) {
      throw new Error("[SkiaPresentationPainter] Gradient was not created by this painter.");
    }
    return gradient;
  }

  private resolveFont(style: PresentationTextStyle): SkFont | undefined {
    return this.fonts?.resolveFont(
      style.fontFamily,
      Math.max(1, style.fontSize),
      style.fontWeight ?? "normal"
    ) ?? Skia.Font(null as never, Math.max(1, style.fontSize)) ?? undefined;
  }

  private isInvisible(alpha: number | undefined): boolean {
    return alpha !== undefined && (!Number.isFinite(alpha) || alpha <= 0.001);
  }
}

function normalizeAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 0;
  return Math.min(1, Math.max(0, alpha));
}
