import { World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";

export interface CreepVisualState {
  size: number;
  slowed: boolean;
  fill: string;
  stroke: string;
  innerStroke?: string;
}

export function resolveCreepVisualState(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  defaultSize: number,
  type: "grunt" | "fast" | "tank" | "boss"
): CreepVisualState {
  const render = world.getComponent(entity, "Render");
  const creep = world.getComponent(entity, "Creep");
  const size = render?.size ?? defaultSize;
  const slowed = (creep?.slowRemainingMs ?? 0) > 0;

  if (type === "grunt") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#ff7043", "creep_grunt", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#e0f7fa", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#ffab91", "creep_grunt_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "fast") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#29b6f6", "creep_fast", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#e0f7fa", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#81d4fa", "creep_fast_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "tank") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#8d6e63", "creep_tank", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#e0f7fa", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#bcaaa4", "creep_tank_stroke");
    return { size, slowed, fill, stroke };
  }

  // Boss
  const fill = slowed
    ? resolveThemeColorWithFallback(world, "#4dd0e1", "creep_slowed")
    : resolveThemeColorWithFallback(world, "#c62828", "creep_boss", "boss");
  const stroke = slowed
    ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, "#e53935", "creep_boss_stroke");
  const innerStroke = slowed
    ? resolveThemeColorWithFallback(world, "#e0f7fa", "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, "#ef9a9a", "creep_boss_inner_stroke");

  return { size, slowed, fill, stroke, innerStroke };
}
