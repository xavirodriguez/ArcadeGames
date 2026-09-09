import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";
import {
  ScreenDimensionsSchema,
  ComboConfigSchema,
  StandardControlKeysSchema,
  PlayerMovementSchema
} from "@tiny-aster/gameplay-kit";

/**
 * Zod schema defining configuration structure and defaults for Arkanoid.
 *
 * @public
 */
export const ArkanoidConfigSchema = BaseConfigSchema.extend({
  ...ScreenDimensionsSchema.shape,
  ...ComboConfigSchema.shape,
  ...StandardControlKeysSchema.shape,
  ...PlayerMovementSchema.shape,

  // Paddle parameters
  PADDLE_WIDTH: z.number().default(100),
  PADDLE_HEIGHT: z.number().default(16),
  PADDLE_Y: z.number().default(540),

  // Ball parameters
  BALL_SIZE: z.number().gt(0).max(100).default(8),
  BALL_SPEED_START: z.number().default(320),
  BALL_SPEED_MAX: z.number().default(700),
  BALL_ACCELERATION: z.number().default(1.02),

  // Game rules
  PLAYER_INITIAL_LIVES: z.number().int().min(1).default(3),

  // Grid / Brick defaults
  BRICK_ROWS: z.number().int().default(5),
  BRICK_COLS: z.number().int().default(10),
  BRICK_WIDTH: z.number().default(70),
  BRICK_HEIGHT: z.number().default(20),
  BRICK_PADDING: z.number().default(6),
  BRICK_OFFSET_TOP: z.number().default(60),
  BRICK_OFFSET_LEFT: z.number().default(25)
});

export type ArkanoidConfig = z.infer<typeof ArkanoidConfigSchema>;

export const DEFAULT_ARKANOID_CONFIG: ArkanoidConfig = ArkanoidConfigSchema.parse({});
