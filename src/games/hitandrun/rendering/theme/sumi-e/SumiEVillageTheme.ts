import type { HitRunTheme } from "../HitRunTheme";
import type {
  EntityRenderSnapshot,
  HudRenderSnapshot,
  BannerRenderSnapshot,
  FeedbackEventSnapshot
} from "../HitRunThemeTypes";
import { SumiETheme } from "./SumiETheme";
import { drawSumiEVillageLayer } from "./SumiEVillageLayer";

/**
 * Sumi-e theme variant with a repeated village skyline in the backdrop.
 * House silhouettes are presentation-only and never enter the simulation world.
 */
export class SumiEVillageTheme extends SumiETheme implements HitRunTheme {
  public override renderBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cameraX: number,
    cameraY: number,
    elapsed: number
  ): void {
    super.renderBackdrop(ctx, w, h, cameraX, cameraY, elapsed);
    drawSumiEVillageLayer(ctx, w, h, cameraX);
  }
}
