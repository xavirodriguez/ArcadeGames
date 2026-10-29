import type { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import { OFFICE_PAPER_THEME_ID } from "../theme/FlappyThemeShared";

/** Stable theme identifiers for Flappy Bird presentation. */
export type FlappyThemeId = "neon" | typeof OFFICE_PAPER_THEME_ID;

/** Presentation-only contract: drawers and background effects. No gameplay systems. */
export interface FlappyThemeModule extends ThemeModuleDescriptor {
  readonly id: FlappyThemeId;
  readonly canvas: {
    drawBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
    drawPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
    drawGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
    scrollingBackground: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  };
  readonly skia: {
    drawBird: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
    drawPipe: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
    drawGround: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
    scrollingBackground: EffectDrawer<RenderContext, FlappyBirdComponentRegistry>;
  };
}
