import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";

export const FlappyBirdConfigSchema = BaseConfigSchema.extend({
  SCREEN_WIDTH: z.number().default(400),
  SCREEN_HEIGHT: z.number().default(600),

  BIRD_X: z.number().default(100),
  BIRD_START_Y: z.number().default(300),
  BIRD_RADIUS: z.number().default(15),

  GRAVITY: z.number().default(800),
  FLAP_STRENGTH: z.number().default(-300),
  FLAP_COOLDOWN: z.number().default(200),

  PIPE_WIDTH: z.number().default(60),
  PIPE_SPEED: z.number().default(150),
  PIPE_SPAWN_INTERVAL: z.number().default(2400),
  GAP_SIZE: z.number().default(140),

  GROUND_Y: z.number().default(580),

  NEAR_MISS_THRESHOLD: z.number().default(12),
  PIPE_SPAWN_MARGIN: z.number().default(100),
  COYOTE_TIME: z.number().default(0.05),
  MAX_NEAR_MISS_POINTS: z.number().default(80),

  KEYS: z.object({
    FLAP: z.string().default("Space"),
    PAUSE: z.string().default("KeyP"),
    RESTART: z.string().default("KeyR")
  }).default({
    FLAP: "Space",
    PAUSE: "KeyP",
    RESTART: "KeyR"
  })
});

export type FlappyBirdConfig = z.infer<typeof FlappyBirdConfigSchema>;

export const DEFAULT_FLAPPY_BIRD_CONFIG: FlappyBirdConfig = FlappyBirdConfigSchema.parse({});
