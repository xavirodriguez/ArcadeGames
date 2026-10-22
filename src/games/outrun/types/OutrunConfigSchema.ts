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
const visualRectSchema = z.object({
  x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(),
  cornerRadius: z.number().min(0)
});
const visualTuningSchema = z.object({
  referenceWidthPx: z.number().positive(),
  skyBandHeights: z.array(z.number().positive()).length(7),
  clouds: z.object({
    highCountMin: z.number().int().nonnegative(), highCountMax: z.number().int().positive(),
    lowCount: z.number().int().nonnegative(), widthMinPx: z.number().positive(), widthMaxPx: z.number().positive(),
    heightMinPx: z.number().positive(), heightMaxPx: z.number().positive(), alpha: z.number().min(0).max(1),
    driftPxPerSecond: z.number().nonnegative()
  }),
  astro: z.object({
    radiusToFrameWidth: z.number().positive(), haloRadiusMultiplier: z.number().positive(),
    haloAlpha: z.number().min(0).max(1), centerAboveHorizonPx: z.number().nonnegative()
  }),
  stars: z.object({
    highCountMin: z.number().int().nonnegative(), highCountMax: z.number().int().positive(),
    lowCount: z.number().int().nonnegative(), diameterPx: z.number().positive(),
    alphaMin: z.number().min(0).max(1), alphaMax: z.number().min(0).max(1)
  }),
  mountains: z.object({
    parallax: z.object({ far: z.number().min(0), mid: z.number().min(0), near: z.number().min(0) }),
    sierraProfile: z.object({
      far: z.array(visualPointSchema).min(2), mid: z.array(visualPointSchema).min(2), near: z.array(visualPointSchema).min(2)
    }),
    snowPeakAlpha: z.number().min(0).max(1)
  }),
  road: z.object({
    stripeWhiteMix: z.number().min(0).max(1), kerbWidthToRoadHalfWidth: z.number().positive(),
    laneMarkWidthToRoadHalfWidth: z.number().positive(), speedLineWidthPx: z.number().positive(),
    speedLineAlpha: z.number().min(0).max(1), speedLineStartSpeedRatio: z.number().min(0).max(1)
  }),
  decor: z.object({
    coastLayerHeightMinRatio: z.number().positive(), coastLayerHeightMaxRatio: z.number().positive(),
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
      cornerRadiusPx: z.number().nonnegative(), labelFontPx: z.number().positive(), barWidthPx: z.number().positive(),
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
  shared: sharedPaletteSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.palette.shared),
  dawn: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.palette.dawn),
  noon: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.palette.noon),
  afternoon: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.palette.afternoon),
  night: paletteTokensSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.palette.night)
});

/** Runtime-validated, data-driven visual settings for Out Run. */
export const OutrunVisualConfigSchema = z.object({
  stages: z.array(z.object({
    hour: z.enum(["dawn", "noon", "afternoon", "twilight", "night"]),
    decor: z.enum(["sierra", "coast", "desert"])
  })).min(1).default(DEFAULT_OUTRUN_VISUAL_CONFIG.stages),
  transitionFraction: z.number().min(0).max(1).default(DEFAULT_OUTRUN_VISUAL_CONFIG.transitionFraction),
  palette: configuredPaletteSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.palette),
  paletteColorblind: timedPaletteSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.paletteColorblind),
  paletteMode: z.enum(["default", "colorblind"]).default(DEFAULT_OUTRUN_VISUAL_CONFIG.paletteMode),
  quality: z.enum(["high", "low"]).default(DEFAULT_OUTRUN_VISUAL_CONFIG.quality),
  tuning: visualTuningSchema.default(DEFAULT_OUTRUN_VISUAL_CONFIG.tuning)
}).default(DEFAULT_OUTRUN_VISUAL_CONFIG);

export const OutrunConfigSchema = BaseConfigSchema.extend({
  segmentLength: z.number().positive().default(200),
  rumbleLength: z.number().int().positive().default(3),
  roadWidth: z.number().positive().default(2000),
  cameraHeight: z.number().positive().default(1000),
  cameraDepth: z.number().positive().default(0.84),
  drawDistance: z.number().int().positive().default(300),
  maxSpeed: z.number().positive().default(12000),
  centrifugalForce: z.number().min(0).default(0.3),
  accel: z.number().positive().default(2000),
  brake: z.number().positive().default(4000),
  decel: z.number().positive().default(800),
  offRoadDecel: z.number().positive().default(2000),
  offRoadLimit: z.number().positive().default(4000),
  steerSpeed: z.number().positive().default(3.0),
  playerZOffset: z.number().default(0),
  laneWidth: z.number().positive().default(0.3),
  trafficDensity: z.number().min(0).max(1).default(0.02),
  /** Max segments each rival inspects ahead for steering (Session 4). */
  trafficLookaheadSegments: z.number().int().positive().default(20),
  /** Lateral overlap radius for treating another car as a blocking threat. */
  trafficAvoidRadius: z.number().positive().default(0.35),
  /** Max lateral units/sec when steering around slower traffic. */
  trafficSteerSpeed: z.number().positive().default(1.5),
  /** Minimum collision detection substeps per frame (anti-tunneling). */
  trafficCollisionSubsteps: z.number().int().positive().default(4),
  /** Cap on adaptive substeps when deltaTime approaches engine maxDelta (0.25s). */
  trafficCollisionSubstepsMax: z.number().int().positive().default(32),
  WIDTH: z.number().positive().default(800),
  HEIGHT: z.number().positive().default(600),
  visual: OutrunVisualConfigSchema
});

export type OutrunConfig = z.infer<typeof OutrunConfigSchema>;
export const DEFAULT_OUTRUN_CONFIG: OutrunConfig = OutrunConfigSchema.parse({});
