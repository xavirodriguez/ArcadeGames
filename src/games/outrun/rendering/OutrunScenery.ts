import type { World } from "@tiny-aster/core";
import { scenarioHash } from "./OutrunPalettes";
import { computeCurvatureParallaxOffset } from "./OutrunVisualHelpers";
import { createVisualPaletteResource, groundColorAtDepth, lerpColor } from "../utils/palette";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type {
  OutrunVisualPoint, OutrunVisualPaletteResource, OutrunParallaxState
} from "../types/OutrunVisualTypes";
import type { OutrunComponentRegistry, RaceStateComponent, RoadData } from "../types/OutrunTypes";

export interface SkyBandLayout { y: number; height: number; color: string; }
export interface CloudLayout { x: number; y: number; width: number; height: number; }
export interface StarLayout { x: number; y: number; alpha: number; diameter: number; }
export interface AstroLayout {
  x: number; y: number; radius: number; haloRadius: number; haloAlpha: number; color: string;
}
export interface MountainLayerLayout {
  layer: "far" | "mid" | "near";
  color: string;
  profile: OutrunVisualPoint[];
  snowCaps: Array<{ x: number; peakHeight: number; halfWidth: number }>;
  offsetX: number;
  cacheKey: string;
}
export interface OutrunSceneryLayout {
  decor: OutrunVisualPaletteResource["decor"];
  hour: OutrunVisualPaletteResource["hour"];
  quality: OutrunVisualPaletteResource["quality"];
  horizonY: number;
  groundColor: string;
  creamColor: string;
  cloudAlpha: number;
  skyBands: SkyBandLayout[];
  clouds: CloudLayout[];
  stars: StarLayout[];
  astro: AstroLayout;
  mountainLayers: MountainLayerLayout[];
  snowPeakAlpha: number;
}

const LAYERS = ["far", "mid", "near"] as const;
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function wrap(value: number, period: number): number {
  if (period <= 0) return 0;
  return ((value % period) + period) % period;
}

export function computeParallaxState(
  state: RaceStateComponent,
  roadData: RoadData,
  config: OutrunConfig
): OutrunParallaxState {
  const screenWidth = config.WIDTH;
  const tuning = config.visual.tuning.mountains.parallax;
  const speedRatio = config.maxSpeed > 0 ? clamp01(state.speed / config.maxSpeed) : 0;
  const curvatureOffset = computeCurvatureParallaxOffset(
    roadData.segments, state.playerZ, roadData.trackLength, tuning.curvatureScale
  ) * screenWidth;
  // Elapsed race time provides a deterministic phase that doesn't jump at track wrap.
  const distanceOffset = state.lapTime *
    (tuning.baseDriftPxPerSecond + tuning.speedDriftPxPerSecond * speedRatio);
  const baseOffset = distanceOffset + curvatureOffset;
  const factors = tuning;
  return {
    farOffsetX: wrap(baseOffset * factors.far, screenWidth),
    midOffsetX: wrap(baseOffset * factors.mid, screenWidth),
    nearOffsetX: wrap(baseOffset * factors.near, screenWidth)
  };
}

export function resolveOutrunSceneryLayout(
  world: World<OutrunComponentRegistry>,
  state: RaceStateComponent,
  roadData: RoadData,
  config: OutrunConfig
): OutrunSceneryLayout {
  const visualPalette = world.getResource<OutrunVisualPaletteResource>("VisualPalette")
    ?? createVisualPaletteResource(state, roadData, config);
  const parallaxState = world.getResource<OutrunParallaxState>("ParallaxState")
    ?? computeParallaxState(state, roadData, config);
  return buildOutrunSceneryLayout(state, config, visualPalette, parallaxState);
}

