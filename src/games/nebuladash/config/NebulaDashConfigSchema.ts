import { z } from "zod";
import { ComboConfigSchema, ScreenDimensionsSchema } from "../../shared/arcade/types/ArcadeConfigSchema";

export const NebulaDashConfigSchema = ScreenDimensionsSchema.merge(ComboConfigSchema).extend({
  JUMP_IMPULSE: z.number().min(-600).max(-300).default(-420),
  GRAVITY: z.number().min(500).max(1500).default(980),
  LATERAL_SPEED: z.number().min(200).max(500).default(320),
  PLASMA_BASE_SPEED: z.number().min(40).max(200).default(80),
  PLASMA_ACCELERATION: z.number().min(0.5).max(5.0).default(1.5),

  KEYS: z.object({
    LEFT: z.string().default("KeyA"),
    RIGHT: z.string().default("KeyD"),
    JUMP: z.string().default("Space"),
    PAUSE: z.string().default("KeyP"),
    RESTART: z.string().default("KeyR")
  }).default({
    LEFT: "KeyA",
    RIGHT: "KeyD",
    JUMP: "Space",
    PAUSE: "KeyP",
    RESTART: "KeyR"
  })
});

export type NebulaDashConfig = z.infer<typeof NebulaDashConfigSchema>;
