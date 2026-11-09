import { World, Entity } from "@tiny-aster/core";
import {
  GalaxianComponentRegistry,
  GalaxianEnemyComponent,
  VisualPoseComponent,
  DiveTrailComponent,
} from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";

export type GalaxianWorld = World<GalaxianComponentRegistry>;

export interface GalaxianPalette {
  paperNight: string;
  strataFar: string;
  strataMid: string;
  strataNear: string;
  strataEdge: string;
  strataShadow: string;
  star: string;
  player: string;
  playerFold: string;
  playerShade: string;
  playerAccent: string;
  flagshipLight: string;
  flagshipMid: string;
  flagshipDark: string;
  escortLight: string;
  escortMid: string;
  escortDark: string;
  emissaryLight: string;
  emissaryMid: string;
  emissaryDark: string;
  droneLight: string;
  droneMid: string;
  droneDark: string;
  eye: string;
  enemyFire: string;
  enemyFireCore: string;
  trail: string;
  hudText: string;
  hudMuted: string;
}

export function getGalaxianPalette(world: GalaxianWorld): GalaxianPalette | undefined {
  const config = world.getResource<GalaxianConfig>("GameConfig");
  return config?.visual.colorblindMode
    ? config.visual.paletteColorblind
    : config?.visual.palette;
}

export interface PaperSkyStar {
  x: number;
  y: number;
  isDiamond: boolean;
}

export interface PaperSkyLayer {
  color: string;
  edge: string;
  speed: number;
  scaleY: number;
  offsetY: number;
  cy: number;
}

export interface PaperSkyVisualContext {
  w: number;
  h: number;
  palette: GalaxianPalette;
  stars: PaperSkyStar[];
  layers: PaperSkyLayer[];
}

export function resolvePaperSkyVisualContext(world: GalaxianWorld): PaperSkyVisualContext | null {
  const palette = getGalaxianPalette(world);
  if (!palette) return null;

  const config = world.getResource<GalaxianConfig>("GameConfig");
  const w = config?.worldWidth ?? 480;
  const h = config?.worldHeight ?? 640;
  const time = world.tick * (1 / 60);

  const isLowQuality = config?.visual.quality === "low";
  const starCount = isLowQuality ? 25 : 55;
  const stars: PaperSkyStar[] = [];

  for (let i = 0; i < starCount; i++) {
    const speed = 15 + (i % 3) * 20;
    const sx = (i * 73 + (i % 5) * 17) % w;
    const sy = (i * 41 + time * speed) % h;
    stars.push({
      x: sx,
      y: sy,
      isDiamond: i % 4 === 0,
    });
  }

  const layerDefs = isLowQuality
    ? [{ color: palette.strataMid, edge: palette.strataEdge, speed: 8, scaleY: 0.35, offsetY: 120 }]
    : [
        { color: palette.strataFar, edge: palette.strataEdge, speed: 5, scaleY: 0.25, offsetY: 80 },
        { color: palette.strataMid, edge: palette.strataEdge, speed: 10, scaleY: 0.35, offsetY: 220 },
        { color: palette.strataNear, edge: palette.strataEdge, speed: 18, scaleY: 0.45, offsetY: 400 },
      ];

  const layers: PaperSkyLayer[] = layerDefs.map((layer) => {
    const scrollY = (time * layer.speed) % (h * 1.5);
    const cy = (layer.offsetY + scrollY) % (h * 1.5) - h * 0.25;
    return {
      ...layer,
      cy,
    };
  });

  return {
    w,
    h,
    palette,
    stars,
    layers,
  };
}

export interface OrigamiBirdColors {
  light: string;
  mid: string;
  dark: string;
}

export function resolveOrigamiBirdColors(
  enemyType: "flagship" | "escort" | "emissary" | "drone",
  palette: GalaxianPalette,
  isDamaged: boolean = false
): OrigamiBirdColors {
  if (enemyType === "emissary") {
    return {
      light: palette.emissaryLight,
      mid: palette.emissaryMid,
      dark: palette.emissaryDark,
    };
  }
  if (enemyType === "escort") {
    return {
      light: palette.escortLight,
      mid: palette.escortMid,
      dark: palette.escortDark,
    };
  }
  if (enemyType === "flagship") {
    return {
      light: isDamaged ? palette.escortLight : palette.flagshipLight,
      mid: isDamaged ? palette.escortMid : palette.flagshipMid,
      dark: isDamaged ? palette.escortDark : palette.flagshipDark,
    };
  }
  return {
    light: palette.droneLight,
    mid: palette.droneMid,
    dark: palette.droneDark,
  };
}

export interface GalaxianEnemyVisualContext {
  palette: GalaxianPalette;
  enemy: GalaxianEnemyComponent;
  deltaRotation: number;
  scaleX: number;
  scaleY: number;
  baseScale: number;
  isDamaged: boolean;
  colors: OrigamiBirdColors;
  trailPoints: Array<{ x: number; y: number }> | null;
  showWindupReticle: boolean;
}

export function resolveGalaxianEnemyVisualContext(
  world: GalaxianWorld,
  entity: Entity
): GalaxianEnemyVisualContext | null {
  const enemy = world.getComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
  const palette = getGalaxianPalette(world);
  if (!enemy || !palette) return null;

  const transform = world.getComponent(entity, "Transform");
  const pose = world.getComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
  const trail = world.getComponent(entity, "DiveTrail") as DiveTrailComponent | undefined;

  let trailPoints: Array<{ x: number; y: number }> | null = null;
  if (trail && trail.history.length > 1 && (enemy.state === "diving" || enemy.state === "windup") && transform) {
    trailPoints = trail.history.map((pt) => ({
      x: pt.x - transform.x,
      y: pt.y - transform.y,
    }));
  }

  const showWindupReticle = enemy.state === "windup";
  const deltaRotation = pose && transform ? pose.rotation - transform.rotation : 0;
  const scaleX = pose ? pose.scaleX : 1.0;
  const scaleY = pose ? pose.scaleY : 1.0;

  const baseScale = enemy.enemyType === "flagship" ? 1.25 : 1.0;
  const isDamaged = enemy.enemyType === "flagship" && enemy.hitsRemaining === 1;
  const colors = resolveOrigamiBirdColors(enemy.enemyType, palette, isDamaged);

  return {
    palette,
    enemy,
    deltaRotation,
    scaleX,
    scaleY,
    baseScale,
    isDamaged,
    colors,
    trailPoints,
    showWindupReticle,
  };
}
