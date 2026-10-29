/**
 * Backend-neutral contracts for swappable game presentation.
 * Keep this module independent of ECS, React, Canvas and Skia concrete APIs.
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

export interface PresentationColorTokens {
  readonly background: string;
  readonly surface: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly accent: string;
  readonly player: string;
  readonly threat: string;
  readonly reward: string;
  readonly danger: string;
  readonly success: string;
  readonly warning: string;
  readonly outline: string;
}

export interface PresentationTypographyTokens {
  readonly display: string;
  readonly body: string;
  readonly monospace: string;
}

export interface PresentationLayoutTokens {
  readonly spacing: {
    readonly xs: number;
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly xl: number;
  };
  readonly radius: {
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly pill: number;
  };
}

/**
 * Common semantic roles support shared UI; custom keeps each art direction's
 * richer, strictly typed token model (for example the nested Sumi-e token groups).
 */
export interface PresentationThemeTokens<TCustomTokens extends object = object> {
  readonly colors: PresentationColorTokens;
  readonly typography: PresentationTypographyTokens;
  readonly layout: PresentationLayoutTokens;
  readonly custom: TCustomTokens;
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

export interface PresentationTransformSnapshot {
  readonly x: number;
  readonly y: number;
  readonly rotationRadians: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface PresentationAnimationSnapshot {
  readonly state: string;
  readonly frameIndex: number;
  readonly elapsedSeconds: number;
}

export type PresentationEntityRole =
  | "player"
  | "hostile"
  | "projectile"
  | "obstacle"
  | "collectible"
  | "environment"
  | "effect"
  | "neutral";

export interface PresentationEntitySnapshot<TCustomData extends object = object> {
  /** Stable presentation identity, not the concrete ECS entity object. */
  readonly entityId: string;
  /** Semantic asset/drawer key resolved by the theme. */
  readonly visualId: string;
  readonly role: PresentationEntityRole;
  readonly transform: PresentationTransformSnapshot;
  readonly opacity: number;
  readonly elevation?: number;
  readonly facing?: -1 | 1;
  readonly animation?: PresentationAnimationSnapshot;
  readonly hitFlash?: number;
  readonly tint?: string;
  readonly custom?: TCustomData;
}

export type PresentationEnvironmentCoordinateSpace = "screen" | "world" | "parallax";

export interface PresentationEnvironmentLayerSnapshot {
  readonly assetId: string;
  readonly coordinateSpace: PresentationEnvironmentCoordinateSpace;
  readonly bounds: PresentationRect;
  readonly zIndex: number;
  readonly opacity: number;
  /** Used only when coordinateSpace is parallax. */
  readonly parallaxFactor: number;
  readonly repeatX?: boolean;
}

export interface PresentationSceneSnapshot<TCustomData extends object = object> {
  readonly sceneId: string;
  readonly levelId?: string;
  readonly environmentId?: string;
  readonly environmentLayers?: ReadonlyArray<PresentationEnvironmentLayerSnapshot>;
  readonly custom?: TCustomData;
}

export type PresentationFeedbackKind = "hit" | "death" | "explosion" | "pickup" | "blocked";

export interface PresentationPoint {
  readonly x: number;
  readonly y: number;
}

export interface PresentationFeedbackEventSnapshot {
  readonly eventId: string;
  readonly type: PresentationFeedbackKind;
  readonly position?: PresentationPoint;
  readonly amount?: number;
  readonly category?: string;
  readonly directionRadians?: number;
}

export interface PresentationHealthSnapshot {
  readonly current: number;
  readonly max: number;
}

export interface PresentationHudSnapshot<TMetrics extends object = object> {
  readonly score?: number;
  readonly highScore?: number;
  readonly lives?: number;
  readonly health?: PresentationHealthSnapshot;
  readonly combo?: number;
  readonly isPaused?: boolean;
  readonly isGameOver?: boolean;
  readonly metrics?: TMetrics;
}

export interface PresentationBannerSnapshot {
  readonly text: string;
  readonly subtext?: string;
  readonly remainingSeconds: number;
  readonly totalDurationSeconds: number;
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
  /** Optional primitive options for theme variants such as landscape or palette. */
  readonly options?: Readonly<Record<string, string | number | boolean>>;
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

  /** assetId resolves through preloaded assets, never a DOM/native image handle. */
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
  TBannerSnapshot,
  TCustomTokens extends object = object
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
  TBannerSnapshot,
  TCustomTokens extends object = object
> {
  readonly descriptor: PresentationThemeDescriptor;
  /** Stable defaults used by the catalogue before a session is created. */
  readonly tokens: PresentationThemeTokens<TCustomTokens>;
  /** Optional token resolver for per-session palette/landscape variants. */
  readonly resolveTokens?: (context: PresentationThemeContext) => PresentationThemeTokens<TCustomTokens>;
  create(context: PresentationThemeContext): PresentationTheme<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot,
    TCustomTokens
  >;
}

export interface PresentationThemeResolution<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot,
  TCustomTokens extends object = object
> {
  readonly requestedId: string;
  readonly resolvedId: string;
  readonly usedFallback: boolean;
  readonly definition: PresentationThemeDefinition<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot,
    TCustomTokens
  >;
}

/**
 * Selected theme and its tokens resolved together for a single presentation session.
 * Renderer and React UI should consume the same session instead of resolving selection twice.
 */
export interface PresentationThemeSession<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot,
  TCustomTokens extends object = object
> {
  readonly gameId: string;
  readonly sessionId: string;
  readonly requestedThemeId: string;
  readonly resolvedThemeId: string;
  readonly usedFallback: boolean;
  readonly descriptor: PresentationThemeDescriptor;
  readonly tokens: PresentationThemeTokens<TCustomTokens>;
  readonly theme: PresentationTheme<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot,
    TCustomTokens
  >;
  readonly disposed: boolean;
  dispose(): void;
}
