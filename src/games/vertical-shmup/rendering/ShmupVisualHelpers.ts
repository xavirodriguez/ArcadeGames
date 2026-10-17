import type { World, RenderComponent, HealthComponent } from "@tiny-aster/core";
import type { ShmupComponentRegistry, EnemyPathComponent } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import { colors } from "../../../theme/colors";

export interface ShmupPlayerDrawContext {
  render: RenderComponent;
  health?: HealthComponent;
  invulnerable: boolean;
  time: number;
  shouldBlink: boolean;
  size: number;
  primaryColor: string;
}

export function resolveShmupPlayerDrawContext(
  world: World<ShmupComponentRegistry>,
  entity: number
): ShmupPlayerDrawContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const health = world.getComponent(entity, "Health");
  const invulnerable = (health?.invulnerableRemaining ?? 0) > 0;
  const time = world.tick * 0.016;
  const shouldBlink = invulnerable && Math.floor(time * 20) % 2 === 0;
  const size = render.size ?? 22;
  const primaryColor = render.color ?? colors.cyan;

  return {
    render,
    health,
    invulnerable,
    time,
    shouldBlink,
    size,
    primaryColor,
  };
}

export interface ShmupEnemyDrawContext {
  render: RenderComponent;
  path?: EnemyPathComponent;
  size: number;
  enemyColor: string;
  time: number;
}

export function resolveShmupEnemyDrawContext(
  world: World<ShmupComponentRegistry>,
  entity: number
): ShmupEnemyDrawContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const path = world.getComponent(entity, "EnemyPath");
  const size = render.size ?? 24;
  const enemyColor = render.color ?? colors.enemy;
  const time = world.tick * 0.016;

  return { render, path, size, enemyColor, time };
}

export interface ShmupBulletDrawContext {
  render: RenderComponent;
  size: number;
  color: string;
}

export function resolveShmupBulletDrawContext(
  world: World<ShmupComponentRegistry>,
  entity: number,
  defaultSize: number,
  defaultColor: string
): ShmupBulletDrawContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const size = render.size ?? defaultSize;
  const color = render.color ?? defaultColor;
  return { render, size, color };
}

export interface ShmupStarData {
  rawX: number;
  y: number;
  layer: number;
  color: string;
  w: number;
  h: number;
}

export interface ShmupStarfieldParams {
  width: number;
  height: number;
  starCount: number;
  stars: ShmupStarData[];
}

export function computeShmupStarfield(
  world: World<ShmupComponentRegistry>
): ShmupStarfieldParams {
  const config = world.getResource<ShmupConfig>("GameConfig");
  const width = config?.WORLD_WIDTH ?? 480;
  const height = config?.WORLD_HEIGHT ?? 854;
  const state = world.getSingleton("ShmupGameState");
  const time = world.tick * 0.016;
  const scroll = state?.scrollDistance ?? time * (config?.SCROLL_SPEED ?? 80);
  const starCount = config?.STAR_COUNT ?? 80;

  const stars: ShmupStarData[] = [];

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
      stars.push({ rawX, y, layer, color: colors.slate, w: 1, h: 1 });
    } else if (layer === 1) {
      stars.push({ rawX, y, layer, color: colors.cyan, w: 1.5, h: 2 });
    } else {
      stars.push({ rawX, y, layer, color: colors.white, w: 2, h: 4 });
    }
  }

  return { width, height, starCount, stars };
}
