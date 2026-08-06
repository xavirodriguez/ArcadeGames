import { z } from "zod";

export const GeometryWarsConfigSchema = z.object({
  WIDTH: z.number().default(800),
  HEIGHT: z.number().default(600),
  PLAYER_SPEED: z.number().default(220),
  PLAYER_FIRE_COOLDOWN: z.number().default(0.12), // fire cooldown in seconds
  BULLET_SPEED: z.number().default(500),
  BULLET_TTL: z.number().default(1.2),
  INITIAL_LIVES: z.number().default(3),
  INITIAL_BOMBS: z.number().default(3),
  INVULNERABILITY_DURATION: z.number().default(2.0),
});

export type GeometryWarsConfig = z.infer<typeof GeometryWarsConfigSchema>;

export const DEFAULT_CONFIG: GeometryWarsConfig = {
  WIDTH: 800,
  HEIGHT: 600,
  PLAYER_SPEED: 220,
  PLAYER_FIRE_COOLDOWN: 0.12,
  BULLET_SPEED: 500,
  BULLET_TTL: 1.2,
  INITIAL_LIVES: 3,
  INITIAL_BOMBS: 3,
  INVULNERABILITY_DURATION: 2.0,
};
