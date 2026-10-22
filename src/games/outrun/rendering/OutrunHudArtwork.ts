import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { OutrunHour, OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";

export interface OutrunHudLayoutInput {
  config: OutrunConfig;
  progressFraction: number;
  speedKmh: number;
  timeStr: string;
  visualPalette: OutrunVisualPaletteResource;
}

export interface OutrunHudLayout {
  scale: number;
  time: { x: number; labelY: number; valueY: number; labelFont: number; valueFont: number; value: string };
  stage: { x: number; labelY: number; hourY: number; labelFont: number; hourFont: number; label: string; hour: string };
  progress: {
    x: number; y: number; width: number; height: number; trackAlpha: number;
    filledWidth: number; carMarkerX: number; branchMarkerX: number;
    carMarkerRadius: number; branchMarkerRadius: number;
  };
  speedPill: {
    x: number; y: number; width: number; height: number; radius: number; shadowAlpha: number;
    digitsX: number; digitsY: number; digitsFont: number; unitX: number; unitY: number; unitFont: number;
    value: string;
  };
  radioPill: {
    x: number; y: number; width: number; height: number; radius: number; shadowAlpha: number;
    labelX: number; labelY: number; labelFont: number; label: string;
    bars: Array<{ x: number; y: number; width: number; height: number; active: boolean }>;
  };
  centerX: number;
  centerY: number;
  countdownFont: number;
  resultsFont: number;
}

const HOUR_LABELS: Record<OutrunHour, string> = {
  dawn: "Amanecer",
  noon: "Mediodía",
  afternoon: "Hora dorada",
  twilight: "Crepúsculo",
  night: "Noche"
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Common HUD geometry keeps Canvas and Skia aligned at all viewport sizes. */
export function resolveOutrunHudLayout(input: OutrunHudLayoutInput): OutrunHudLayout {
  const { config, visualPalette } = input;
  const tuning = config.visual.tuning.hud;
  const scale = config.WIDTH / config.visual.tuning.referenceWidthPx;
  const marginX = tuning.horizontalMarginPx * scale;
  const topY = tuning.topMarginPx * scale;
  const labelFont = tuning.timeLabelFontPx * scale;
  const digitsFont = tuning.timeDigitsFontPx * scale;
  const stageLabelFont = tuning.stageLabelFontPx * scale;
  const hourFont = tuning.hourFontPx * scale;
  const progressX = marginX;
  const progressWidth = Math.max(0, config.WIDTH - marginX * 2);
  const timeLabelY = topY + labelFont;
  const timeValueY = timeLabelY + digitsFont + 2 * scale;
  const progressY = timeValueY + 10 * scale;
  const progressFraction = clamp01(input.progressFraction);
  const stages = config.visual.stages;
  const nextStageBoundary = stages.length > 0
    ? Math.min(1, (visualPalette.stageIndex + 1) / stages.length)
    : 1;

  const speed = tuning.speedPill;
  const speedWidth = speed.widthPx * scale;
  const speedHeight = speed.heightPx * scale;
  const speedX = speed.marginPx * scale;
  const speedY = config.HEIGHT - speed.marginPx * scale - speedHeight;

  const radio = tuning.radioPill;
  const radioWidth = radio.widthPx * scale;
  const radioHeight = radio.heightPx * scale;
  const radioX = config.WIDTH - radio.marginPx * scale - radioWidth;
  const radioY = config.HEIGHT - radio.marginPx * scale - radioHeight;
  const radioBaseline = radioY + radioHeight - 7 * scale;
  const widths = [radio.barWidthPx, radio.barWidthPx, radio.barWidthPx, radio.barWidthPx, radio.activeBarWidthPx];
  const heights = [
    radio.barHeightMinPx,
    radio.barHeightMaxPx,
    radio.barHeightMinPx,
    radio.barHeightMaxPx,
    radio.activeBarHeightPx
  ];
  const barsWidth = widths.reduce((sum, width, index) =>
    sum + width * scale + (index === 4 ? 0 : 2 * scale), 0);
  const barsStartX = radioX + radioWidth - 8 * scale - barsWidth;
  const bars = widths.map((barWidth, index) => {
    const x = barsStartX + widths.slice(0, index).reduce((sum, width) => sum + width * scale + 2 * scale, 0);
    const height = heights[index]! * scale;
    return {
      x,
      y: radioBaseline - height,
      width: barWidth * scale,
      height,
      active: index === 4
    };
  });

  return {
    scale,
    time: {
      x: marginX, labelY: timeLabelY, valueY: timeValueY,
      labelFont, valueFont: digitsFont, value: input.timeStr
    },
    stage: {
      x: config.WIDTH - marginX, labelY: timeLabelY, hourY: timeValueY,
      labelFont: stageLabelFont, hourFont,
      label: `Tramo ${visualPalette.stageIndex + 1} de ${stages.length}`,
      hour: HOUR_LABELS[visualPalette.hour]
    },
    progress: {
      x: progressX, y: progressY, width: progressWidth, height: tuning.progressHeightPx * scale,
      trackAlpha: tuning.progressTrackAlpha, filledWidth: progressWidth * progressFraction,
      carMarkerX: progressX + progressWidth * progressFraction,
      branchMarkerX: progressX + progressWidth * nextStageBoundary,
      carMarkerRadius: tuning.carMarkerRadiusPx * scale,
      branchMarkerRadius: tuning.branchMarkerRadiusPx * scale
    },
    speedPill: {
      x: speedX, y: speedY, width: speedWidth, height: speedHeight,
      radius: speed.cornerRadiusPx * scale, shadowAlpha: speed.shadowAlpha,
      digitsX: speedX + 8 * scale, digitsY: speedY + speedHeight * 0.71,
      digitsFont: speed.digitsFontPx * scale,
      unitX: speedX + speedWidth - 8 * scale, unitY: speedY + speedHeight * 0.67,
      unitFont: speed.unitFontPx * scale, value: String(input.speedKmh)
    },
    radioPill: {
      x: radioX, y: radioY, width: radioWidth, height: radioHeight,
      radius: radio.cornerRadiusPx * scale, shadowAlpha: radio.shadowAlpha,
      labelX: radioX + 8 * scale, labelY: radioY + radioHeight * 0.62,
      labelFont: radio.labelFontPx * scale, label: "Radio", bars
    },
    centerX: config.WIDTH / 2,
    centerY: config.HEIGHT / 2,
    countdownFont: 48 * scale,
    resultsFont: 32 * scale
  };
}
