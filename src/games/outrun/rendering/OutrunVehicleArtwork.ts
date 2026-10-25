import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { OutrunSharedPaletteTokens } from "../types/OutrunVisualTypes";
import type { OutrunVisualMod } from "../mods/types";
import { lerpColor } from "../utils/palette";

export type ClassicTrafficVehicleShape = "coupe" | "van" | "truck";

/**
 * Generalized traffic vehicle shape/kind identifier.
 * Can be any string defined by an active OutrunVisualMod (e.g., "coupe", "van", "truck", "horse-cart").
 */
export type OutrunTrafficVehicleShape = string;

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
  const resolvedConfig = config?.visual ? config : DEFAULT_OUTRUN_CONFIG;
  return resolvedConfig.visual.palette.shared;
}

/** Shared dimensional recipe for traffic silhouettes. */
export function resolveOutrunTrafficArtworkStyle(
  config: OutrunConfig,
  styleIndex: number,
  bodyWidth: number,
  activeMod?: OutrunVisualMod
): OutrunTrafficArtworkStyle {
  const resolvedConfig = config?.visual ? config : DEFAULT_OUTRUN_CONFIG;
  const tuning = resolvedConfig.visual.tuning.traffic;
  const shared = resolvedConfig.visual.palette.shared;

  let shape: string;
  if (activeMod?.resolveTrafficVehicleShape) {
    shape = activeMod.resolveTrafficVehicleShape(styleIndex);
  } else {
    const shapeIndex = ((Math.trunc(styleIndex) % 3) + 3) % 3;
    shape = shapeIndex === 0 ? "coupe" : shapeIndex === 1 ? "van" : "truck";
  }

  const cabinHeightFactor = shape === "coupe" ? 1 : shape === "van" ? 1.2 : 1.35;
  const cabinWidthFactor = shape === "coupe" ? 1 : shape === "van" ? 0.88 : 0.82;
  const bodyHeightFactor = shape === "truck" ? 1.08 : 1;

  const shapeIndex = ((Math.trunc(styleIndex) % 3) + 3) % 3;
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
