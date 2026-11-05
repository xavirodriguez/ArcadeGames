export type OutrunHour = "dawn" | "noon" | "afternoon" | "twilight" | "night";
export type OutrunPaletteHour = Exclude<OutrunHour, "twilight">;
export type OutrunDecor = "sierra" | "coast" | "desert";
export type OutrunVisualQuality = "high" | "low";
export type OutrunPaletteMode = "default" | "colorblind";

export interface OutrunPaletteTokens {
  skyHigh: string;
  skyMid: string;
  skyLow: string;
  horizon: string;
  sun: string;
  mtnFar: string;
  mtnMid: string;
  mtnNear: string;
  groundFar: string;
  groundNear: string;
  roadFar: string;
  roadNear: string;
  foliage: string;
  foliageLight: string;
  kerbB: string;
}

export interface OutrunSharedPaletteTokens {
  car: string;
  carShade: string;
  carRoof: string;
  carGlass: string;
  carLightBar: string;
  carLightEnd: string;
  cream: string;
  trafficA: string;
  trafficB: string;
  trafficC: string;
  shadow: string;
  trafficLightBar: string;
  treeTrunk: string;
  hudMutedText: string;
  branchPanel: string;
  branchName: string;
  branchAccentCoast: string;
  branchAccentSierra: string;
  branchAccentDesert: string;
}

export type OutrunTimedPaletteSet = Record<OutrunPaletteHour, OutrunPaletteTokens>;

export interface OutrunVisualPaletteConfig extends OutrunTimedPaletteSet {
  shared: OutrunSharedPaletteTokens;
}

export interface OutrunVisualStage {
  hour: OutrunHour;
  decor: OutrunDecor;
}

export interface OutrunVisualPoint {
  x: number;
  height: number;
}

