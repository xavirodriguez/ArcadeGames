import type { SkCanvas } from "@shopify/react-native-skia";
import type { HitRunTheme } from "../HitRunTheme";
import { SumiETheme } from "./SumiETheme";
import { drawSumiEVillageLayer, drawSumiEVillageLayerSkia } from "./SumiEVillageLayer";

/**
 * Sumi-e theme variant with a repeated village skyline in the backdrop.
 * House silhouettes are presentation-only and never enter the simulation world.
 */
export class SumiEVillageTheme extends SumiETheme implements HitRunTheme {
  public override renderBackdropSkia(
    canvas: SkCanvas,
    w: number,
    h: number,
    cameraX: number,
    cameraY: number,
    elapsed: number
  ): void {
    super.renderBackdropSkia(canvas, w, h, cameraX, cameraY, elapsed);
    drawSumiEVillageLayerSkia(canvas, w, h, cameraX);
  }

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
