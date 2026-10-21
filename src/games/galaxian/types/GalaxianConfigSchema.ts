import { z } from "zod";

export const GalaxianFormationRowSchema = z.object({
  type: z.enum(["flagship", "escort", "emissary", "drone"]),
  row: z.number().int().min(0),
  count: z.number().int().positive(),
  pointsFormation: z.number().nonnegative(),
  pointsDive: z.number().nonnegative(),
  bonusEscorted: z.number().nonnegative().default(0),
});

export const GalaxianPathWaypointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const GalaxianDivePathSchema = z.object({
  id: z.string(),
  waypoints: z.array(GalaxianPathWaypointSchema),
  speed: z.number().positive(),
});

export const GalaxianPaletteSchema = z.object({
  paperNight: z.string(),
  strataFar: z.string(),
  strataMid: z.string(),
  strataNear: z.string(),
  strataShadow: z.string(),
  strataEdge: z.string(),
  star: z.string(),
  droneLight: z.string(),
  droneMid: z.string(),
  droneDark: z.string(),
  emissaryLight: z.string(),
  emissaryMid: z.string(),
  emissaryDark: z.string(),
  escortLight: z.string(),
  escortMid: z.string(),
  escortDark: z.string(),
  flagshipLight: z.string(),
  flagshipMid: z.string(),
  flagshipDark: z.string(),
  eye: z.string(),
  player: z.string(),
  playerShade: z.string(),
  playerFold: z.string(),
  playerAccent: z.string(),
  enemyFire: z.string(),
  enemyFireCore: z.string(),
  trail: z.string(),
  hudText: z.string(),
  hudMuted: z.string(),
});

export const GalaxianVisualSchema = z.object({
  quality: z.enum(["high", "low"]).default("high"),
  trailLength: z.number().int().positive().default(24),
  colorblindMode: z.boolean().default(false),
  palette: GalaxianPaletteSchema,
  paletteColorblind: GalaxianPaletteSchema,
});

export const GalaxianConfigSchema = z.object({
  worldWidth: z.number().positive().default(480),
  worldHeight: z.number().positive().default(640),
  KEYS: z.object({
    LEFT: z.string().default("ArrowLeft"),
    RIGHT: z.string().default("ArrowRight"),
    SHOOT: z.string().default("Space"),
    PAUSE: z.string().default("KeyP"),
    RESTART: z.string().default("KeyR"),
  }),
  PLAYER_SPEED: z.number().positive().default(220),
  PLAYER_INITIAL_LIVES: z.number().int().positive().default(3),
  PLAYER_RENDER_WIDTH: z.number().positive().default(32),
  PLAYER_COLLIDER_RADIUS: z.number().positive().default(12),
  PLAYER_BULLET_SPEED: z.number().positive().default(520),
  PLAYER_BULLET_SIZE: z.number().positive().default(4),
  SINGLE_BULLET_MODE: z.boolean().default(true),
  SHOOT_COOLDOWN_MS: z.number().nonnegative().default(200),
  INVULNERABILITY_DURATION_MS: z.number().nonnegative().default(2000),
  ENEMY_BULLET_SPEED: z.number().positive().default(240),
  ENEMY_BULLET_SIZE: z.number().positive().default(6),
  formation: z.object({
    startX: z.number().default(240),
    startY: z.number().default(100),
    slotSpacingX: z.number().positive().default(32),
    slotSpacingY: z.number().positive().default(28),
    oscillationAmplitude: z.number().nonnegative().default(60),
    oscillationFrequency: z.number().positive().default(0.35),
    grid: z.array(GalaxianFormationRowSchema),
  }),
  dive: z.object({
    windupMs: z.number().nonnegative().default(350),
    intervalMs: z.number().positive().default(2200),
    maxConcurrentDives: z.number().int().positive().default(3),
    escortGroupChance: z.number().min(0).max(1).default(0.3),
    enemyShootChance: z.number().min(0).max(1).default(0.6),
    enemyShootMaxPerDive: z.number().int().nonnegative().default(2),
    paths: z.array(GalaxianDivePathSchema),
  }),
  wave: z.object({
    speedMultiplierPerWave: z.number().positive().default(1.08),
    diveIntervalMultiplierPerWave: z.number().positive().default(0.92),
    maxConcurrentDivesCap: z.number().int().positive().default(6),
  }),
  visual: GalaxianVisualSchema,
});

export type GalaxianConfig = z.infer<typeof GalaxianConfigSchema>;
