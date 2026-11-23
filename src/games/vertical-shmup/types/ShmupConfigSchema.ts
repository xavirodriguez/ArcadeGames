import { z } from "zod";

export const ShmupConfigSchema = z.object({
  WORLD_WIDTH: z.number().positive().default(480),
  WORLD_HEIGHT: z.number().positive().default(854),
  PLAYER_SPEED: z.number().positive().default(300),
  PLAYER_SIZE: z.number().positive().default(22),
  PLAYER_COLLIDER_RADIUS: z.number().positive().default(2.5),
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
  /** Outer graze annulus = PLAYER_COLLIDER_RADIUS + GRAZE_MARGIN (AUD-P2-01). */
  GRAZE_MARGIN: z.number().nonnegative().default(12),
  /** Score granted once per enemy bullet that enters the graze annulus. */
  GRAZE_SCORE: z.number().nonnegative().default(10),
  /** Starting bomb stock (AUD-P2-01). */
  BOMB_STOCK_INITIAL: z.number().int().nonnegative().default(3),
  /** Maximum bomb inventory. Rewards never exceed this value. */
  BOMB_STOCK_MAX: z.number().int().positive().default(5),
  /** Bomb stock granted on every completed boss kill. */
  BOSS_KILL_BOMB_REWARD: z.number().int().nonnegative().default(1),
  /** Accumulated grazes required to earn one extra bomb. */
  GRAZE_BOMB_THRESHOLD: z.number().int().positive().default(40),
  /** Player invulnerability seconds after detonating a bomb. */
  BOMB_INVULN_DURATION: z.number().nonnegative().default(1.5),
  /** Damage applied to non-boss enemies on bomb. */
  BOMB_ENEMY_DAMAGE: z.number().nonnegative().default(2),
  /** Damage applied to boss on bomb (usually lower). */
  BOMB_BOSS_DAMAGE: z.number().nonnegative().default(1),
  /** Boss base health before wave scaling. */
  BOSS_HP_BASE: z.number().positive().default(250),
  /** First wave whose boss uses the scaled health curve. */
  BOSS_HP_SCALING_START_WAVE: z.number().int().positive().default(5),
  /** Extra boss health per wave beyond `BOSS_HP_SCALING_START_WAVE`. */
  BOSS_HP_PER_EXTRA_WAVE: z.number().nonnegative().default(4),
  /** Boss hover altitude as a fraction of world height. */
  BOSS_HOVER_Y_RATIO: z.number().positive().max(1).default(0.22),
  /** Seconds the boss takes to ease from its entry point to the hover altitude. */
  BOSS_HOVER_ENTRY_DURATION: z.number().positive().default(1.8),
  /** Vertical bob amplitude in world units while hovering. */
  BOSS_HOVER_BOB_AMPLITUDE: z.number().nonnegative().default(18),
  /** Vertical bob angular frequency (rad/s) while hovering. */
  BOSS_HOVER_BOB_FREQUENCY: z.number().nonnegative().default(1.6),
  /** Horizontal sway amplitude in world units while hovering. */
  BOSS_HOVER_SWAY_AMPLITUDE: z.number().nonnegative().default(90),
  /** Horizontal sway angular frequency (rad/s) while hovering. */
  BOSS_HOVER_SWAY_FREQUENCY: z.number().nonnegative().default(0.9),
  /** Seconds a wave banner stays on screen. */
  WAVE_ANNOUNCEMENT_DURATION: z.number().positive().default(2),
  KEY_LEFT: z.string().default("ArrowLeft"),
  KEY_RIGHT: z.string().default("ArrowRight"),
  KEY_UP: z.string().default("ArrowUp"),
  KEY_DOWN: z.string().default("ArrowDown"),
  KEY_SHOOT: z.string().default("Space"),
  KEY_BOMB: z.string().default("KeyB")
});

export type ShmupConfig = z.infer<typeof ShmupConfigSchema>;
export const DEFAULT_SHMUP_CONFIG = ShmupConfigSchema.parse({});
