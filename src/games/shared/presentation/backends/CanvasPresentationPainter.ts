import type {
  PresentationFillStyle,
  PresentationGradient,
  PresentationPainter,
  PresentationRect,
  PresentationStrokeStyle,
  PresentationTextStyle
} from "../PresentationContracts";

/**
 * Minimal structural surface used by the Canvas adapter. A real
 * CanvasRenderingContext2D satisfies this interface; it also keeps tests small.
 */
export interface PresentationCanvasContext {
  globalAlpha: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;

  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  rotate(angle: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(controlX: number, controlY: number, x: number, y: number): void;
  bezierCurveTo(
    control1X: number,
    control1Y: number,
    control2X: number,
    control2Y: number,
    x: number,
    y: number
  ): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number
  ): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): TextMetrics;
  createLinearGradient(startX: number, startY: number, endX: number, endY: number): CanvasGradient;
  createRadialGradient(
    startX: number,
    startY: number,
    startRadius: number,
    endX: number,
    endY: number,
    endRadius: number
  ): CanvasGradient;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dWidth: number, dHeight: number): void;
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ): void;
}

export interface PresentationCanvasImageResolver {
  /** Returns a decoded image, or undefined while the asset is unavailable. */
  getImage(assetId: string): CanvasImageSource | undefined;
}

/**
 * Canvas implementation of the backend-neutral PresentationPainter contract.
 *
 * All styles are scoped to each operation. Transformations, clipping and setAlpha
 * remain stateful by design and follow Canvas save()/restore() semantics.
 */
export class CanvasPresentationPainter implements PresentationPainter {
  private readonly gradients = new WeakMap<PresentationGradient, CanvasGradient>();

  public constructor(
    private readonly context: PresentationCanvasContext,
    private readonly images?: PresentationCanvasImageResolver
  ) {}

  public save(): void {
    this.context.save();
  }

  public restore(): void {
    this.context.restore();
  }

  public translate(x: number, y: number): void {
    this.context.translate(x, y);
  }

  public scale(x: number, y: number): void {
    this.context.scale(x, y);
  }

  public rotate(radians: number): void {
    this.context.rotate(radians);
  }

  public setAlpha(alpha: number): void {
    this.context.globalAlpha = normalizeAlpha(alpha);
  }

  public beginPath(): void {
    this.context.beginPath();
  }

  public moveTo(x: number, y: number): void {
    this.context.moveTo(x, y);
  }

  public lineTo(x: number, y: number): void {
    this.context.lineTo(x, y);
  }

  public quadraticCurveTo(controlX: number, controlY: number, x: number, y: number): void {
    this.context.quadraticCurveTo(controlX, controlY, x, y);
  }

  public bezierCurveTo(
    control1X: number,
    control1Y: number,
    control2X: number,
    control2Y: number,
    x: number,
    y: number
  ): void {
    this.context.bezierCurveTo(control1X, control1Y, control2X, control2Y, x, y);
  }

  public closePath(): void {
    this.context.closePath();
  }

  public fill(style: PresentationFillStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.withSavedState(style.alpha, () => {
      this.context.fillStyle = this.resolveFillStyle(style);
      this.context.fill();
    });
  }

  public stroke(style: PresentationStrokeStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.withSavedState(style.alpha, () => {
      this.context.strokeStyle = style.color;
      this.context.lineWidth = Math.max(0, style.width ?? 1);
      this.context.lineCap = style.lineCap ?? "butt";
      this.context.lineJoin = style.lineJoin ?? "miter";
      this.context.stroke();
    });
  }

