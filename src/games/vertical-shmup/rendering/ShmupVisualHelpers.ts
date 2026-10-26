import type { World, RenderComponent, HealthComponent } from "@tiny-aster/core";
import type { ShmupComponentRegistry, ShmupEnemyArchetype, EnemyPathComponent, BulletPatternComponent } from "../types/ShmupTypes";
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
  const sumiE = world.getResource<string>("ShmupVisualTheme") === "sumi-e";
  const primaryColor = sumiE ? SHMUP_SUMI_E_THEME.palette.player : (render.color ?? SHMUP_COLOR_TOKENS.player.primary);
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

function isShmupEnemyArchetype(value: string | undefined): value is ShmupEnemyArchetype {
  return value === "scout"
    || value === "interceptor"
    || value === "armored"
    || value === "support"
    || value === "boss";
}

export interface ShmupEnemyDrawContext {
  render: RenderComponent;
  path?: EnemyPathComponent;
  pattern?: BulletPatternComponent;
  health?: HealthComponent;
  size: number;
  enemyColor: string;
  time: number;
  archetype: ShmupEnemyArchetype;
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
  const enemy = world.getComponent(entity, "ShmupEnemy");
  const size = render.size ?? 32;
  const sumiE = world.getResource<string>("ShmupVisualTheme") === "sumi-e";
  const themeArchetype = enemy?.archetype;
  const enemyColor = sumiE
    ? (themeArchetype === "boss" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_SUMI_E_THEME.palette.ink)
    : (render.color ?? SHMUP_COLOR_TOKENS.enemy.primary);
  const time = world.tick * 0.016;
  // Visual identity is authored by the factory; path and size never infer a silhouette.
  const storedArchetype = enemy?.archetype;
  const archetype = isShmupEnemyArchetype(storedArchetype) ? storedArchetype : "scout";

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
  const sumiE = world.getResource<string>("ShmupVisualTheme") === "sumi-e";
  const isPlayerBullet = world.getComponent(entity, "ShmupPlayerBullet") !== undefined;
  const sourceColor = render.color ?? defaultColor;
  const color = sumiE
    ? (isPlayerBullet ? SHMUP_SUMI_E_THEME.palette.player : SHMUP_SUMI_E_THEME.palette.threat)
    : sourceColor;

  // Classify projectile family before applying theme colors, so the theme does not
  // erase the existing hot/special gameplay visual identity.
  let kind: "warm" | "hot" | "special" | "player" = "warm";
  if (sourceColor === SHMUP_COLOR_TOKENS.bullet.hot) {
    kind = "hot";
  } else if (sourceColor === SHMUP_COLOR_TOKENS.bullet.special) {
    kind = "special";
  } else if (isPlayerBullet || sourceColor === SHMUP_COLOR_TOKENS.player.primary || sourceColor === SHMUP_COLOR_TOKENS.gold.sunlight) {
    kind = "player";
  }

  return { render, size, color, kind };
}


/** Presentation-only theme contract. It is deliberately independent from ECS gameplay rules. */
export type ShmupThemeId = "aerial-fantasy" | "sumi-e";

export type ShmupSemanticColor =
  | "paper" | "ink" | "inkWash" | "mist" | "sun"
  | "threat" | "threatCritical" | "player" | "reward" | "frame";

export interface ShmupThemeContract {
  readonly id: ShmupThemeId;
  readonly version: 1;
  readonly palette: Readonly<Record<ShmupSemanticColor, string>>;
  readonly layers: readonly ["paper", "sun", "mist", "mountains", "structures", "foreground"];
  readonly assets: Readonly<Record<string, { readonly kind: "sprite" | "texture"; readonly path: string; readonly status: "planned" | "available" }>>;
  readonly procedural: Readonly<{
    paperGrain: { readonly enabled: boolean; readonly density: number; readonly opacity: number };
    mountainRidges: { readonly count: number; readonly minOpacity: number; readonly maxOpacity: number };
    waterfallStrokes: { readonly count: number; readonly opacity: number };
    foregroundSilhouettes: { readonly edgeBand: number; readonly maxCenterIntrusion: number };
  }>;
  readonly effects: Readonly<{
    playerTrail: "blue-brush";
    enemyProjectile: "vermilion-petal";
    impact: "ink-splatter";
    reward: "gold-ofuda";
  }>;
}

