/**
 * Backend-neutral contracts for swappable game presentation.
 * This module must remain independent of ECS, React, Canvas and Skia APIs.
 */

export type PresentationCapability =
  | "backdrop"
  | "ground-shadow"
  | "entity"
  | "projectile"
  | "feedback"
  | "hud"
  | "banner"
  | "image-assets"
  | "sprite-assets"
  | "procedural-assets"
  | "high-contrast"
  | "reduced-motion";

export interface PresentationThemeDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: readonly PresentationCapability[];
}

export interface PresentationViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

export interface PresentationCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly visualOffsetX: number;
  readonly visualOffsetY: number;
}

export interface PresentationFrame {
  readonly frameId: number;
  readonly tick: number;
  /** Presentation clock in seconds; never infer it from a hard-coded tick rate. */
  readonly elapsedSeconds: number;
  readonly deltaSeconds: number;
  readonly viewport: PresentationViewport;
  readonly camera: PresentationCamera;
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
}

export interface PresentationRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PresentationGradient {
  addColorStop(offset: number, color: string): void;
}

export type PresentationFillStyle =
  | { readonly color: string; readonly alpha?: number }
  | { readonly gradient: PresentationGradient; readonly alpha?: number };

export interface PresentationStrokeStyle {
  readonly color: string;
  readonly width?: number;
  readonly alpha?: number;
  readonly lineCap?: "butt" | "round" | "square";
  readonly lineJoin?: "miter" | "round" | "bevel";
}

export interface PresentationTextStyle {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight?: "normal" | "bold";
  readonly align?: "left" | "center" | "right";
  readonly baseline?: "top" | "middle" | "alphabetic" | "bottom";
  readonly color: string;
  readonly alpha?: number;
}

export type PresentationAssetKind = "image" | "sprite-atlas" | "font";

/** Semantic metadata only; platform-native image/font handles stay behind adapters. */
export interface PresentationAssetDescriptor {
  readonly id: string;
  readonly kind: PresentationAssetKind;
  readonly width?: number;
  readonly height?: number;
  readonly license?: string;
}

export interface PresentationAssetManifest {
  readonly assets: Readonly<Record<string, PresentationAssetDescriptor>>;
}

/** Inject a session-scoped seeded RNG; presentation must not consume gameplay RNG. */
export interface PresentationRandom {
  next(): number;
}

export interface PresentationThemeContext {
  readonly gameId: string;
  readonly sessionId: string;
  readonly cosmeticSeed: number;
  readonly random: PresentationRandom;
}

/** Abstract drawing surface implemented by backend adapters. */
export interface PresentationPainter {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  rotate(radians: number): void;
  setAlpha(alpha: number): void;

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
  fill(style: PresentationFillStyle): void;
  stroke(style: PresentationStrokeStyle): void;

  fillRect(rect: PresentationRect, style: PresentationFillStyle): void;
  strokeRect(rect: PresentationRect, style: PresentationStrokeStyle): void;
  fillCircle(x: number, y: number, radius: number, style: PresentationFillStyle): void;
  fillEllipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotationRadians: number,
    style: PresentationFillStyle
  ): void;

  fillText(text: string, x: number, y: number, style: PresentationTextStyle): void;
  measureText(text: string, style: PresentationTextStyle): { readonly width: number; readonly height: number };

  createLinearGradient(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): PresentationGradient;
  createRadialGradient(
    startX: number,
    startY: number,
    startRadius: number,
    endX: number,
    endY: number,
    endRadius: number
  ): PresentationGradient;

  /** assetId resolves through the preloaded asset layer, not a DOM/native image handle. */
  drawImage(
    assetId: string,
    destination: PresentationRect,
    source?: PresentationRect,
    alpha?: number
  ): void;
  clipRect(rect: PresentationRect): void;
}

export interface PresentationTheme<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot
> {
  readonly descriptor: PresentationThemeDescriptor;

  renderBackdrop?(painter: PresentationPainter, scene: TSceneSnapshot, frame: PresentationFrame): void;
  renderGroundShadow?(painter: PresentationPainter, entity: TEntitySnapshot, frame: PresentationFrame): void;
  renderEntity?(painter: PresentationPainter, entity: TEntitySnapshot, frame: PresentationFrame): void;
  renderProjectile?(painter: PresentationPainter, projectile: TEntitySnapshot, frame: PresentationFrame): void;
  renderFeedback?(painter: PresentationPainter, event: TFeedbackEvent, frame: PresentationFrame): void;
  renderHud?(painter: PresentationPainter, hud: THudSnapshot, frame: PresentationFrame): void;
  renderBanner?(painter: PresentationPainter, banner: TBannerSnapshot, frame: PresentationFrame): void;
  onResize?(viewport: PresentationViewport): void;
  dispose(): void;
}

export interface PresentationThemeDefinition<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot
> {
  readonly descriptor: PresentationThemeDescriptor;
  create(context: PresentationThemeContext): PresentationTheme<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot
  >;
}

export interface PresentationThemeResolution<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot
> {
  readonly requestedId: string;
  readonly resolvedId: string;
  readonly usedFallback: boolean;
  readonly definition: PresentationThemeDefinition<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot
  >;
}
