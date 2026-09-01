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
  KINETIC_MAX_ENERGY: z.number().default(100),
  KINETIC_CHARGE_ON_MOVE_RATE: z.number().default(15),
  KINETIC_GRAZE_RADIUS: z.number().default(40),
  KINETIC_GRAZE_CHARGE_AMOUNT: z.number().default(10),
  KINETIC_BURST_RADIUS: z.number().default(180),
  OVERDRIVE_DURATION: z.number().default(5.0),
  OVERDRIVE_FIRE_RATE_MULT: z.number().default(2.5),
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
  KINETIC_MAX_ENERGY: 100,
  KINETIC_CHARGE_ON_MOVE_RATE: 15,
  KINETIC_GRAZE_RADIUS: 40,
  KINETIC_GRAZE_CHARGE_AMOUNT: 10,
  KINETIC_BURST_RADIUS: 180,
  OVERDRIVE_DURATION: 5.0,
  OVERDRIVE_FIRE_RATE_MULT: 2.5,
};