export const SHMUP_SUMI_E_THEME: ShmupThemeContract = {
  id: "sumi-e",
  version: 1,
  palette: {
    paper: "#E7DFCB",
    ink: "#151515",
    inkWash: "#5F6466",
    mist: "#C9D1D2",
    sun: "#D7473F",
    threat: "#B3261E",
    threatCritical: "#FF3B30",
    player: "#4DA3FF",
    reward: "#E3A92F",
    frame: "#B9A272",
  },
  layers: ["paper", "sun", "mist", "mountains", "structures", "foreground"],
  assets: {
    washiTexture: { kind: "texture", path: "assets/shmup/sumi-e/washi-grain.png", status: "planned" },
    pagoda: { kind: "sprite", path: "assets/shmup/sumi-e/pagoda.png", status: "planned" },
  },
  procedural: {
    paperGrain: { enabled: true, density: 0.00018, opacity: 0.055 },
    mountainRidges: { count: 4, minOpacity: 0.12, maxOpacity: 0.32 },
    waterfallStrokes: { count: 5, opacity: 0.22 },
    foregroundSilhouettes: { edgeBand: 0.22, maxCenterIntrusion: 0.12 },
  },
  effects: {
    playerTrail: "blue-brush",
    enemyProjectile: "vermilion-petal",
    impact: "ink-splatter",
    reward: "gold-ofuda",
  },
};

\nexport type BiomeKind = "archipelago" | "gardens" | "temples" | "storm";

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
  atmosphereStyle: "sunrise" | "garden" | "sacred" | "storm";
  glowColor: string;
  glowX: number;
  glowY: number;
  glowRadius: number;
  cloudOpacity: number;
  islandStyle: "lush" | "ruins" | "crystal";
  rayColor: string;
  lightningColor: string;
  crystalShadowColor: string;
  crystalEdgeColor: string;
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
    atmosphereStyle: "sunrise",
    glowColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    glowX: 0.76,
    glowY: 0.15,
    glowRadius: 0.48,
    cloudOpacity: 0.56,
    islandStyle: "lush",
    rayColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    lightningColor: SHMUP_COLOR_TOKENS.sky.light,
    crystalShadowColor: SHMUP_COLOR_TOKENS.sky.deep,
    crystalEdgeColor: SHMUP_COLOR_TOKENS.sky.light,
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
    atmosphereStyle: "garden",
    glowColor: "#C2FFD8",
    glowX: 0.5,
    glowY: 0.24,
    glowRadius: 0.62,
    cloudOpacity: 0.62,
    islandStyle: "lush",
    rayColor: "#BDF7D8",
    lightningColor: SHMUP_COLOR_TOKENS.sky.light,
    crystalShadowColor: SHMUP_COLOR_TOKENS.foliage.deep,
    crystalEdgeColor: SHMUP_COLOR_TOKENS.foliage.light,
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
    atmosphereStyle: "sacred",
    glowColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    glowX: 0.5,
    glowY: 0.35,
    glowRadius: 0.44,
    cloudOpacity: 0.48,
    islandStyle: "ruins",
    rayColor: SHMUP_COLOR_TOKENS.gold.sunlight,
    lightningColor: SHMUP_COLOR_TOKENS.sky.light,
    crystalShadowColor: SHMUP_COLOR_TOKENS.architecture,
    crystalEdgeColor: SHMUP_COLOR_TOKENS.gold.sunlight,
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
    atmosphereStyle: "storm",
    glowColor: "#5AAEFF",
    glowX: 0.57,
    glowY: 0.18,
    glowRadius: 0.56,
    cloudOpacity: 0.72,
    islandStyle: "crystal",
    rayColor: "#8CCBFF",
    lightningColor: "#8CCBFF",
    crystalShadowColor: "#15283F",
    crystalEdgeColor: "#76CFFF",
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
  cliffColor: string;
  hasArch: boolean;
  hasWaterfall: boolean;
  waterfallX: number;
  waterfallLength: number;
  hasBlossomTree: boolean;
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
      cliffColor: SHMUP_COLOR_TOKENS.architecture,
      hasArch: i % 2 === 0,
      hasWaterfall: i % 3 === 0,
      waterfallX: flank + w * (0.35 + (i % 3) * 0.15),
      waterfallLength: h * (1.8 + (i % 2) * 0.8),
      hasBlossomTree: i % 2 === 1,
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


