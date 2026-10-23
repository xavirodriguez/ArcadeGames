import type { RoadSegmentSprite } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { lerpColor } from "../utils/palette";

export type OutrunRoadsideKind =
  | "tree"
  | "pine"
  | "rock"
  | "palm"
  | "lighthouse"
  | "cactus"
  | "dry_shrub"
  | "wind_tower";

export interface OutrunRoadsideArtworkStyle {
  kind: OutrunRoadsideKind;
  height: number;
  width: number;
  trunkColor: string;
  foliageColor: string;
  foliageLightColor: string;
  rockBaseColor: string;
  rockShadeColor: string;
  creamColor: string;
  darkAccentColor: string;
  lightColor: string;
  highlightAlpha: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function resolveOutrunRoadsideKind(kind: string): OutrunRoadsideKind {
  switch (kind) {
    case "tree":
    case "pine":
    case "rock":
    case "palm":
    case "lighthouse":
    case "cactus":
    case "dry_shrub":
    case "wind_tower":
      return kind;
    case "cypress":
      return "pine";
    case "wall":
      return "rock";
    case "lamp":
      return "lighthouse";
    case "shrub":
      return "dry_shrub";
    default:
      return "dry_shrub";
  }
}

/** Resolve object scale and palette once so Canvas and Skia share identical inputs. */
export function resolveOutrunRoadsideArtworkStyle(
  sprite: RoadSegmentSprite,
  visualPalette: OutrunVisualPaletteResource,
  depth: number,
  roadHalfWidth: number,
  lightsOn: boolean
): OutrunRoadsideArtworkStyle {
  const { tokens, shared, tuning } = visualPalette;
  const kind = resolveOutrunRoadsideKind(sprite.kind);
  const heightFactor: Record<OutrunRoadsideKind, number> = {
    tree: tuning.tree.heightToRoadHalfWidth,
    pine: 0.66,
    rock: 0.32,
    palm: 0.82,
    lighthouse: 0.78,
    cactus: 0.5,
    dry_shrub: 0.24,
    wind_tower: 0.88
  };
  const height = Math.max(2, roadHalfWidth * heightFactor[kind]);
  const haze = clamp01(depth) * tuning.decor.distantObjectHazeMix;
  const color = (base: string): string => lerpColor(base, tokens.horizon, haze);

  return {
    kind,
    height,
    width: height * (kind === "rock" ? 1.05 : kind === "lighthouse" ? 0.4 : 0.72),
    trunkColor: color(kind === "palm" ? "#6E5946" : tuning.tree.trunkColor),
    foliageColor: color(tokens.foliage),
    foliageLightColor: color(tokens.foliageLight),
    rockBaseColor: color(tokens.mtnNear),
    rockShadeColor: color(tokens.mtnMid),
    creamColor: color(shared.cream),
    darkAccentColor: color(tokens.kerbB),
    lightColor: color(lightsOn ? tokens.sun : shared.cream),
    highlightAlpha: tuning.tree.highlightAlpha
  };
}

/** Low quality halves natural roadside detail while retaining navigation signs. */
export function shouldDrawOutrunRoadsideSprite(
  kind: string,
  segmentIndex: number,
  quality: OutrunVisualPaletteResource["quality"]
): boolean {
  if (quality === "high") return true;
  if (kind === "arch" || kind === "banner" || kind === "billboard" || kind === "chevron") {
    return true;
  }
  const objectGroupIndex = Math.max(0, Math.floor(segmentIndex / 4) - 1);
  return objectGroupIndex % 2 === 0;
}
