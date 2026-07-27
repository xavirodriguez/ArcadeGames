import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";

/**
 * Schema to validate Pong-specific configuration values using Zod.
 * Encapsulates the safety boundary checks for normal and mutated physics values of Pong.
 */
export const PongConfigSchema = BaseConfigSchema.extend({
  WIDTH: z.number().default(800),
  HEIGHT: z.number().default(600),
  BALL_SIZE: z.number().gt(0).max(1000).default(8),
  BALL_SPEED_START: z.number().default(300),
  BALL_SPEED_MAX: z.number().default(800),
  BALL_ACCELERATION: z.number().default(1.05),
  PADDLE_WIDTH: z.number().default(15),
  PADDLE_HEIGHT: z.number().default(80),
  PADDLE_SPEED: z.number().default(400),
  MAX_SCORE: z.number().default(5),
  BALL_INVISIBLE_AFTER_HIT_TICKS: z.number().min(0).max(600).optional()
});

export type PongConfig = z.infer<typeof PongConfigSchema>;

export const DEFAULT_PONG_CONFIG: PongConfig = {
  WIDTH: 800,
  HEIGHT: 600,
  BALL_SIZE: 8,
  BALL_SPEED_START: 300,
  BALL_SPEED_MAX: 800,
  BALL_ACCELERATION: 1.05,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 80,
  PADDLE_SPEED: 400,
  MAX_SCORE: 5,
};
