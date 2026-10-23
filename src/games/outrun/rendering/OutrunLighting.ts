import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { RaceStateComponent } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { computeOutrunPlayerArtworkScale } from "./OutrunVisualHelpers";

export interface OutrunHeadlightBeam {
  points: Array<{ x: number; y: number }>;
  color: string;
  alpha: number;
}

/** Pure, night-only headlight cones shared by Canvas and Skia. */
export function computeOutrunHeadlightBeams(
  state: RaceStateComponent,
  config: OutrunConfig,
  visualPalette: OutrunVisualPaletteResource
): OutrunHeadlightBeam[] {
  if (visualPalette.hour !== "night" || config.WIDTH <= 0 || config.HEIGHT <= 0) return [];

  const speedRatio = config.maxSpeed > 0
    ? Math.max(0, Math.min(1, state.speed / config.maxSpeed))
    : 0;
  const scale = computeOutrunPlayerArtworkScale(config) * (1 + speedRatio * 0.08);
  const centerX = config.WIDTH / 2 + state.playerX * 40;
  const baselineY = config.HEIGHT - 80;
  const horizonY = config.HEIGHT * visualPalette.tuning.horizonFraction;
  const farY = horizonY + (config.HEIGHT - horizonY) * 0.18;
  const halfWidth = config.WIDTH * 0.16;
  const innerHalfWidth = config.WIDTH * 0.025;
  const originOffsetX = 23 * scale;
  const originY = baselineY - 26 * scale;
  const points = [
    [
      { x: centerX - originOffsetX, y: originY },
      { x: centerX - halfWidth, y: farY },
      { x: centerX - innerHalfWidth, y: farY }
    ],
    [
      { x: centerX + originOffsetX, y: originY },
      { x: centerX + innerHalfWidth, y: farY },
      { x: centerX + halfWidth, y: farY }
    ]
  ];

  return points.map(beamPoints => ({
    points: beamPoints,
    color: visualPalette.shared.cream,
    alpha: 0.1
  }));
}
