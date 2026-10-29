import type { FlappyThemeModule } from "../types";
import { OFFICE_PAPER_THEME_ID } from "../../theme/FlappyThemeShared";
import {
  drawOfficePaperBird,
  drawOfficePaperPipe,
  drawOfficePaperGround,
  scrollingOfficePaperBackgroundEffect
} from "./OfficePaperCanvasVisuals";
import {
  drawSkiaOfficePaperBird,
  drawSkiaOfficePaperPipe,
  drawSkiaOfficePaperGround,
  scrollingSkiaOfficePaperBackgroundEffect
} from "./OfficePaperSkiaVisuals";

/**
 * Office-paper aesthetic (Oficina 8:47). Presentation only — no simulation systems.
 */
export const officePaperThemeModule: FlappyThemeModule = {
  id: OFFICE_PAPER_THEME_ID,
  displayName: "Oficina 8:47",
  canvas: {
    drawBird: drawOfficePaperBird,
    drawPipe: drawOfficePaperPipe,
    drawGround: drawOfficePaperGround,
    scrollingBackground: scrollingOfficePaperBackgroundEffect
  },
  skia: {
    drawBird: drawSkiaOfficePaperBird,
    drawPipe: drawSkiaOfficePaperPipe,
    drawGround: drawSkiaOfficePaperGround,
    scrollingBackground: scrollingSkiaOfficePaperBackgroundEffect
  }
};
