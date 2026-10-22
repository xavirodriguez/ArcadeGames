import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { OutrunSharedPaletteTokens } from "../types/OutrunVisualTypes";
import { lerpColor } from "../utils/palette";

export type OutrunTrafficVehicleShape = "coupe" | "van" | "truck";

export interface OutrunTrafficArtworkStyle {
  shape: OutrunTrafficVehicleShape;
  bodyWidth: number;
  bodyHeight: number;
  bodyCornerRadius: number;
  cabinBaseWidth: number;
  cabinRoofWidth: number;
  cabinHeight: number;
  shadowRadiusX: number;
  shadowRadiusY: number;
  shadowAlpha: number;
  lightBarWidth: number;
  lightBarHeight: number;
  lightBarTopOffset: number;
  bodyColor: string;
  cabinColor: string;
  glassColor: string;
  shadowColor: string;
  lightBarColor: string;
}

export function resolveOutrunPlayerPalette(config: OutrunConfig): OutrunSharedPaletteTokens {
  return config.visual.palette.shared;
}

/** Shared dimensional recipe for the three restrained traffic silhouettes. */
export function resolveOutrunTrafficArtworkStyle(
  config: OutrunConfig,
  styleIndex: number,
  bodyWidth: number
): OutrunTrafficArtworkStyle {
  const tuning = config.visual.tuning.traffic;
  const shared = config.visual.palette.shared;
  const shapeIndex = ((Math.trunc(styleIndex) % 3) + 3) % 3;
  const shape: OutrunTrafficVehicleShape = shapeIndex === 0 ? "coupe" : shapeIndex === 1 ? "van" : "truck";
  const cabinHeightFactor = shape === "coupe" ? 1 : shape === "van" ? 1.32 : 1.5;
  const cabinWidthFactor = shape === "coupe" ? 1 : shape === "van" ? 0.88 : 0.82;
  const bodyHeightFactor = shape === "truck" ? 1.15 : 1;

  const trafficColors = [shared.trafficA, shared.trafficB, shared.trafficC] as const;
  const bodyColor = trafficColors[shapeIndex] ?? shared.trafficA;

  return {
    shape,
    bodyWidth,
    bodyHeight: bodyWidth * tuning.bodyHeightToWidth * bodyHeightFactor,
    bodyCornerRadius: bodyWidth * tuning.bodyCornerRadiusToWidth,
    cabinBaseWidth: bodyWidth * tuning.cabinBaseToBodyWidth * cabinWidthFactor,
    cabinRoofWidth: bodyWidth * tuning.cabinRoofToBodyWidth * cabinWidthFactor,
    cabinHeight: bodyWidth * tuning.cabinHeightToBodyWidth * cabinHeightFactor,
    shadowRadiusX: bodyWidth * tuning.shadowRadiusXToWidth,
    shadowRadiusY: Math.max(1, bodyWidth * tuning.shadowRadiusYToWidth),
    shadowAlpha: tuning.shadowAlpha,
    lightBarWidth: bodyWidth * tuning.lightBarWidthToBodyWidth,
    lightBarHeight: Math.max(1, bodyWidth * tuning.lightBarHeightToBodyWidth),
    lightBarTopOffset: bodyWidth * tuning.lightBarTopOffsetToBodyWidth,
    bodyColor,
    cabinColor: lerpColor(bodyColor, "#000000", tuning.cabinDarkenFraction),
    glassColor: shared.carGlass,
    shadowColor: shared.shadow,
    lightBarColor: shared.trafficLightBar
  };
}
