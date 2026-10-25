import { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { OFFICE_PAPER_THEME_ID } from "../theme/FlappyThemeShared";

import {
  drawFlappyBird as drawCanvasNeonBird,
  drawFlappyPipe as drawCanvasNeonPipe,
  drawFlappyGround as drawCanvasNeonGround,
  scrollingBackgroundEffect as scrollingCanvasNeonBackground
} from "../rendering/FlappyBirdCanvasVisuals";

import {
  drawOfficePaperBird as drawCanvasOfficeBird,
  drawOfficePaperPipe as drawCanvasOfficePipe,
  drawOfficePaperGround as drawCanvasOfficeGround,
  scrollingOfficePaperBackgroundEffect as scrollingCanvasOfficeBackground
} from "./officePaper/OfficePaperCanvasVisuals";

import {
  drawSkiaFlappyBird as drawSkiaNeonBird,
  drawSkiaFlappyPipe as drawSkiaNeonPipe,
  drawSkiaFlappyGround as drawSkiaNeonGround,
  scrollingSkiaBackgroundEffect as scrollingSkiaNeonBackground
} from "../rendering/FlappyBirdSkiaVisuals";

import {
  drawSkiaOfficePaperBird as drawSkiaOfficeBird,
  drawSkiaOfficePaperPipe as drawSkiaOfficePipe,
  drawSkiaOfficePaperGround as drawSkiaOfficeGround,
  scrollingSkiaOfficePaperBackgroundEffect as scrollingSkiaOfficeBackground
} from "./officePaper/OfficePaperSkiaVisuals";

export interface FlappyCanvasDrawers {
  drawBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  drawPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  drawGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
  scrollingBackground: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry>;
}

export interface FlappySkiaDrawers {
  drawBird: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
  drawPipe: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
  drawGround: ShapeDrawer<RenderContext, FlappyBirdComponentRegistry>;
  scrollingBackground: EffectDrawer<RenderContext, FlappyBirdComponentRegistry>;
}

export function resolveFlappyCanvasVisuals(packId?: string): FlappyCanvasDrawers {
  if (packId === OFFICE_PAPER_THEME_ID) {
    return {
      drawBird: drawCanvasOfficeBird,
      drawPipe: drawCanvasOfficePipe,
      drawGround: drawCanvasOfficeGround,
      scrollingBackground: scrollingCanvasOfficeBackground
    };
  }

  return {
    drawBird: drawCanvasNeonBird,
    drawPipe: drawCanvasNeonPipe,
    drawGround: drawCanvasNeonGround,
    scrollingBackground: scrollingCanvasNeonBackground
  };
}

export function resolveFlappySkiaVisuals(packId?: string): FlappySkiaDrawers {
  if (packId === OFFICE_PAPER_THEME_ID) {
    return {
      drawBird: drawSkiaOfficeBird,
      drawPipe: drawSkiaOfficePipe,
      drawGround: drawSkiaOfficeGround,
      scrollingBackground: scrollingSkiaOfficeBackground
    };
  }

  return {
    drawBird: drawSkiaNeonBird,
    drawPipe: drawSkiaNeonPipe,
    drawGround: drawSkiaNeonGround,
    scrollingBackground: scrollingSkiaNeonBackground
  };
}
