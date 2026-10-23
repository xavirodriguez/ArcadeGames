import { z } from "zod";
import { BaseConfigSchema } from "@tiny-aster/core";
import { ComboConfigSchema, ScreenDimensionsSchema } from "@tiny-aster/gameplay-kit";

/** @public */
export const AsteroidTierSchema = z.object({
  size: z.string(),
  radius: z.number().positive(),
  score: z.number().nonnegative(),
  splitsInto: z.string().nullable(),
  splitCount: z.number().int().nonnegative(),
  speedRange: z.tuple([z.number(), z.number()]).default([-50, 50])
});

/** @public */
export type AsteroidTier = z.infer<typeof AsteroidTierSchema>;

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
  BULLET_BOUNDARY_BEHAVIOR: z.enum(["destroy", "wrap", "bounce"]).optional(),
  ...ComboConfigSchema.shape,
  HYPERSPACE_COOLDOWN: z.number().default(5.0),
  HYPERSPACE_PREP_TIME: z.number().default(0.5),
  ASTEROID_SCORE_LARGE: z.number().default(20),
  ASTEROID_SCORE_MEDIUM: z.number().default(50),
  ASTEROID_SCORE_SMALL: z.number().default(100),
  ASTEROID_TIERS: z.array(AsteroidTierSchema).default([
    { size: "large", radius: 40, score: 20, splitsInto: "medium", splitCount: 2, speedRange: [-50, 50] },
    { size: "medium", radius: 20, score: 50, splitsInto: "small", splitCount: 2, speedRange: [-50, 50] },
    { size: "small", radius: 10, score: 100, splitsInto: null, splitCount: 0, speedRange: [-50, 50] }
  ]),
  UFO_SCORE_LARGE: z.number().default(200),
  UFO_SCORE_SMALL: z.number().default(1000),
  FRAGMENT_IMPULSE_SPEED: z.number().default(80),
  SHIP_DEATH_PARTICLE_COUNT: z.number().default(24),
  MAX_ASTEROIDS: z.number().default(50),
  /**
   * Visual presentation mod. "classic" = current neon look;
   * "iceberg" = Borealis / cristal glaciar (ART_ICEBERG.md).
   * Overridable via gameOptions.mod at runtime.
   */
  VISUAL_MOD: z.enum(["classic", "iceberg"]).default("classic")
});

/** @public */
export type AsteroidConfig = z.infer<typeof AsteroidConfigSchema>;

/** @public */
export const DEFAULT_ASTEROID_CONFIG: AsteroidConfig = AsteroidConfigSchema.parse({});
