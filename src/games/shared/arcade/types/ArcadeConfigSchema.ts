import { z } from "zod";

/**
 * Reusable Zod schema shape for screen dimension properties across minigame configs.
 * @public
 */
export const ScreenDimensionsSchema = z.object({
  SCREEN_WIDTH: z.number().default(800),
  SCREEN_HEIGHT: z.number().default(600),
  SCREEN_CENTER_X: z.number().default(400),
  SCREEN_CENTER_Y: z.number().default(300)
});

/**
 * Reusable Zod schema shape for combo scoring configuration.
 * @public
 */
export const ComboConfigSchema = z.object({
  COMBO_TIMEOUT: z.number().default(2000),
  MAX_MULTIPLIER: z.number().default(10)
});

/**
 * Reusable Zod schema shape for standard keyboard input mappings.
 * @public
 */
export const StandardControlKeysSchema = z.object({
  LEFT: z.string().default("KeyA"),
  RIGHT: z.string().default("KeyD"),
  SHOOT: z.string().default("Space"),
  PAUSE: z.string().default("KeyP"),
  RESTART: z.string().default("KeyR")
});
