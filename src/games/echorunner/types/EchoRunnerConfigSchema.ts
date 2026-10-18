import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";
import {
  ScreenDimensionsSchema,
  TileGridSchema,
  PlayerMovementSchema,
  JumpPhysicsSchema
} from "@tiny-aster/gameplay-kit";

export const EchoRunnerConfigSchema = BaseConfigSchema.extend({
  ...ScreenDimensionsSchema.shape,
  ...TileGridSchema.shape,
  ...PlayerMovementSchema.shape,
  ...JumpPhysicsSchema.shape,
  PLAYER_SPEED: z.number().gt(0).default(220),
  PLAYER_ACCEL: z.number().gt(0).default(900),
  PLAYER_DECEL: z.number().gt(0).default(1300),
  PLAYER_AIR_ACCEL: z.number().gt(0).default(450),
  PLAYER_AIR_DECEL: z.number().gt(0).default(700),
  PLAYER_JUMP_VEL: z.number().gt(0).default(370),
  PLAYER_MIN_JUMP_VEL: z.number().gt(0).default(160),
  RISE_GRAVITY: z.number().gt(0).default(850),
  FALL_GRAVITY: z.number().gt(0).default(1300),
  APEX_THRESHOLD: z.number().gt(0).default(50),
  APEX_GRAVITY_MULTIPLIER: z.number().min(0).max(1).default(0.2),
  COYOTE_TIME_MAX: z.number().min(0).default(0.15),
  JUMP_BUFFER_MAX: z.number().min(0).default(0.1),
  TILE_SIZE: z.number().gt(0).default(40),
  DEATH_PLANE_Y: z.number().gt(0).default(650)
}).refine(
  (config) => config.PLAYER_MIN_JUMP_VEL <= config.PLAYER_JUMP_VEL,
  {
    message: "PLAYER_MIN_JUMP_VEL must be less than or equal to PLAYER_JUMP_VEL",
    path: ["PLAYER_MIN_JUMP_VEL"]
  }
);

export type EchoRunnerConfig = z.infer<typeof EchoRunnerConfigSchema>;

export const DEFAULT_ECHO_RUNNER_CONFIG: EchoRunnerConfig = EchoRunnerConfigSchema.parse({});