export interface SumiEMountainRidge {
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly opacity: number;
  readonly width: number;
}

export interface SumiEBackdropData {
  readonly width: number;
  readonly height: number;
  readonly time: number;
  readonly scroll: number;
  readonly palette: ShmupThemeContract["palette"];
  readonly ridges: readonly SumiEMountainRidge[];
  readonly paperFibers: readonly { readonly x: number; readonly y: number; readonly length: number; readonly alpha: number }[];
}

/** Stable, presentation-only geometry: same world tick and viewport always produce the same backdrop. */
export function computeSumiEBackdrop(world: World<ShmupComponentRegistry>): SumiEBackdropData {
  const config = world.getResource<ShmupConfig>("GameConfig");
  const width = config?.WORLD_WIDTH ?? 720;
  const height = config?.WORLD_HEIGHT ?? 1280;
  const state = world.getSingleton("ShmupGameState");
  const time = world.tick * 0.016;
  const scroll = state?.scrollDistance ?? time * (config?.SCROLL_SPEED ?? 80);
  const palette = SHMUP_SUMI_E_THEME.palette;

  const ridges: SumiEMountainRidge[] = [];
  const ridgeCount = SHMUP_SUMI_E_THEME.procedural.mountainRidges.count;
  for (let ridge = 0; ridge < ridgeCount; ridge += 1) {
    const points: { x: number; y: number }[] = [];
    const segments = 8;
    const baseY = height * (0.2 + ridge * 0.115);
    const amplitude = height * (0.025 + ridge * 0.009);
    for (let point = 0; point <= segments; point += 1) {
      const x = width * point / segments;
      const wave = Math.sin(point * 1.73 + ridge * 2.4) * 0.62
        + Math.sin(point * 0.71 + ridge * 1.9) * 0.38;
      const y = baseY + wave * amplitude + ((scroll * (0.035 + ridge * 0.045)) % (height * 0.035));
      points.push({ x, y });
    }
    ridges.push({
      points,
      opacity: SHMUP_SUMI_E_THEME.procedural.mountainRidges.maxOpacity
        - ridge * ((SHMUP_SUMI_E_THEME.procedural.mountainRidges.maxOpacity
        - SHMUP_SUMI_E_THEME.procedural.mountainRidges.minOpacity) / Math.max(1, ridgeCount - 1)),
      width: 1.5 + ridge * 1.1,
    });
  }

  const paperFibers: { x: number; y: number; length: number; alpha: number }[] = [];
  const fiberCount = Math.round(width * height * SHMUP_SUMI_E_THEME.procedural.paperGrain.density);
  for (let index = 0; index < fiberCount; index += 1) {
    // Integer hash, not Math.random: decorative detail cannot perturb gameplay RNG.
    const hash = (index * 1664525 + 1013904223) >>> 0;
    const hash2 = (hash * 22695477 + 1) >>> 0;
    paperFibers.push({
      x: (hash % 100000) / 100000 * width,
      y: (hash2 % 100000) / 100000 * height,
      length: 2 + (hash % 7),
      alpha: SHMUP_SUMI_E_THEME.procedural.paperGrain.opacity * (0.35 + (hash2 % 100) / 150),
    });
  }

  return { width, height, time, scroll, palette, ridges, paperFibers };
}
