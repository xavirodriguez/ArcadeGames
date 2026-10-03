import { z } from "zod";
import { BaseConfigSchema, ScreenDimensionsSchema } from "@tiny-aster/core";

export const RacingConfigSchema = BaseConfigSchema.extend({
  ...ScreenDimensionsSchema.shape,
  WORLD_WIDTH: z.number().positive().default(1600),
  WORLD_HEIGHT: z.number().positive().default(1000),
  TOTAL_LAPS: z.number().int().positive().default(3),
  COUNTDOWN_SECONDS: z.number().nonnegative().default(3),
  CAR_ACCELERATION: z.number().nonnegative().default(360),
  CAR_MAX_SPEED: z.number().positive().default(420),
  CAR_GRIP: z.number().nonnegative().default(9),
  CAR_DRIFT: z.number().nonnegative().default(0.45),
  CAR_TURN_RATE: z.number().positive().default(3.4),
  CAR_BOOST_MULTIPLIER: z.number().positive().default(1.35),
  CAR_BOOST_SECONDS: z.number().nonnegative().default(1.25),
  CAR_BRAKE_DECELERATION: z.number().positive().default(520),
  CAR_ROLLING_DRAG: z.number().nonnegative().default(0.9),
  CHECKPOINT_WIDTH: z.number().positive().default(170),
  CHECKPOINT_HEIGHT: z.number().positive().default(90),
  CAR_RADIUS: z.number().positive().default(16),
  WALL_THICKNESS: z.number().positive().default(24),
  TRACK_GRASS_GRIP: z.number().nonnegative().default(16),
});

export type RacingConfig = z.infer<typeof RacingConfigSchema>;
export const DEFAULT_RACING_CONFIG: RacingConfig = RacingConfigSchema.parse({});
