import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";
import { DEFAULT_OUTRUN_VISUAL_CONFIG } from "../config/visualDefaults";

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const paletteTokensSchema = z.object({
  skyHigh: hexColorSchema, skyMid: hexColorSchema, skyLow: hexColorSchema, horizon: hexColorSchema,
  sun: hexColorSchema, mtnFar: hexColorSchema, mtnMid: hexColorSchema, mtnNear: hexColorSchema,
  groundFar: hexColorSchema, groundNear: hexColorSchema, roadFar: hexColorSchema, roadNear: hexColorSchema,
  foliage: hexColorSchema, foliageLight: hexColorSchema, kerbB: hexColorSchema
});
const sharedPaletteSchema = z.object({
  car: hexColorSchema, carShade: hexColorSchema, carRoof: hexColorSchema, carGlass: hexColorSchema,
  carLightBar: hexColorSchema, carLightEnd: hexColorSchema, cream: hexColorSchema,
  trafficA: hexColorSchema, trafficB: hexColorSchema, trafficC: hexColorSchema, shadow: hexColorSchema,
  trafficLightBar: hexColorSchema, treeTrunk: hexColorSchema, hudMutedText: hexColorSchema,
  branchPanel: hexColorSchema, branchName: hexColorSchema, branchAccentCoast: hexColorSchema,
  branchAccentSierra: hexColorSchema, branchAccentDesert: hexColorSchema
});
const visualPointSchema = z.object({ x: z.number(), height: z.number() });
const mountainProfileSchema = z.object({
  far: z.array(visualPointSchema).min(2),
  mid: z.array(visualPointSchema).min(2),
  near: z.array(visualPointSchema).min(2)
});
const visualRectSchema = z.object({
  x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(),
  cornerRadius: z.number().min(0)
});
const visualTuningSchema = z.object({
  referenceWidthPx: z.number().positive(),
  horizonFraction: z.number().min(0.1).max(0.9),
  skyBandHeights: z.array(z.number().positive()).length(7),
  clouds: z.object({
    highCountMin: z.number().int().nonnegative(), highCountMax: z.number().int().positive(),
    lowCount: z.number().int().nonnegative(), widthMinPx: z.number().positive(), widthMaxPx: z.number().positive(),
    heightMinPx: z.number().positive(), heightMaxPx: z.number().positive(), alpha: z.number().min(0).max(1),
    driftPxPerSecond: z.number().nonnegative()
  }),
  astro: z.object({
    radiusToFrameWidth: z.number().positive(), haloRadiusMultiplier: z.number().positive(),
    haloAlpha: z.number().min(0).max(1), centerAboveHorizonPx: z.number().nonnegative(),
    horizontalPositionFraction: z.number().min(0).max(1)
  }),
  stars: z.object({
    highCountMin: z.number().int().nonnegative(), highCountMax: z.number().int().positive(),
    lowCount: z.number().int().nonnegative(), diameterPx: z.number().positive(),
    alphaMin: z.number().min(0).max(1), alphaMax: z.number().min(0).max(1)
  }),
  mountains: z.object({
    parallax: z.object({
      far: z.number().min(0), mid: z.number().min(0), near: z.number().min(0),
      baseDriftPxPerSecond: z.number().nonnegative(), speedDriftPxPerSecond: z.number().nonnegative(),
      curvatureScale: z.number().nonnegative()
    }),
    sierraProfile: mountainProfileSchema,
    coastProfile: mountainProfileSchema.optional(),
    desertProfile: mountainProfileSchema.optional(),
    snowPeakAlpha: z.number().min(0).max(1),
    snowPeakHalfWidthPx: z.number().positive(), snowPeakMinimumHeightPx: z.number().positive()
  }),
  road: z.object({
    stripeWhiteMix: z.number().min(0).max(1), kerbWidthToRoadHalfWidth: z.number().positive(),
    laneMarkWidthToRoadHalfWidth: z.number().positive(), speedLineWidthPx: z.number().positive(),
    speedLineAlpha: z.number().min(0).max(1), speedLineStartSpeedRatio: z.number().min(0).max(1)
  }),
  decor: z.object({
    coastLayerHeightMinRatio: z.number().positive(), coastLayerHeightMaxRatio: z.number().positive(),
    desertLayerHeightRatios: z.object({ far: z.number().positive(), mid: z.number().positive(), near: z.number().positive() }),
    desertGroundMix: z.number().min(0).max(1), desertSandColor: hexColorSchema,
    distantObjectHazeMix: z.number().min(0).max(1), waterNearToken: z.literal("skyMid"), waterFarToken: z.literal("skyLow")
  }),
  tree: z.object({
    heightToRoadHalfWidth: z.number().positive(), trunkWidthToHeight: z.number().positive(),
    trunkHeightToHeight: z.number().positive(), canopyRadiusXToHeight: z.number().positive(),
    canopyRadiusYToHeight: z.number().positive(), highlightScale: z.number().positive(),
    highlightOffsetX: z.number().min(0), highlightOffsetY: z.number().min(0),
    highlightAlpha: z.number().min(0).max(1), trunkColor: hexColorSchema
  }),
  playerCar: z.object({
    widthToRoadHalfWidth: z.number().positive(), referenceWidthPx: z.number().positive(),
    shadow: z.object({ rx: z.number().positive(), ry: z.number().positive(), alpha: z.number().min(0).max(1) }),
    wheelLeft: visualRectSchema, wheelRight: visualRectSchema, body: visualRectSchema, lowerShade: visualRectSchema,
    cabin: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
    roof: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
    rearWindow: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
    reflection: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
    lightBar: visualRectSchema, lightEndLeft: visualRectSchema, lightEndRight: visualRectSchema, licensePlate: visualRectSchema,
    curveTiltDegrees: z.number().nonnegative(), offRoadVibrationPx: z.number().nonnegative(), brakeEndScale: z.number().positive()
  }),
  traffic: z.object({
    widthToRoadHalfWidth: z.number().positive(), shadowRadiusXToWidth: z.number().positive(),
    shadowRadiusYToWidth: z.number().positive(), shadowAlpha: z.number().min(0).max(1),
    bodyHeightToWidth: z.number().positive(), bodyCornerRadiusToWidth: z.number().min(0),
    cabinBaseToBodyWidth: z.number().positive(), cabinRoofToBodyWidth: z.number().positive(),
    cabinHeightToBodyWidth: z.number().positive(), lightBarWidthToBodyWidth: z.number().positive(),
    lightBarHeightToBodyWidth: z.number().positive(), lightBarTopOffsetToBodyWidth: z.number().min(0),
    cabinDarkenFraction: z.number().min(0).max(1)
  }),
  hud: z.object({
    topMarginPx: z.number().nonnegative(), horizontalMarginPx: z.number().nonnegative(),
    timeLabelFontPx: z.number().positive(), timeDigitsFontPx: z.number().positive(),
    stageLabelFontPx: z.number().positive(), hourFontPx: z.number().positive(),
    progressHeightPx: z.number().positive(), progressTrackAlpha: z.number().min(0).max(1),
    carMarkerRadiusPx: z.number().positive(), branchMarkerRadiusPx: z.number().positive(),
    speedPill: z.object({
      marginPx: z.number().nonnegative(), widthPx: z.number().positive(), heightPx: z.number().positive(),
      cornerRadiusPx: z.number().nonnegative(), shadowAlpha: z.number().min(0).max(1),
      digitsFontPx: z.number().positive(), unitFontPx: z.number().positive()
    }),
    radioPill: z.object({
      marginPx: z.number().nonnegative(), widthPx: z.number().positive(), heightPx: z.number().positive(),
      cornerRadiusPx: z.number().nonnegative(), shadowAlpha: z.number().min(0).max(1).default(0.6), labelFontPx: z.number().positive(), barWidthPx: z.number().positive(),
      barHeightMinPx: z.number().positive(), barHeightMaxPx: z.number().positive(),
      activeBarHeightPx: z.number().positive(), activeBarWidthPx: z.number().positive()
    })
  }),
  branchGate: z.object({
    panelBackground: hexColorSchema, borderWidthPx: z.number().positive(), arrowAngleDegrees: z.number().positive(),
    distanceFontPx: z.number().positive(), decorNameFontPx: z.number().positive(),
    referenceDistanceMeters: z.number().positive(), nameColor: hexColorSchema,
    coastAccent: hexColorSchema, sierraAccent: hexColorSchema, desertAccent: hexColorSchema
  })
});

const timedPaletteSchema = z.object({
  dawn: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.paletteColorblind.dawn),
  noon: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.paletteColorblind.noon),
  afternoon: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.paletteColorblind.afternoon),
  night: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.paletteColorblind.night)
});

const configuredPaletteSchema = z.object({
  shared: paletteTokensSchema.extend({}).optional().optional() as never
});
