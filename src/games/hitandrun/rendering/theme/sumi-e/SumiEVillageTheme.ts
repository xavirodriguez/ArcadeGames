import type { SkCanvas } from "@shopify/react-native-skia";
import type { PresentationRandom } from "../../../../shared/presentation/PresentationContracts";
import type { HitRunTheme } from "../HitRunTheme";
import { SumiETheme } from "./SumiETheme";
import { drawSumiEVillageLayer, drawSumiEVillageLayerSkia } from "./SumiEVillageLayer";

/**
 * Sumi-e theme variant with repeated building sprites in the settlement plane.
 * Base theme controls composition order so buildings stay beneath the decorative frame.
 */
export class SumiEVillageTheme extends SumiETheme implements HitRunTheme {
  public constructor(random?: PresentationRandom, seed = 98765) {
    super(random, seed);
  }

  protected override renderEnvironmentLayerCanvas(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
    cameraX: number
  ): void {
    drawSumiEVillageLayer(ctx, viewportWidth, viewportHeight, cameraX);
  }

  protected override renderEnvironmentLayerSkia(
    canvas: SkCanvas,
    viewportWidth: number,
    viewportHeight: number,
    cameraX: number
  ): void {
    drawSumiEVillageLayerSkia(canvas, viewportWidth, viewportHeight, cameraX);
  }
}
