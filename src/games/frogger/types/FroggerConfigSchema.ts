import { z } from "zod";
import { BaseConfigSchema } from "@tiny-aster/core";
import { ScreenDimensionsSchema } from "@tiny-aster/gameplay-kit";

export const FroggerConfigSchema = BaseConfigSchema.extend({
  ...ScreenDimensionsSchema.shape,
  GRID_SIZE: z.number().default(40),
  TOTAL_ROWS: z.number().default(15),
  TOTAL_COLS: z.number().default(20),
  INITIAL_LIVES: z.number().default(3),
  TOTAL_LILY_PADS: z.number().default(5),
  STEP_POINTS: z.number().default(10),
  GOAL_POINTS: z.number().default(500),
  LEVEL_BONUS: z.number().default(1000),
  /** Multiplier applied to vehicle speeds each time a level is cleared. */
  TRAFFIC_SPEED_MULTIPLIER: z.number().default(1.15),
  /** Multiplier applied to log/turtle speeds each time a level is cleared. */
  RIVER_SPEED_MULTIPLIER: z.number().default(1.12),
  /** Hard cap on the cumulative speed multiplier so the game stays playable. */
  MAX_SPEED_MULTIPLIER: z.number().default(2.5),
  INPUT_COOLDOWN_TICKS: z.number().default(3),
  LILY_PAD_CATCH_THRESHOLD: z.number().default(0.88),
  LOG_OVERLAP_RATIO: z.number().default(0.65),
  /** Seconds the frog has to reach a home before timeout death. */
  FROG_TIME_LIMIT: z.number().default(30),
  /** Points awarded per remaining second when a frog reaches home. */
  TIME_BONUS_PER_SECOND: z.number().default(10),
  /** Optional reduction of time limit per level (seconds). */
  TIME_LIMIT_REDUCTION_PER_LEVEL: z.number().default(0),
  /** Minimum time limit after reductions. */
  MIN_TIME_LIMIT: z.number().default(15),
  /** Score threshold for an extra life (awarded once per threshold). */
  EXTRA_LIFE_SCORE_THRESHOLD: z.number().default(20000),
  /** Bonus points for catching the fly. */
  FLY_BONUS_POINTS: z.number().default(200),
  /** How long the fly stays on a pad (seconds). */
  FLY_DURATION: z.number().default(5),
  /** Bonus for rescuing the female frog. */
  FEMALE_FROG_BONUS: z.number().default(200),
  /** Turtle dive cycle: float duration (seconds). */
  TURTLE_FLOAT_DURATION: z.number().default(4),
  /** Turtle dive cycle: warning (partially submerged) duration. */
  TURTLE_WARNING_DURATION: z.number().default(1.5),
  /** Turtle dive cycle: fully submerged duration. */
  TURTLE_SUBMERGED_DURATION: z.number().default(2),
  /** Crocodile mouth open/closed cycle durations. */
  CROCODILE_CLOSED_DURATION: z.number().default(3),
  CROCODILE_OPEN_DURATION: z.number().default(2),
  /** Probability (0-1) a free lily pad spawns a crocodile (scales with level). */
  CROCODILE_PAD_BASE_CHANCE: z.number().default(0.08),
  KEYS: z
    .object({
      MOVE_UP: z.string().default("ArrowUp"),
      MOVE_DOWN: z.string().default("ArrowDown"),
      MOVE_LEFT: z.string().default("ArrowLeft"),
      MOVE_RIGHT: z.string().default("ArrowRight"),
      PAUSE: z.string().default("KeyP"),
      RESTART: z.string().default("KeyR"),
    })
    .default({
      MOVE_UP: "ArrowUp",
      MOVE_DOWN: "ArrowDown",
      MOVE_LEFT: "ArrowLeft",
      MOVE_RIGHT: "ArrowRight",
      PAUSE: "KeyP",
      RESTART: "KeyR",
    }),
});

export type FroggerConfig = z.infer<typeof FroggerConfigSchema>;

export const DEFAULT_FROGGER_CONFIG: FroggerConfig = FroggerConfigSchema.parse({});
