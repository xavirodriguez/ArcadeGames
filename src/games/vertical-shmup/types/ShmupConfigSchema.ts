import { z } from "zod";

export const ShmupConfigSchema = z.object({
  WORLD_WIDTH: z.number().positive().default(480),
  WORLD_HEIGHT: z.number().positive().default(854),
  PLAYER_SPEED: z.number().positive().default(300),
  PLAYER_SIZE: z.number().positive().default(22),
  PLAYER_COLLIDER_RADIUS: z.number().positive().default(12),
  PLAYER_SHOOT_COOLDOWN: z.number().nonnegative().default(120),
  PLAYER_BULLET_SPEED: z.number().positive().default(650),
  PLAYER_BULLET_SIZE: z.number().positive().default(4),
  PLAYER_BULLET_TTL: z.number().positive().default(2),
  ENEMY_SPEED: z.number().positive().default(90),
  ENEMY_SIZE: z.number().positive().default(24),
  ENEMY_COLLIDER_RADIUS: z.number().positive().default(12),
  ENEMY_HP: z.number().positive().default(1),
  ENEMY_SCORE: z.number().nonnegative().default(100),
  ENEMY_BULLET_SPEED: z.number().positive().default(220),
  ENEMY_BULLET_SIZE: z.number().positive().default(4),
  ENEMY_BULLET_TTL: z.number().positive().default(5),
  SPAWN_INTERVAL: z.number().positive().default(0.8),
  SCROLL_SPEED: z.number().nonnegative().default(80),
  OFFSCREEN_MARGIN: z.number().positive().default(80),
  MUZZLE_FLASH_FRAMES: z.number().int().nonnegative().default(3),
  RETROCOIL_PX: z.number().nonnegative().default(10),
  STAR_COUNT: z.number().int().positive().default(80),
  STAR_SPEED: z.number().nonnegative().default(35),
  COUNTDOWN: z.number().nonnegative().default(2),
  KEY_LEFT: z.string().default("ArrowLeft"),
  KEY_RIGHT: z.string().default("ArrowRight"),
  KEY_UP: z.string().default("ArrowUp"),
  KEY_DOWN: z.string().default("ArrowDown"),
  KEY_SHOOT: z.string().default("Space")
});

export type ShmupConfig = z.infer<typeof ShmupConfigSchema>;
export const DEFAULT_SHMUP_CONFIG = ShmupConfigSchema.parse({});
