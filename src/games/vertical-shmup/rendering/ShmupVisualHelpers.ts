import type { World, RenderComponent, HealthComponent } from "@tiny-aster/core";
import type { ShmupComponentRegistry, EnemyPathComponent, BulletPatternComponent } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import { SHMUP_COLOR_TOKENS } from "./ShmupColorTokens";

export interface ShmupPlayerDrawContext {
  render: RenderComponent;
  health?: HealthComponent;
  invulnerable: boolean;
  time: number;
  shouldBlink: boolean;
  size: number;
  primaryColor: string;
  moveX: number;
  moveY: number;
  isShooting: boolean;
}

export function resolveShmupPlayerDrawContext(
  world: World<ShmupComponentRegistry>,
  entity: number
): ShmupPlayerDrawContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const health = world.getComponent(entity, "Health");
  const input = world.getComponent(entity, "Input");
  const invulnerable = (health?.invulnerableRemaining ?? 0) > 0;
  const time = world.tick * 0.016;
  const shouldBlink = invulnerable && Math.floor(time * 18) % 2 === 0;
  const size = render.size ?? 36;
  const primaryColor = render.color ?? SHMUP_COLOR_TOKENS.player.primary;
  const moveX = input?.axes?.moveX ?? 0;
  const moveY = input?.axes?.moveY ?? 0;
  const isShooting = (input?.actions?.includes("shoot") ?? false) || (input?.shootCooldownRemaining ?? 0) > 0;

  return {
    render,
    health,
    invulnerable,
    time,
    shouldBlink,
    size,
    primaryColor,
    moveX,
    moveY,
    isShooting,
  };
}

export interface ShmupEnemyDrawContext {
  render: RenderComponent;
  path?: EnemyPathComponent;
  pattern?: BulletPatternComponent;
  health?: HealthComponent;
  size: number;
  enemyColor: string;
  time: number;
  archetype: "scout" | "interceptor" | "armored" | "support" | "boss";
  isTelegraphing: boolean;
}

export function resolveShmupEnemyDrawContext(
  world: World<ShmupComponentRegistry>,
  entity: number
): ShmupEnemyDrawContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const path = world.getComponent(entity, "EnemyPath");
  const pattern = world.getComponent(entity, "BulletPattern");
  const health = world.getComponent(entity, "Health");
  const size = render.size ?? 32;
  const enemyColor = render.color ?? SHMUP_COLOR_TOKENS.enemy.primary;
  const time = world.tick * 0.016;

  // Determine silhouette archetype based on path or size
  let archetype: "scout" | "interceptor" | "armored" | "support" | "boss" = "scout";
  if (size >= 80) {
    archetype = "boss";
  } else if (path?.kind === "sine") {
    archetype = "interceptor";
  } else if (path?.kind === "arc") {
    archetype = "support";
  } else if (size >= 40) {
    archetype = "armored";
  }

  const isTelegraphing = pattern ? pattern.cooldownRemaining <= 0.4 : false;

  return { render, path, pattern, health, size, enemyColor, time, archetype, isTelegraphing };
}

export interface ShmupBulletDrawContext {
  render: RenderComponent;
  size: number;
  color: string;
  kind: "warm" | "hot" | "special" | "player";
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

  let kind: "warm" | "hot" | "special" | "player" = "warm";
  if (color === SHMUP_COLOR_TOKENS.bullet.hot) {
    kind = "hot";
  } else if (color === SHMUP_COLOR_TOKENS.bullet.special) {
    kind = "special";
  } else if (color === SHMUP_COLOR_TOKENS.player.primary || color === SHMUP_COLOR_TOKENS.gold.sunlight) {
    kind = "player";
  }

  return { render, size, color, kind };
}

export type BiomeKind = "archipelago" | "gardens" | "temples" | "storm";

export interface BiomeProfile {
  id: BiomeKind;
  name: string;
  skyTop: string;
  skyMid: string;
  skyLight: string;
  cloudLight: string;
  cloudShadow: string;
  islandColor: string;
  architectureColor: string;
  particleColor: string;
  particleType: "petal" | "pollen" | "rune" | "crystal";
}

