import { World } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";

export interface StarfieldPoint {
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  color: string;
}

export interface StarfieldLayout {
  width: number;
  height: number;
  stars: StarfieldPoint[];
}

export function computeStarfieldLayout<W extends World<any> = World<ShmupComponentRegistry>>(
  world: W
): StarfieldLayout {
  const config = world.getResource<ShmupConfig>("GameConfig");
  const width = config?.WORLD_WIDTH ?? 480;
  const height = config?.WORLD_HEIGHT ?? 854;
  const state = world.getSingleton("ShmupGameState");
  const time = world.tick * 0.016;
  const scroll = state?.scrollDistance ?? (time * (config?.SCROLL_SPEED ?? 80));

  const starCount = config?.STAR_COUNT ?? 80;
  const stars: StarfieldPoint[] = [];

  for (let i = 0; i < starCount; i++) {
    const seedX = (i * 127.1 + 311.7) % 1;
    const seedY = (i * 269.5 + 183.3) % 1;

    const layer = i % 3;
    const speedMult = layer === 0 ? 0.4 : layer === 1 ? 1.0 : 1.8;
    const starSpeed = (config?.STAR_SPEED ?? 35) * speedMult;

    const rawX = seedX * width;
    const rawY = (seedY * height + scroll * (starSpeed / 35)) % height;
    const y = rawY < 0 ? rawY + height : rawY;

    if (layer === 0) {
      stars.push({ x: rawX, y, w: 1, h: 1, layer: 0, color: "rgba(200, 220, 255, 0.35)" });
    } else if (layer === 1) {
      stars.push({ x: rawX, y, w: 1.5, h: 2, layer: 1, color: "rgba(0, 229, 255, 0.65)" });
    } else {
      stars.push({ x: rawX, y, w: 2, h: 4, layer: 2, color: "rgba(255, 255, 255, 0.9)" });
    }
  }

  return { width, height, stars };
}