export function buildOutrunSceneryLayout(
  state: RaceStateComponent,
  config: OutrunConfig,
  visualPalette: OutrunVisualPaletteResource,
  parallax: OutrunParallaxState
): OutrunSceneryLayout {
  const screenW = config.WIDTH;
  const screenH = config.HEIGHT;
  const tuning = visualPalette.tuning;
  const horizonY = screenH * tuning.horizonFraction;
  const referenceScale = screenW / tuning.referenceWidthPx;
  const lowQuality = visualPalette.quality === "low";
  const rawHeights = tuning.skyBandHeights;
  const totalHeight = rawHeights.reduce((sum, height) => sum + height, 0) || 1;
  const selectedColors = lowQuality
    ? [visualPalette.tokens.skyHigh, visualPalette.tokens.skyMid, visualPalette.tokens.skyLow, visualPalette.tokens.horizon]
    : visualPalette.skyBands;
  const proportions = lowQuality
    ? selectedColors.map(() => 1 / selectedColors.length)
    : rawHeights.map(height => height / totalHeight);
  let currentY = 0;
  const skyBands = selectedColors.map((color, index) => {
    const height = index === selectedColors.length - 1 ? horizonY - currentY : horizonY * proportions[index]!;
    const band = { y: currentY, height, color };
    currentY += height;
    return band;
  });

  const cloudTuning = tuning.clouds;
  const cloudCount = lowQuality ? cloudTuning.lowCount
    : cloudTuning.highCountMin + Math.floor(
      scenarioHash("outrun_cloud_count", visualPalette.stageIndex) *
      (cloudTuning.highCountMax - cloudTuning.highCountMin + 1)
    );
  const clouds: CloudLayout[] = [];
  for (let index = 0; index < cloudCount; index++) {
    const xSeed = scenarioHash("outrun_cloud_x", index);
    const ySeed = scenarioHash("outrun_cloud_y", index);
    const widthSeed = scenarioHash("outrun_cloud_width", index);
    const width = (cloudTuning.widthMinPx +
      (cloudTuning.widthMaxPx - cloudTuning.widthMinPx) * widthSeed) * referenceScale;
    const drift = state.lapTime * cloudTuning.driftPxPerSecond * (0.65 + xSeed * 0.7);
    clouds.push({
      x: wrap(xSeed * screenW + drift, screenW),
      y: horizonY * (0.14 + ySeed * 0.48),
      width,
      height: (cloudTuning.heightMinPx +
        (cloudTuning.heightMaxPx - cloudTuning.heightMinPx) * ySeed) * referenceScale
    });
  }

  const stars: StarLayout[] = [];
  if (visualPalette.hour === "night") {
    const starTuning = tuning.stars;
    const starCount = lowQuality ? starTuning.lowCount
      : starTuning.highCountMin + Math.floor(
        scenarioHash("outrun_star_count", visualPalette.stageIndex) *
        (starTuning.highCountMax - starTuning.highCountMin + 1)
      );
    const upperSkyHeight = skyBands.slice(0, Math.min(2, skyBands.length))
      .reduce((sum, band) => sum + band.height, 0);
    for (let index = 0; index < starCount; index++) {
      const xSeed = scenarioHash("outrun_star_x", index);
      const ySeed = scenarioHash("outrun_star_y", index);
      const alphaSeed = scenarioHash("outrun_star_alpha", index);
      stars.push({
        x: xSeed * screenW, y: ySeed * upperSkyHeight,
        alpha: starTuning.alphaMin + (starTuning.alphaMax - starTuning.alphaMin) * alphaSeed,
        diameter: starTuning.diameterPx
      });
    }
  }

  const astroTuning = tuning.astro;
  const radius = screenW * astroTuning.radiusToFrameWidth;
  const astro: AstroLayout = {
    x: wrap(screenW * astroTuning.horizontalPositionFraction - state.playerX * 15 + parallax.farOffsetX * 0.05, screenW),
    y: horizonY - astroTuning.centerAboveHorizonPx * referenceScale,
    radius, haloRadius: radius * astroTuning.haloRadiusMultiplier,
    haloAlpha: astroTuning.haloAlpha, color: visualPalette.tokens.sun
  };

  const sierraProfiles = tuning.mountains.sierraProfile;
  const layers: MountainLayerLayout[] = LAYERS.map((layer, layerIndex) => {
    const sourceProfile = sierraProfiles[layer];
    let ratio = 1;
    if (visualPalette.decor === "coast") {
      ratio = tuning.decor.coastLayerHeightMinRatio +
        (tuning.decor.coastLayerHeightMaxRatio - tuning.decor.coastLayerHeightMinRatio) * (layerIndex / 2);
    } else if (visualPalette.decor === "desert") {
      ratio = tuning.decor.desertLayerHeightRatios[layer];
    }
    const profile = sourceProfile.map(point => {
      let height = point.height * ratio;
      if (visualPalette.decor === "desert") {
        height += (scenarioHash("outrun_desert_profile", Math.round(point.x) + layerIndex * 100) - 0.5) *
          point.height * 0.16;
        height = Math.max(2, height);
      }
      return { x: point.x * referenceScale, height: height * referenceScale };
    });
    const snowCaps: MountainLayerLayout["snowCaps"] = [];
    if (visualPalette.decor === "sierra" && layer === "far") {
      for (let index = 1; index < sourceProfile.length - 1; index++) {
        const previous = sourceProfile[index - 1]!;
        const peak = sourceProfile[index]!;
        const next = sourceProfile[index + 1]!;
        if (peak.height < previous.height || peak.height < next.height || peak.height < tuning.mountains.snowPeakMinimumHeightPx) continue;
        snowCaps.push({
          x: peak.x * referenceScale, peakHeight: peak.height * referenceScale,
          halfWidth: Math.max(2, referenceScale * tuning.mountains.snowPeakHalfWidthPx)
        });
      }
    }
    const offsetX = layer === "far" ? parallax.farOffsetX
      : layer === "mid" ? parallax.midOffsetX : parallax.nearOffsetX;
    const cacheKey = [
      screenW, horizonY, visualPalette.decor, layer,
      profile.map(point => point.x.toFixed(3) + "," + point.height.toFixed(3)).join(";"),
      snowCaps.map(cap => cap.x.toFixed(3) + "," + cap.peakHeight.toFixed(3)).join(";")
    ].join("|");
    return {
      layer,
      color: layer === "far" ? visualPalette.tokens.mtnFar
        : layer === "mid" ? visualPalette.tokens.mtnMid : visualPalette.tokens.mtnNear,
      profile, snowCaps, offsetX, cacheKey
    };
  });

  const farGround = groundColorAtDepth(visualPalette.tokens, 1, 0, 0);
  const groundColor = visualPalette.decor === "desert"
    ? lerpColor(farGround, tuning.decor.desertSandColor, tuning.decor.desertGroundMix)
    : farGround;

  return {
    decor: visualPalette.decor, hour: visualPalette.hour, quality: visualPalette.quality,
    horizonY, groundColor, creamColor: visualPalette.shared.cream,
    cloudAlpha: tuning.clouds.alpha, skyBands, clouds, stars, astro, mountainLayers: layers,
    snowPeakAlpha: tuning.mountains.snowPeakAlpha
  };
}