export const BIOMES: Record<BiomeKind, BiomeProfile> = {
  archipelago: {
    id: "archipelago",
    name: "Archipiélago de las Nubes",
    skyTop: SHMUP_COLOR_TOKENS.sky.deep,
    skyMid: SHMUP_COLOR_TOKENS.sky.mid,
    skyLight: SHMUP_COLOR_TOKENS.sky.light,
    cloudLight: SHMUP_COLOR_TOKENS.cloud.light,
    cloudShadow: SHMUP_COLOR_TOKENS.cloud.shadow,
    islandColor: SHMUP_COLOR_TOKENS.foliage.mid,
    architectureColor: SHMUP_COLOR_TOKENS.architecture,
    particleColor: SHMUP_COLOR_TOKENS.blossom,
    particleType: "petal",
  },
  gardens: {
    id: "gardens",
    name: "Jardines Celestes",
    skyTop: "#1A3C40",
    skyMid: SHMUP_COLOR_TOKENS.foliage.deep,
    skyLight: SHMUP_COLOR_TOKENS.foliage.light,
    cloudLight: SHMUP_COLOR_TOKENS.cloud.light,
    cloudShadow: "#4A7A77",
    islandColor: SHMUP_COLOR_TOKENS.foliage.light,
    architectureColor: SHMUP_COLOR_TOKENS.architecture,
    particleColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    particleType: "pollen",
  },
  temples: {
    id: "temples",
    name: "Templos sobre el Vacío",
    skyTop: SHMUP_COLOR_TOKENS.sky.deep,
    skyMid: "#253A68",
    skyLight: SHMUP_COLOR_TOKENS.sky.mid,
    cloudLight: SHMUP_COLOR_TOKENS.cloud.shadow,
    cloudShadow: SHMUP_COLOR_TOKENS.architecture,
    islandColor: SHMUP_COLOR_TOKENS.architecture,
    architectureColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    particleColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    particleType: "rune",
  },
  storm: {
    id: "storm",
    name: "Tormenta de Cristal",
    skyTop: "#0B1528",
    skyMid: "#192B4F",
    skyLight: "#4B6B94",
    cloudLight: "#6981A6",
    cloudShadow: "#2D3D58",
    islandColor: "#1A2E40",
    architectureColor: "#3B5270",
    particleColor: SHMUP_COLOR_TOKENS.player.primary,
    particleType: "crystal",
  },
};

export interface ShmupCloudData {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
}

export interface ShmupIslandData {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hasArch: boolean;
}

export interface ShmupParticleData {
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
  type: "petal" | "pollen" | "rune" | "crystal";
}

export interface ShmupParallaxWorldData {
  width: number;
  height: number;
  scroll: number;
  time: number;
  wave: number;
  biome: BiomeProfile;
  clouds: ShmupCloudData[];
  islands: ShmupIslandData[];
  particles: ShmupParticleData[];
}

export function computeShmupParallaxWorld(
  world: World<ShmupComponentRegistry>
): ShmupParallaxWorldData {
  const config = world.getResource<ShmupConfig>("GameConfig");
  const width = config?.WORLD_WIDTH ?? 720;
  const height = config?.WORLD_HEIGHT ?? 1280;
  const state = world.getSingleton("ShmupGameState");
  const time = world.tick * 0.016;
  const scroll = state?.scrollDistance ?? time * (config?.SCROLL_SPEED ?? 100);
  const wave = state?.wave ?? 1;

  // Select biome based on wave
  const biomeKinds: BiomeKind[] = ["archipelago", "gardens", "temples", "storm"];
  const currentBiomeKey = biomeKinds[(wave - 1) % biomeKinds.length] ?? "archipelago";
  const biome = BIOMES[currentBiomeKey];

  // Layer 2: Volumetric Drifting Clouds (12 instances)
  const clouds: ShmupCloudData[] = [];
  const cloudCount = 12;
  for (let i = 0; i < cloudCount; i++) {
    const seedX = (i * 173.3 + 43.1) % 1;
    const seedY = (i * 311.9 + 119.7) % 1;
    const speedMult = 0.35 + (i % 3) * 0.15;
    const rawY = (seedY * height + scroll * speedMult) % (height + 200) - 100;
    const driftX = Math.sin(time * 0.5 + i) * 25;
    const x = (seedX * width + driftX + width) % width;
    const rx = 45 + (i % 4) * 20;
    const ry = 25 + (i % 3) * 12;
    const color = i % 2 === 0 ? biome.cloudLight : biome.cloudShadow;

    clouds.push({ x, y: rawY, rx, ry, color });
  }

  // Layer 3: Floating Islands & Ruins (6 instances)
  const islands: ShmupIslandData[] = [];
  const islandCount = 6;
  for (let i = 0; i < islandCount; i++) {
    const seedX = (i * 223.1 + 89.3) % 1;
    const seedY = (i * 401.7 + 233.1) % 1;
    const speedMult = 0.65;
    const rawY = (seedY * height + scroll * speedMult) % (height + 300) - 150;
    // Keep islands mostly on left and right flanks to keep center clear
    const flank = i % 2 === 0 ? seedX * (width * 0.3) : width * 0.7 + seedX * (width * 0.3);
    const w = 90 + (i % 3) * 35;
    const h = 50 + (i % 2) * 20;

    islands.push({
      x: flank,
      y: rawY,
      width: w,
      height: h,
      color: biome.islandColor,
      hasArch: i % 2 === 0,
    });
  }

  // Layer 4: Near Decor Particles (strict limit of 15 particles)
  const particles: ShmupParticleData[] = [];
  const particleCap = 15;
  for (let i = 0; i < particleCap; i++) {
    const seedX = (i * 137.5 + 17.2) % 1;
    const seedY = (i * 283.1 + 71.9) % 1;
    const speedMult = 1.1 + (i % 3) * 0.2;
    const rawY = (seedY * height + scroll * speedMult) % height;
    const floatX = Math.sin(time * 1.5 + i) * 35;
    const x = (seedX * width + floatX + width) % width;
    const opacity = 0.35 + 0.35 * Math.sin(time * 2 + i);

    particles.push({
      x,
      y: rawY,
      size: 4 + (i % 3) * 3,
      rotation: time * 2 + i,
      opacity,
      color: biome.particleColor,
      type: biome.particleType,
    });
  }

  return { width, height, scroll, time, wave, biome, clouds, islands, particles };
}