export interface OutrunVisualRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface OutrunVisualTuning {
  referenceWidthPx: number;
  horizonFraction: number;
  skyBandHeights: number[];
  clouds: {
    highCountMin: number; highCountMax: number; lowCount: number;
    widthMinPx: number; widthMaxPx: number; heightMinPx: number; heightMaxPx: number;
    alpha: number; driftPxPerSecond: number;
  };
  astro: { radiusToFrameWidth: number; haloRadiusMultiplier: number; haloAlpha: number; centerAboveHorizonPx: number; horizontalPositionFraction: number };
  stars: { highCountMin: number; highCountMax: number; lowCount: number; diameterPx: number; alphaMin: number; alphaMax: number };
  mountains: {
    parallax: { far: number; mid: number; near: number; baseDriftPxPerSecond: number; speedDriftPxPerSecond: number; curvatureScale: number };
    sierraProfile: { far: OutrunVisualPoint[]; mid: OutrunVisualPoint[]; near: OutrunVisualPoint[] };
    coastProfile?: { far: OutrunVisualPoint[]; mid: OutrunVisualPoint[]; near: OutrunVisualPoint[] };
    desertProfile?: { far: OutrunVisualPoint[]; mid: OutrunVisualPoint[]; near: OutrunVisualPoint[] };
    snowPeakAlpha: number;
    snowPeakHalfWidthPx: number;
    snowPeakMinimumHeightPx: number;
  };
  road: {
    stripeWhiteMix: number; kerbWidthToRoadHalfWidth: number; laneMarkWidthToRoadHalfWidth: number;
    speedLineWidthPx: number; speedLineAlpha: number; speedLineStartSpeedRatio: number;
  };
  decor: {
    coastLayerHeightMinRatio: number; coastLayerHeightMaxRatio: number;
    desertLayerHeightRatios: { far: number; mid: number; near: number };
    desertGroundMix: number;
    desertSandColor: string; distantObjectHazeMix: number; waterNearToken: "skyMid"; waterFarToken: "skyLow";
  };
  tree: {
    heightToRoadHalfWidth: number; trunkWidthToHeight: number; trunkHeightToHeight: number;
    canopyRadiusXToHeight: number; canopyRadiusYToHeight: number; highlightScale: number;
    highlightOffsetX: number; highlightOffsetY: number; highlightAlpha: number; trunkColor: string;
  };
  playerCar: {
    widthToRoadHalfWidth: number; referenceWidthPx: number; shadow: { rx: number; ry: number; alpha: number };
    wheelLeft: OutrunVisualRect; wheelRight: OutrunVisualRect; body: OutrunVisualRect; lowerShade: OutrunVisualRect;
    cabin: Array<{ x: number; y: number }>; roof: Array<{ x: number; y: number }>;
    rearWindow: Array<{ x: number; y: number }>; reflection: Array<{ x: number; y: number }>;
    lightBar: OutrunVisualRect; lightEndLeft: OutrunVisualRect; lightEndRight: OutrunVisualRect; licensePlate: OutrunVisualRect;
    curveTiltDegrees: number; offRoadVibrationPx: number; brakeEndScale: number;
  };
  traffic: {
    widthToRoadHalfWidth: number; shadowRadiusXToWidth: number; shadowRadiusYToWidth: number; shadowAlpha: number;
    bodyHeightToWidth: number; bodyCornerRadiusToWidth: number; cabinBaseToBodyWidth: number; cabinRoofToBodyWidth: number;
    cabinHeightToBodyWidth: number; lightBarWidthToBodyWidth: number; lightBarHeightToBodyWidth: number;
    lightBarTopOffsetToBodyWidth: number; cabinDarkenFraction: number;
  };
  hud: {
    topMarginPx: number; horizontalMarginPx: number; timeLabelFontPx: number; timeDigitsFontPx: number;
    stageLabelFontPx: number; hourFontPx: number; progressHeightPx: number; progressTrackAlpha: number;
    carMarkerRadiusPx: number; branchMarkerRadiusPx: number;
    speedPill: { marginPx: number; widthPx: number; heightPx: number; cornerRadiusPx: number; shadowAlpha: number; digitsFontPx: number; unitFontPx: number };
    radioPill: { marginPx: number; widthPx: number; heightPx: number; cornerRadiusPx: number; shadowAlpha: number; labelFontPx: number; barWidthPx: number; barHeightMinPx: number; barHeightMaxPx: number; activeBarHeightPx: number; activeBarWidthPx: number };
  };
  branchGate: {
    panelBackground: string; borderWidthPx: number; arrowAngleDegrees: number; distanceFontPx: number; decorNameFontPx: number;
    referenceDistanceMeters: number; nameColor: string; coastAccent: string; sierraAccent: string; desertAccent: string;
  };
}

export interface OutrunVisualConfig {
  stages: OutrunVisualStage[];
  transitionFraction: number;
  palette: OutrunVisualPaletteConfig;
  paletteColorblind: OutrunTimedPaletteSet;
  paletteMode: OutrunPaletteMode;
  quality: OutrunVisualQuality;
  tuning: OutrunVisualTuning;
}

export interface OutrunVisualPaletteResource {
  stageIndex: number;
  stageProgress: number;
  /** Ease-smoothed blend into the next stage (0 outside the transition window). */
  transitionBlend: number;
  hour: OutrunHour;
  /** Effective display hour after transition (may equal next hour near the boundary). */
  nextHour: OutrunHour;
  decor: OutrunDecor;
  nextDecor: OutrunDecor;
  /** 0 = pure current decor profile, 1 = pure next decor profile. */
  decorBlend: number;
  /** 0–1 factor for night stars (ramps through twilight/dawn). */
  starAlphaFactor: number;
  /** 0–1 factor for headlights and night-only lighting. */
  lightsFactor: number;
  /** Normalized height multiplier for the sun/moon above the horizon. */
  astroHeightFactor: number;
  tokens: OutrunPaletteTokens;
  shared: OutrunSharedPaletteTokens;
  skyBands: string[];
  quality: OutrunVisualQuality;
  paletteMode: OutrunPaletteMode;
  tuning: OutrunVisualTuning;
}


/** Deterministic offsets consumed only by presentation drawers. */
export interface OutrunParallaxState {
  farOffsetX: number;
  midOffsetX: number;
  nearOffsetX: number;
}
