import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";
import {
  ScreenDimensionsSchema,
  TileGridSchema,
  PlayerMovementSchema,
  JumpPhysicsSchema
} from "@tiny-aster/gameplay-kit";

import { EchoRunnerConfigSchema } from "../../echorunner/types/EchoRunnerConfigSchema";

export const HitAndRunConfigSchema = EchoRunnerConfigSchema.extend({
  // Additional configuration parameters specific to Hit & Run (if any)
});

export type HitAndRunConfig = z.infer<typeof HitAndRunConfigSchema>;

export const DEFAULT_HIT_AND_RUN_CONFIG: HitAndRunConfig = HitAndRunConfigSchema.parse({});
