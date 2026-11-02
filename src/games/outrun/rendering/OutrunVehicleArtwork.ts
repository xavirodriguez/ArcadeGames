import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { OutrunSharedPaletteTokens } from "../types/OutrunVisualTypes";
import type { OutrunVisualMod } from "../mods/types";

export type ClassicTrafficVehicleShape = "coupe" | "motorcycle" | "van" | "truck";

/**
 * Generalized traffic vehicle shape/kind identifier.
 * Visual mods may add their own kinds; unknown kinds use the coupe fallback geometry.
 */
export type OutrunTrafficVehicleShape = string;

export interface OutrunTrafficVehiclePalette {
  readonly bodyColor: string;
  readonly cabinColor: string;
  readonly accentColor: string;
  readonly detailColor: string;
  readonly glassColor: string;
  readonly wheelColor: string;
  readonly riderColor: string;
  readonly helmetColor: string;
}

export interface OutrunTrafficArtworkStyle {
  shape: OutrunTrafficVehicleShape;
  paletteIndex: number;
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
  accentColor: string;
  detailColor: string;
  wheelColor: string;
  riderColor: string;
  helmetColor: string;
}

export type TrafficVehicleGeometryCommand =
  | { readonly kind: "rect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly color: string; readonly alpha?: number }
  | { readonly kind: "ellipse"; readonly centerX: number; readonly centerY: number; readonly radiusX: number; readonly radiusY: number; readonly color: string; readonly alpha?: number }
  | { readonly kind: "polygon"; readonly points: readonly { readonly x: number; readonly y: number }[]; readonly color: string; readonly alpha?: number };

const TRAFFIC_KIND_BUCKETS: readonly ClassicTrafficVehicleShape[] = [
  "coupe", "van", "coupe", "truck",
  "coupe", "motorcycle", "coupe", "van",
  "coupe", "van", "coupe", "truck",
  "coupe", "motorcycle", "coupe", "van"
];

const TRAFFIC_PALETTES: Readonly<Record<ClassicTrafficVehicleShape, readonly OutrunTrafficVehiclePalette[]>> = {
  coupe: [
    { bodyColor: "#C6A55F", cabinColor: "#8E7445", accentColor: "#DFCA92", detailColor: "#695735", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#9786B5", cabinColor: "#695E7F", accentColor: "#B6A8CD", detailColor: "#514765", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#6B8FA9", cabinColor: "#405C72", accentColor: "#9CB6C8", detailColor: "#344B5D", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#78927C", cabinColor: "#4D6656", accentColor: "#A5B7A0", detailColor: "#3C5143", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" }
  ],
  motorcycle: [
    { bodyColor: "#5B8790", cabinColor: "#455A6C", accentColor: "#8FAEAE", detailColor: "#354755", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#455A6C", helmetColor: "#D5D1BF" },
    { bodyColor: "#B99A58", cabinColor: "#536979", accentColor: "#D8BD7F", detailColor: "#78633D", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#C97F62" },
    { bodyColor: "#A86F68", cabinColor: "#4A5864", accentColor: "#C99487", detailColor: "#704F4A", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#4A5864", helmetColor: "#8FA3B2" },
    { bodyColor: "#6C8499", cabinColor: "#3F4D5A", accentColor: "#A3B2BD", detailColor: "#34414B", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#3F4D5A", helmetColor: "#D7D4C8" }
  ],
  van: [
    { bodyColor: "#C4815E", cabinColor: "#A96D51", accentColor: "#E9CFB0", detailColor: "#754C42", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#648D86", cabinColor: "#496D67", accentColor: "#D4D5BB", detailColor: "#3F5D58", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#B69B60", cabinColor: "#8D7847", accentColor: "#ECE0BD", detailColor: "#665735", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#789AAF", cabinColor: "#526F84", accentColor: "#DCE2DD", detailColor: "#3D586C", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" }
  ],
  truck: [
    { bodyColor: "#929BA1", cabinColor: "#65727A", accentColor: "#C3C9C9", detailColor: "#56636C", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#627F97", cabinColor: "#40586E", accentColor: "#93AABD", detailColor: "#3E566B", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#A76F63", cabinColor: "#795149", accentColor: "#C69082", detailColor: "#704F4A", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" },
    { bodyColor: "#7E886D", cabinColor: "#5D674F", accentColor: "#A9B296", detailColor: "#535F4A", glassColor: "#162B3F", wheelColor: "#18232D", riderColor: "#536979", helmetColor: "#D5D1BF" }
  ]
};

function normalizeTrafficStyleSeed(styleIndex: number): number {
  if (!Number.isFinite(styleIndex)) return 0;
  return Math.abs(Math.trunc(styleIndex)) % 64;
}

/** Weighted, deterministic distribution: 50% coupe, 25% van, 12.5% truck, 12.5% motorcycle. */
export function resolveOutrunTrafficVehicleKind(styleIndex: number): ClassicTrafficVehicleShape {
  return TRAFFIC_KIND_BUCKETS[normalizeTrafficStyleSeed(styleIndex) % TRAFFIC_KIND_BUCKETS.length] ?? "coupe";
}

/** Palette selection uses the upper seed bits, independent from the archetype bucket. */
export function resolveOutrunTrafficPaletteIndex(styleIndex: number): number {
  return Math.floor(normalizeTrafficStyleSeed(styleIndex) / TRAFFIC_KIND_BUCKETS.length);
}

export function resolveOutrunTrafficVehiclePalette(
  kind: ClassicTrafficVehicleShape,
  paletteIndex: number
): OutrunTrafficVehiclePalette {
  const palettes = TRAFFIC_PALETTES[kind];
  const normalizedIndex = Number.isFinite(paletteIndex)
    ? Math.abs(Math.trunc(paletteIndex)) % palettes.length
    : 0;
  return palettes[normalizedIndex] ?? palettes[0]!;
}

export function resolveOutrunPlayerPalette(config: OutrunConfig): OutrunSharedPaletteTokens {
  const resolvedConfig = config?.visual ? config : DEFAULT_OUTRUN_CONFIG;
  return resolvedConfig.visual.palette.shared;
}

/** Resolves a stable silhouette, palette and projected proportions from one vehicle seed. */
export function resolveOutrunTrafficArtworkStyle(
  config: OutrunConfig,
  styleIndex: number,
  bodyWidth: number,
  activeMod?: OutrunVisualMod
): OutrunTrafficArtworkStyle {
  const resolvedConfig = config?.visual ? config : DEFAULT_OUTRUN_CONFIG;
  const tuning = resolvedConfig.visual.tuning.traffic;
  const shared = resolvedConfig.visual.palette.shared;
  const shape = activeMod?.resolveTrafficVehicleShape?.(styleIndex)
    ?? resolveOutrunTrafficVehicleKind(styleIndex);
  const knownShape = shape === "motorcycle" || shape === "van" || shape === "truck" || shape === "coupe"
    ? shape
    : "coupe";
  const paletteIndex = resolveOutrunTrafficPaletteIndex(styleIndex);
  const palette = resolveOutrunTrafficVehiclePalette(knownShape, paletteIndex);

  const widthFactor = knownShape === "motorcycle" ? 0.36 : knownShape === "van" ? 1.08 : knownShape === "truck" ? 1.2 : 1;
  const resolvedWidth = bodyWidth * widthFactor;
  const bodyHeight = knownShape === "motorcycle"
    ? resolvedWidth * 1.92
    : knownShape === "van"
      ? resolvedWidth * 0.46
      : knownShape === "truck"
        ? resolvedWidth * 0.49
        : resolvedWidth * tuning.bodyHeightToWidth;
  const cabinHeight = knownShape === "coupe" ? resolvedWidth * tuning.cabinHeightToBodyWidth : 0;
  const cabinWidthFactor = knownShape === "van" ? 0.88 : knownShape === "truck" ? 0.82 : 1;

  return {
    shape,
    paletteIndex,
    bodyWidth: resolvedWidth,
    bodyHeight,
    bodyCornerRadius: resolvedWidth * tuning.bodyCornerRadiusToWidth,
    cabinBaseWidth: resolvedWidth * tuning.cabinBaseToBodyWidth * cabinWidthFactor,
    cabinRoofWidth: resolvedWidth * tuning.cabinRoofToBodyWidth * cabinWidthFactor,
    cabinHeight,
    shadowRadiusX: resolvedWidth * tuning.shadowRadiusXToWidth,
    shadowRadiusY: Math.max(1, resolvedWidth * tuning.shadowRadiusYToWidth),
    shadowAlpha: tuning.shadowAlpha,
    lightBarWidth: resolvedWidth * tuning.lightBarWidthToBodyWidth,
    lightBarHeight: Math.max(1, resolvedWidth * tuning.lightBarHeightToBodyWidth),
    lightBarTopOffset: resolvedWidth * tuning.lightBarTopOffsetToBodyWidth,
    bodyColor: palette.bodyColor,
    cabinColor: palette.cabinColor,
    glassColor: shared.carGlass,
    shadowColor: shared.shadow,
    lightBarColor: shared.trafficLightBar,
    accentColor: palette.accentColor,
    detailColor: palette.detailColor,
    wheelColor: palette.wheelColor,
    riderColor: palette.riderColor,
    helmetColor: palette.helmetColor
  };
}

/** Produces renderer-neutral primitives; Canvas and Skia consume this exact geometry. */
export function resolveOutrunTrafficVehicleGeometry(
  style: OutrunTrafficArtworkStyle
): readonly TrafficVehicleGeometryCommand[] {
  const commands: TrafficVehicleGeometryCommand[] = [];
  const { bodyWidth: width, bodyHeight, bodyColor, cabinColor, glassColor, shadowColor,
    lightBarColor, accentColor, detailColor, wheelColor, riderColor, helmetColor } = style;

  const rect = (x: number, y: number, rectWidth: number, height: number, color: string, alpha?: number): void => {
    commands.push({ kind: "rect", x, y, width: rectWidth, height, color, ...(alpha === undefined ? {} : { alpha }) });
  };
  const ellipse = (centerX: number, centerY: number, radiusX: number, radiusY: number, color: string, alpha?: number): void => {
    commands.push({ kind: "ellipse", centerX, centerY, radiusX, radiusY, color, ...(alpha === undefined ? {} : { alpha }) });
  };
  const polygon = (points: readonly { x: number; y: number }[], color: string, alpha?: number): void => {
    commands.push({ kind: "polygon", points, color, ...(alpha === undefined ? {} : { alpha }) });
  };

  ellipse(0, 0, style.shadowRadiusX, style.shadowRadiusY, shadowColor, style.shadowAlpha);

  switch (style.shape) {
    case "motorcycle": {
      const tyreWidth = width * 0.13;
      const tyreHeight = width * 0.105;
      const rearTyreY = -tyreHeight * 0.62;
      const frontTyreY = -bodyHeight + tyreHeight * 0.85;
      ellipse(0, rearTyreY, tyreWidth, tyreHeight, wheelColor);
      ellipse(0, frontTyreY, tyreWidth * 0.78, tyreHeight * 0.82, wheelColor);
      polygon([
        { x: -width * 0.045, y: rearTyreY - tyreHeight * 0.2 },
        { x: width * 0.045, y: rearTyreY - tyreHeight * 0.2 },
        { x: width * 0.14, y: -bodyHeight * 0.34 },
        { x: -width * 0.11, y: -bodyHeight * 0.38 }
      ], detailColor);
      polygon([
        { x: -width * 0.19, y: -bodyHeight * 0.32 },
        { x: width * 0.19, y: -bodyHeight * 0.32 },
        { x: width * 0.145, y: -bodyHeight * 0.66 },
        { x: width * 0.09, y: -bodyHeight * 0.76 },
        { x: -width * 0.09, y: -bodyHeight * 0.76 },
        { x: -width * 0.145, y: -bodyHeight * 0.66 }
      ], bodyColor);
      polygon([
        { x: -width * 0.12, y: -bodyHeight * 0.48 },
        { x: width * 0.12, y: -bodyHeight * 0.48 },
        { x: width * 0.09, y: -bodyHeight * 0.68 },
        { x: -width * 0.09, y: -bodyHeight * 0.68 }
      ], accentColor);
      polygon([
        { x: -width * 0.13, y: -bodyHeight * 0.71 },
        { x: width * 0.13, y: -bodyHeight * 0.71 },
        { x: width * 0.105, y: -bodyHeight * 0.88 },
        { x: -width * 0.105, y: -bodyHeight * 0.88 }
      ], riderColor);
      polygon([
        { x: -width * 0.2, y: -bodyHeight * 0.67 },
        { x: -width * 0.1, y: -bodyHeight * 0.75 },
        { x: -width * 0.24, y: -bodyHeight * 0.84 },
        { x: -width * 0.27, y: -bodyHeight * 0.8 }
      ], riderColor);
      polygon([
        { x: width * 0.2, y: -bodyHeight * 0.67 },
        { x: width * 0.1, y: -bodyHeight * 0.75 },
        { x: width * 0.24, y: -bodyHeight * 0.84 },
        { x: width * 0.27, y: -bodyHeight * 0.8 }
      ], riderColor);
      ellipse(0, -bodyHeight * 0.91, width * 0.13, width * 0.105, helmetColor);
      rect(-width * 0.07, -bodyHeight * 0.3, width * 0.14, Math.max(1, width * 0.035), lightBarColor);
      break;
    }

    case "van": {
      const top = -bodyHeight;
      ellipse(-width * 0.38, -width * 0.035, width * 0.085, width * 0.06, wheelColor);
      ellipse(width * 0.38, -width * 0.035, width * 0.085, width * 0.06, wheelColor);
      polygon([
        { x: -width * 0.5, y: -width * 0.02 },
        { x: width * 0.5, y: -width * 0.02 },
        { x: width * 0.5, y: top + width * 0.04 },
        { x: width * 0.43, y: top },
        { x: -width * 0.43, y: top },
        { x: -width * 0.5, y: top + width * 0.04 }
      ], bodyColor);
      rect(-width * 0.37, top + bodyHeight * 0.34, width * 0.74, bodyHeight * 0.53, accentColor, 0.34);
      rect(-width * 0.012, top + bodyHeight * 0.28, width * 0.024, bodyHeight * 0.62, detailColor);
      rect(-width * 0.29, top + bodyHeight * 0.1, width * 0.58, bodyHeight * 0.16, glassColor);
      rect(-width * 0.43, top + bodyHeight * 0.11, width * 0.045, bodyHeight * 0.28, lightBarColor);
      rect(width * 0.385, top + bodyHeight * 0.11, width * 0.045, bodyHeight * 0.28, lightBarColor);
      rect(-width * 0.12, top + bodyHeight * 0.77, width * 0.24, Math.max(1, width * 0.045), detailColor);
      rect(-width * 0.5, -width * 0.13, width, width * 0.065, detailColor);
      rect(-width * 0.07, -width * 0.115, width * 0.14, width * 0.035, lightBarColor);
      break;
    }

    case "truck": {
      const top = -bodyHeight;
      ellipse(-width * 0.42, -width * 0.035, width * 0.075, width * 0.06, wheelColor);
      ellipse(width * 0.42, -width * 0.035, width * 0.075, width * 0.06, wheelColor);
      ellipse(-width * 0.31, -width * 0.035, width * 0.06, width * 0.05, wheelColor);
      ellipse(width * 0.31, -width * 0.035, width * 0.06, width * 0.05, wheelColor);
      polygon([
        { x: -width * 0.5, y: -width * 0.02 },
        { x: width * 0.5, y: -width * 0.02 },
        { x: width * 0.5, y: top + width * 0.035 },
        { x: width * 0.47, y: top },
        { x: -width * 0.47, y: top },
        { x: -width * 0.5, y: top + width * 0.035 }
      ], bodyColor);
      rect(-width * 0.43, top + bodyHeight * 0.08, width * 0.86, bodyHeight * 0.81, accentColor, 0.3);
      rect(-width * 0.012, top + bodyHeight * 0.08, width * 0.024, bodyHeight * 0.81, detailColor);
      rect(-width * 0.4, top + bodyHeight * 0.35, width * 0.8, Math.max(1, width * 0.018), detailColor);
      rect(-width * 0.4, top + bodyHeight * 0.66, width * 0.8, Math.max(1, width * 0.018), detailColor);
      rect(-width * 0.37, top + bodyHeight * 0.13, width * 0.018, bodyHeight * 0.68, detailColor);
      rect(width * 0.352, top + bodyHeight * 0.13, width * 0.018, bodyHeight * 0.68, detailColor);
      rect(-width * 0.06, top + bodyHeight * 0.13, width * 0.025, bodyHeight * 0.58, detailColor);
      rect(width * 0.035, top + bodyHeight * 0.13, width * 0.025, bodyHeight * 0.58, detailColor);
      rect(-width * 0.5, -width * 0.14, width, width * 0.075, detailColor);
      rect(-width * 0.44, top + bodyHeight * 0.08, width * 0.045, bodyHeight * 0.2, lightBarColor);
      rect(width * 0.395, top + bodyHeight * 0.08, width * 0.045, bodyHeight * 0.2, lightBarColor);
      rect(-width * 0.09, -width * 0.115, width * 0.18, width * 0.04, lightBarColor);
      break;
    }

    case "coupe":
    default: {
      const bodyTop = -bodyHeight;
      const cabinTop = bodyTop - style.cabinHeight;
      ellipse(-width * 0.39, -width * 0.035, width * 0.09, width * 0.065, wheelColor);
      ellipse(width * 0.39, -width * 0.035, width * 0.09, width * 0.065, wheelColor);
      polygon([
        { x: -width * 0.5, y: -width * 0.02 },
        { x: width * 0.5, y: -width * 0.02 },
        { x: width * 0.5, y: bodyTop + width * 0.05 },
        { x: width * 0.38, y: bodyTop },
        { x: -width * 0.38, y: bodyTop },
        { x: -width * 0.5, y: bodyTop + width * 0.05 }
      ], bodyColor);
      polygon([
        { x: -width * 0.45, y: bodyTop + width * 0.04 },
        { x: width * 0.45, y: bodyTop + width * 0.04 },
        { x: width * 0.38, y: bodyTop + bodyHeight * 0.44 },
        { x: -width * 0.38, y: bodyTop + bodyHeight * 0.44 }
      ], cabinColor);
      const baseHalf = style.cabinBaseWidth / 2;
      const roofHalf = style.cabinRoofWidth / 2;
      polygon([
        { x: -baseHalf, y: bodyTop },
        { x: baseHalf, y: bodyTop },
        { x: roofHalf, y: cabinTop },
        { x: -roofHalf, y: cabinTop }
      ], accentColor);
      polygon([
        { x: -baseHalf * 0.72, y: bodyTop - style.cabinHeight * 0.08 },
        { x: baseHalf * 0.72, y: bodyTop - style.cabinHeight * 0.08 },
        { x: roofHalf * 0.72, y: cabinTop + style.cabinHeight * 0.18 },
        { x: -roofHalf * 0.72, y: cabinTop + style.cabinHeight * 0.18 }
      ], glassColor);
      polygon([
        { x: -baseHalf * 0.48, y: bodyTop - style.cabinHeight * 0.1 },
        { x: -baseHalf * 0.16, y: bodyTop - style.cabinHeight * 0.1 },
        { x: roofHalf * 0.3, y: cabinTop + style.cabinHeight * 0.2 },
        { x: -roofHalf * 0.32, y: cabinTop + style.cabinHeight * 0.2 }
      ], "#FFF1D6", 0.18);
      rect(-style.lightBarWidth / 2, bodyTop + style.lightBarTopOffset, style.lightBarWidth, style.lightBarHeight, lightBarColor);
      rect(-width * 0.43, bodyTop + style.lightBarTopOffset, width * 0.12, style.lightBarHeight, "#B86B61");
      rect(width * 0.31, bodyTop + style.lightBarTopOffset, width * 0.12, style.lightBarHeight, "#B86B61");
      rect(-width * 0.12, -width * 0.14, width * 0.24, width * 0.055, detailColor);
      break;
    }
  }

  return commands;
}
