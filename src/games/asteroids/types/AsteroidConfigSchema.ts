import { z } from "zod";
import { BaseConfigSchema } from "@tiny-aster/core";
import { ComboConfigSchema, ScreenDimensionsSchema } from "@tiny-aster/gameplay-kit";

/** @public */
export const AsteroidConfigSchema = BaseConfigSchema.extend({
  USE_SPRITES: z.boolean().default(true),
  ...ScreenDimensionsSchema.shape,
  INITIAL_ASTEROID_COUNT: z.number().default(5),
  TRAIL_MAX_LENGTH: z.number().default(10),
  // Paso 2: Ship physical parameters extracted and unified
  SHIP_THRUST: z.number().default(150), // Ship thrust force (default 150)
  FRICTION: z.number().default(0.99), // General world friction coefficient (default 0.99)
  SHIP_FRICTION: z.number().default(0.99), // Ship-specific friction coefficient (default 0.99)
  SHIP_ROTATION_SPEED: z.number().default(Math.PI), // Ship rotation speed (default PI rad/sec)
  BULLET_TTL: z.number().default(2.0),
  SHIP_SHOOT_COOLDOWN: z.number().default(0.25),
  BULLET_SPEED: z.number().default(300),
  ...ComboConfigSchema.shape,
  HYPERSPACE_COOLDOWN: z.number().default(5.0),
  HYPERSPACE_PREP_TIME: z.number().default(0.5),
  ASTEROID_SCORE_LARGE: z.number().default(20),
  ASTEROID_SCORE_MEDIUM: z.number().default(50),
  ASTEROID_SCORE_SMALL: z.number().default(100),
  UFO_SCORE_LARGE: z.number().default(200),
  UFO_SCORE_SMALL: z.number().default(1000),
  FRAGMENT_IMPULSE_SPEED: z.number().default(80),
  SHIP_DEATH_PARTICLE_COUNT: z.number().default(24),
  MAX_ASTEROIDS: z.number().default(50)
});

/** @public */
export type AsteroidConfig = z.infer<typeof AsteroidConfigSchema>;

/** @public */
export const DEFAULT_ASTEROID_CONFIG: AsteroidConfig = AsteroidConfigSchema.parse({});
