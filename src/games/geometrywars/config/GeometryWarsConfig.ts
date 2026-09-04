import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";

export const GeometryWarsConfigSchema = BaseConfigSchema.extend({
  WIDTH: z.number().default(800),
  HEIGHT: z.number().default(600),
  PLAYER_SPEED: z.number().default(220),
  PLAYER_FIRE_COOLDOWN: z.number().default(0.12), // fire cooldown in seconds
  BULLET_SPEED: z.number().default(500),
  BULLET_TTL: z.number().default(1.2),
  INITIAL_LIVES: z.number().default(3),
  INITIAL_BOMBS: z.number().default(3),
  INVULNERABILITY_DURATION: z.number().default(2.0),
  KINETIC_MAX_ENERGY: z.number().default(100),
  KINETIC_CHARGE_ON_MOVE_RATE: z.number().default(15),
  KINETIC_GRAZE_RADIUS: z.number().default(40),
  KINETIC_GRAZE_CHARGE_AMOUNT: z.number().default(10),
  KINETIC_BURST_RADIUS: z.number().default(180),
  OVERDRIVE_DURATION: z.number().default(5.0),
  OVERDRIVE_FIRE_RATE_MULT: z.number().default(2.5),
});

export type GeometryWarsConfig = z.infer<typeof GeometryWarsConfigSchema>;

export const DEFAULT_CONFIG: GeometryWarsConfig = GeometryWarsConfigSchema.parse({});
export const DEFAULT_GEOMETRYWARS_CONFIG = DEFAULT_CONFIG;