  public fillRect(rect: PresentationRect, style: PresentationFillStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.withSavedState(style.alpha, () => {
      this.context.fillStyle = this.resolveFillStyle(style);
      this.context.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
  }

  public strokeRect(rect: PresentationRect, style: PresentationStrokeStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.withSavedState(style.alpha, () => {
      this.context.strokeStyle = style.color;
      this.context.lineWidth = Math.max(0, style.width ?? 1);
      this.context.lineCap = style.lineCap ?? "butt";
      this.context.lineJoin = style.lineJoin ?? "miter";
      this.context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
  }

  public fillCircle(x: number, y: number, radius: number, style: PresentationFillStyle): void {
    this.context.beginPath();
    this.context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    this.fill(style);
  }

  public fillEllipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotationRadians: number,
    style: PresentationFillStyle
  ): void {
    this.context.beginPath();
    this.context.ellipse(
      x,
      y,
      Math.max(0, radiusX),
      Math.max(0, radiusY),
      rotationRadians,
      0,
      Math.PI * 2
    );
    this.fill(style);
  }

  public fillText(text: string, x: number, y: number, style: PresentationTextStyle): void {
    if (this.isInvisible(style.alpha)) return;
    this.withSavedState(style.alpha, () => {
      const weight = style.fontWeight ?? "normal";
      this.context.font = weight + " " + Math.max(1, style.fontSize) + "px " + style.fontFamily;
      this.context.textAlign = style.align ?? "left";
      this.context.textBaseline = style.baseline ?? "alphabetic";
      this.context.fillStyle = style.color;
      this.context.fillText(text, x, y);
    });
  }

  public measureText(
    text: string,
    style: PresentationTextStyle
  ): { readonly width: number; readonly height: number } {
    return this.withSavedStateResult(() => {
      const weight = style.fontWeight ?? "normal";
      this.context.font = weight + " " + Math.max(1, style.fontSize) + "px " + style.fontFamily;
      const metrics = this.context.measureText(text);
      const measuredHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      return {
        width: metrics.width,
        height: Number.isFinite(measuredHeight) && measuredHeight > 0
          ? measuredHeight
          : Math.max(1, style.fontSize)
      };
    });
  }

  public createLinearGradient(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): PresentationGradient {
    const gradient = this.context.createLinearGradient(startX, startY, endX, endY);
    this.gradients.set(gradient, gradient);
    return gradient;
  }

  public createRadialGradient(
    startX: number,
    startY: number,
    startRadius: number,
    endX: number,
    endY: number,
    endRadius: number
  ): PresentationGradient {
    const gradient = this.context.createRadialGradient(
      startX,
      startY,
      Math.max(0, startRadius),
      endX,
      endY,
      Math.max(0, endRadius)
    );
    this.gradients.set(gradient, gradient);
    return gradient;
  }

  public drawImage(
    assetId: string,
    destination: PresentationRect,
    source?: PresentationRect,
    alpha = 1
  ): void {
    const image = this.images?.getImage(assetId);
    if (!image || this.isInvisible(alpha)) return;

    this.withSavedState(alpha, () => {
      if (source) {
        this.context.drawImage(
          image,
          source.x,
          source.y,
          source.width,
          source.height,
          destination.x,
          destination.y,
          destination.width,
          destination.height
        );
      } else {
        this.context.drawImage(
          image,
          destination.x,
          destination.y,
          destination.width,
          destination.height
        );
      }
    });
  }

  public clipRect(rect: PresentationRect): void {
    this.context.beginPath();
    this.context.rect(rect.x, rect.y, rect.width, rect.height);
    this.context.clip();
  }

  private resolveFillStyle(style: PresentationFillStyle): string | CanvasGradient {
    if ("color" in style) return style.color;
    const gradient = this.gradients.get(style.gradient);
    if (!gradient) {
      throw new Error("[CanvasPresentationPainter] Gradient was not created by this painter.");
    }
    return gradient;
  }

  private isInvisible(alpha: number | undefined): boolean {
    return alpha !== undefined && (!Number.isFinite(alpha) || alpha <= 0.001);
  }

  private withSavedState(alpha: number | undefined, draw: () => void): void {
    this.context.save();
    this.context.globalAlpha *= normalizeAlpha(alpha ?? 1);
    try {
      draw();
    } finally {
      this.context.restore();
    }
  }

  private withSavedStateResult<TResult>(draw: () => TResult): TResult {
    this.context.save();
    try {
      return draw();
    } finally {
      this.context.restore();
    }
  }
}

function normalizeAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 0;
  return Math.min(1, Math.max(0, alpha));
}
