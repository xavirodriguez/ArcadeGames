import { z } from "zod";
import { BaseConfigSchema } from "@tiny-aster/core";

export const FroggerConfigSchema = BaseConfigSchema.extend({
  SCREEN_WIDTH: z.number().default(800),
  SCREEN_HEIGHT: z.number().default(600),
  GRID_SIZE: z.number().default(40),
  TOTAL_ROWS: z.number().default(15),
  TOTAL_COLS: z.number().default(20),
  INITIAL_LIVES: z.number().default(3),
  TOTAL_LILY_PADS: z.number().default(5),
  STEP_POINTS: z.number().default(10),
  GOAL_POINTS: z.number().default(500),
  LEVEL_BONUS: z.number().default(1000),
  TRAFFIC_SPEED_MULTIPLIER: z.number().default(1.0),
  RIVER_SPEED_MULTIPLIER: z.number().default(1.0),
  INPUT_COOLDOWN_TICKS: z.number().default(8),
  KEYS: z.object({
    MOVE_UP: z.string().default("ArrowUp"),
    MOVE_DOWN: z.string().default("ArrowDown"),
    MOVE_LEFT: z.string().default("ArrowLeft"),
    MOVE_RIGHT: z.string().default("ArrowRight"),
    PAUSE: z.string().default("KeyP"),
    RESTART: z.string().default("KeyR"),
  }).default({
    MOVE_UP: "ArrowUp",
    MOVE_DOWN: "ArrowDown",
    MOVE_LEFT: "ArrowLeft",
    MOVE_RIGHT: "ArrowRight",
    PAUSE: "KeyP",
    RESTART: "KeyR",
  }),
});

export type FroggerConfig = z.infer<typeof FroggerConfigSchema>;

export const DEFAULT_FROGGER_CONFIG: FroggerConfig = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  GRID_SIZE: 40,
  TOTAL_ROWS: 15,
  TOTAL_COLS: 20,
  INITIAL_LIVES: 3,
  TOTAL_LILY_PADS: 5,
  STEP_POINTS: 10,
  GOAL_POINTS: 500,
  LEVEL_BONUS: 1000,
  TRAFFIC_SPEED_MULTIPLIER: 1.0,
  RIVER_SPEED_MULTIPLIER: 1.0,
  INPUT_COOLDOWN_TICKS: 8,
  KEYS: {
    MOVE_UP: "ArrowUp",
    MOVE_DOWN: "ArrowDown",
    MOVE_LEFT: "ArrowLeft",
    MOVE_RIGHT: "ArrowRight",
    PAUSE: "KeyP",
    RESTART: "KeyR",
  },
};
