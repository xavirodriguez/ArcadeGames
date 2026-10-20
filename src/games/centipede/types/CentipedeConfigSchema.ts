import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";
import { ScreenDimensionsSchema, StandardControlKeysSchema } from "@tiny-aster/gameplay-kit";

export const DEFAULT_PALETTE = {
  soil: "#0A0F1C",
  playerZone: "#0F182B",
  hairline: "#1F2D47",
  mushroomA: "#2DD4BF",
  mushroomB: "#8B7CF6",
  stem: "#1E2A3C",
  lobeOff: "#15283A",
  centipedeHead: "#FF4D5E",
  centipedeBody: "#FF8A5B",
  centipedeShine: "rgba(255, 201, 168, 0.6)",
  centipedeLegs: "#FFB38A",
  amber: "#FFC24B",
  toxin: "#FF5FA2",
  player: "#E6FBFF",
  playerAccent: "#7CF3FF",
  hudText: "#E8F1F2",
  hudMuted: "#6F819E",
};

export const DEFAULT_PALETTE_COLORBLIND = {
  soil: "#05070E",
  playerZone: "#0B1120",
  hairline: "#2A3B5C",
  mushroomA: "#418078",
  mushroomB: "#5B4A9E",
  stem: "#1A2433",
  lobeOff: "#0D1A26",
  centipedeHead: "#FFF0F0",
  centipedeBody: "#FFE8D6",
  centipedeShine: "rgba(255, 255, 255, 0.8)",
  centipedeLegs: "#FFD0B0",
  amber: "#FFF5C0",
  toxin: "#FFB0D0",
  player: "#FFFFFF",
  playerAccent: "#A0F5FF",
  hudText: "#FFFFFF",
  hudMuted: "#92A5C0",
};

export const CentipedePaletteSchema = z.object({
  soil: z.string().default("#0A0F1C"),
  playerZone: z.string().default("#0F182B"),
  hairline: z.string().default("#1F2D47"),
  mushroomA: z.string().default("#2DD4BF"),
  mushroomB: z.string().default("#8B7CF6"),
  stem: z.string().default("#1E2A3C"),
  lobeOff: z.string().default("#15283A"),
  centipedeHead: z.string().default("#FF4D5E"),
  centipedeBody: z.string().default("#FF8A5B"),
  centipedeShine: z.string().default("rgba(255, 201, 168, 0.6)"),
  centipedeLegs: z.string().default("#FFB38A"),
  amber: z.string().default("#FFC24B"),
  toxin: z.string().default("#FF5FA2"),
  player: z.string().default("#E6FBFF"),
  playerAccent: z.string().default("#7CF3FF"),
  hudText: z.string().default("#E8F1F2"),
  hudMuted: z.string().default("#6F819E"),
});

export type CentipedePalette = z.infer<typeof CentipedePaletteSchema>;

export const CentipedeVisualConfigSchema = z.object({
  quality: z.enum(["high", "low"]).default("high"),
  colorblindMode: z.boolean().default(false),
  springStiffness: z.number().default(180),
  springDamping: z.number().default(16),
  segmentRadiusHead: z.number().default(0.55),
  segmentRadiusTail: z.number().default(0.30),
  times: z.object({
    popMs: z.number().default(120),
    flashMs: z.number().default(120),
    disintegrateMs: z.number().default(280),
    sproutMs: z.number().default(300),
    poisonPulsePeriodMs: z.number().default(1200),
  }).default({
    popMs: 120,
    flashMs: 120,
    disintegrateMs: 280,
    sproutMs: 300,
    poisonPulsePeriodMs: 1200,
  }),
  palette: CentipedePaletteSchema.default(DEFAULT_PALETTE),
  paletteColorblind: CentipedePaletteSchema.default(DEFAULT_PALETTE_COLORBLIND),
});

export const CentipedeConfigSchema = BaseConfigSchema.extend({
  ...ScreenDimensionsSchema.shape,
  ...StandardControlKeysSchema.shape,

  GRID_COLS: z.number().int().default(30),
  GRID_ROWS: z.number().int().default(32),
  CELL_SIZE: z.number().default(10),
  PLAYER_ZONE_ROWS: z.number().int().default(5),

  PLAYER_SPEED: z.number().default(180),
  PLAYER_INITIAL_LIVES: z.number().int().min(1).default(3),

  DART_SPEED: z.number().default(500),
  DART_COOLDOWN_MS: z.number().default(120),
  MAX_ACTIVE_DARTS: z.number().int().min(1).default(1),

  MUSHROOM_HP: z.number().int().min(1).default(4),
  INITIAL_MUSHROOM_COUNT: z.number().int().min(0).default(30),

  CENTIPEDE_INITIAL_LENGTH: z.number().int().min(1).default(12),
  HEAD_SPEED: z.number().default(14),
  BODY_SPEED: z.number().default(10),

  SPIDER_SPAWN_INTERVAL_MS: z.number().default(8000),
  SPIDER_SPEED: z.number().default(120),
  SPIDER_SCORE_FAR: z.number().default(300),
  SPIDER_SCORE_MID: z.number().default(600),
  SPIDER_SCORE_CLOSE: z.number().default(900),

  FLEA_SPEED: z.number().default(160),
  FLEA_HP: z.number().int().min(1).default(2),
  FLEA_MUSHROOM_THRESHOLD: z.number().int().default(5),

  SCORPION_SPAWN_INTERVAL_MS: z.number().default(12000),
  SCORPION_SPEED: z.number().default(100),

  visual: CentipedeVisualConfigSchema.default({
    quality: "high",
    colorblindMode: false,
    springStiffness: 180,
    springDamping: 16,
    segmentRadiusHead: 0.55,
    segmentRadiusTail: 0.30,
    times: {
      popMs: 120,
      flashMs: 120,
      disintegrateMs: 280,
      sproutMs: 300,
      poisonPulsePeriodMs: 1200,
    },
    palette: DEFAULT_PALETTE,
    paletteColorblind: DEFAULT_PALETTE_COLORBLIND,
  }),
});

export type CentipedeConfig = z.infer<typeof CentipedeConfigSchema>;

export const DEFAULT_CENTIPEDE_CONFIG: CentipedeConfig = CentipedeConfigSchema.parse({});
