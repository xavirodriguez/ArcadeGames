import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";
import { ScreenDimensionsSchema } from "@tiny-aster/gameplay-kit";

export const TileTypeSchema = z.enum(["path", "buildable", "blocked", "spawn", "base"]);

export const TowerDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().positive(),
  range: z.number().positive(),
  damage: z.number().positive(),
  fireRate: z.number().positive(),
  projectileSpeed: z.number().positive(),
  upgradeCost: z.number().positive().optional(),
  maxLevel: z.number().int().positive().default(3),
  slowFactor: z.number().min(0.1).max(1).optional(),
  slowDurationMs: z.number().positive().optional(),
});

export const CreepDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.number().positive(),
  speed: z.number().positive(),
  reward: z.number().nonnegative(),
  size: z.number().positive().default(12),
});

export const WaveDefinitionSchema = z.object({
  id: z.string(),
  creeps: z.array(z.object({
    type: z.string(),
    count: z.number().int().positive(),
    interval: z.number().positive().default(0.8),
  })),
  delayBeforeStart: z.number().nonnegative().default(2),
});

export const TowerDefenseConfigSchema = BaseConfigSchema.extend({
  ...ScreenDimensionsSchema.shape,
  KEYS: z.object({
    PAUSE: z.string().default("KeyP"),
    RESTART: z.string().default("KeyR"),
    BUILD: z.string().default("KeyB"),
    SELL: z.string().default("KeyX"),
    UPGRADE: z.string().default("KeyU"),
  }).default({
    PAUSE: "KeyP",
    RESTART: "KeyR",
    BUILD: "KeyB",
    SELL: "KeyX",
    UPGRADE: "KeyU",
  }),
  STARTING_GOLD: z.number().int().nonnegative().default(150),
  STARTING_LIVES: z.number().int().positive().default(20),
  GOLD_PER_KILL_MULTIPLIER: z.number().positive().default(1),
  GRID_COLS: z.number().int().positive().default(16),
  GRID_ROWS: z.number().int().positive().default(12),
  CELL_SIZE: z.number().positive().default(40),
  GRID_OFFSET_X: z.number().default(80),
  GRID_OFFSET_Y: z.number().default(40),
  LEVEL_LAYOUT: z.array(z.string()).default([
    "XXXXXXXXXXXXXXXX",
    "SBBBBBBBBBBBBBBX",
    "XPPPPPPPPPPPPPBX",
    "XBBBBBBBBBBBBPBX",
    "XBBPPPPPPPPPBPBX",
    "XBBPBBBBBBBPBPBX",
    "XBBPBBBBBBBPBPBX",
    "XBBPBBBBBBBPBPBX",
    "XBBPPPPPPPPPBPBX",
    "XBBBBBBBBBBBBPBX",
    "XBBBBBBBBBBBBPBX",
    "XBBBBBBBBBBBBBBE",
  ]),
  TOWERS: z.array(TowerDefinitionSchema).default([
    { id: "basic", name: "Basic Tower", cost: 50, range: 120, damage: 15, fireRate: 1.0, projectileSpeed: 400, upgradeCost: 40, maxLevel: 3 },
    { id: "sniper", name: "Sniper Tower", cost: 100, range: 220, damage: 40, fireRate: 0.5, projectileSpeed: 600, upgradeCost: 70, maxLevel: 3 },
    { id: "rapid", name: "Rapid Tower", cost: 80, range: 90, damage: 8, fireRate: 3.0, projectileSpeed: 450, upgradeCost: 55, maxLevel: 3 },
  ]),
  CREEPS: z.array(CreepDefinitionSchema).default([
    { id: "grunt", name: "Grunt", hp: 40, speed: 60, reward: 10, size: 12 },
    { id: "fast", name: "Scout", hp: 25, speed: 110, reward: 15, size: 10 },
    { id: "tank", name: "Tank", hp: 120, speed: 35, reward: 30, size: 18 },
  ]),
  WAVES: z.array(WaveDefinitionSchema).default([
    { id: "wave1", creeps: [{ type: "grunt", count: 8, interval: 0.9 }], delayBeforeStart: 3 },
    { id: "wave2", creeps: [{ type: "grunt", count: 6, interval: 0.7 }, { type: "fast", count: 4, interval: 0.6 }], delayBeforeStart: 4 },
    { id: "wave3", creeps: [{ type: "grunt", count: 8, interval: 0.6 }, { type: "tank", count: 2, interval: 1.5 }], delayBeforeStart: 5 },
    { id: "wave4", creeps: [{ type: "fast", count: 10, interval: 0.5 }, { type: "grunt", count: 6, interval: 0.7 }], delayBeforeStart: 4 },
    { id: "wave5", creeps: [{ type: "tank", count: 4, interval: 1.2 }, { type: "fast", count: 6, interval: 0.5 }, { type: "grunt", count: 8, interval: 0.6 }], delayBeforeStart: 5 },
  ]),
  PROJECTILE_SIZE: z.number().positive().default(4),
  PROJECTILE_TTL: z.number().positive().default(3000),
  MAX_DELTA_TIME: z.number().default(100),
  INTERMISSION_DURATION: z.number().nonnegative().default(5),
});

export type TowerDefenseConfig = z.infer<typeof TowerDefenseConfigSchema>;
export type TowerDefinition = z.infer<typeof TowerDefinitionSchema>;
export type CreepDefinition = z.infer<typeof CreepDefinitionSchema>;
export type WaveDefinition = z.infer<typeof WaveDefinitionSchema>;
export type TileType = z.infer<typeof TileTypeSchema>;
