/**
 * Interface contract for Hit & Run visual themes.
 * Fully decoupled from gameplay simulation logic.
 */

import type {
  EntityRenderSnapshot,
  HudRenderSnapshot,
  BannerRenderSnapshot,
  FeedbackEventSnapshot
} from "./HitRunThemeTypes";

export interface HitRunThemePaletteTokens {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly background: string;
  readonly paperOrFloor: string;
  readonly inkOrOutline: string;
  readonly vermilionOrRed: string;
  readonly goldOrYellow: string;
  readonly darkOniOrElite: string;
  readonly redOniOrCharger: string;
}

export interface HitRunTheme {
  readonly id: string;
  readonly name: string;
  readonly palette: HitRunThemePaletteTokens;

  /** Render background/backdrop layer in world/screen space. */
  renderBackdrop(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
    cameraX: number,
    cameraY: number,
    elapsed: number
  ): void;

  /** Render ground shadow at entity feet position (Transform.y). */
  renderGroundShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elevation: number,
    rxRatio?: number,
    ryRatio?: number
  ): void;

  /** Render character entity (player, enemies, bosses) translated by elevation. */
  renderEntity(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    elapsed: number
  ): void;

  /** Render projectile entity (bullets, rockets, arrows, ofuda). */
  renderProjectile(
    ctx: CanvasRenderingContext2D,
    snapshot: EntityRenderSnapshot,
    elapsed: number
  ): void;

  /** Process and render feedback event effects (decals, particles, kanji, slashes). */
  renderFeedback(
    ctx: CanvasRenderingContext2D,
    event: FeedbackEventSnapshot,
    cameraX: number,
    cameraY: number,
    elapsed: number
  ): void;

  /** Render UI / HUD overlay elements. */
  renderHud(
    ctx: CanvasRenderingContext2D,
    snapshot: HudRenderSnapshot,
    elapsed: number
  ): void;

  /** Render section / wave transition banners (CLEAR, WAVE, etc.). */
  renderSectionBanner(
    ctx: CanvasRenderingContext2D,
    snapshot: BannerRenderSnapshot,
    viewportWidth: number,
    viewportHeight: number,
    elapsed: number
  ): void;

  /** Called when viewport resizes to invalidate/rebuild offscreen caches. */
  onResize(viewportWidth: number, viewportHeight: number): void;

  /** Clean up resources, cached canvases, and event listeners. */
  dispose(): void;
}
