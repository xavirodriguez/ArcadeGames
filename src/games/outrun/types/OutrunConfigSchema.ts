import { BaseConfigSchema } from "@tiny-aster/core";
import { z } from "zod";

/**
 * Zod schema defining configuration structure and defaults for Outrun pseudo-3D racing.
 *
 * @public
 */
export const OutrunConfigSchema = BaseConfigSchema.extend({
  segmentLength: z.number().positive().default(200),
  rumbleLength: z.number().int().positive().default(3),
  roadWidth: z.number().positive().default(2000),
  cameraHeight: z.number().positive().default(1000),
  cameraDepth: z.number().positive().default(0.84),
  drawDistance: z.number().int().positive().default(300),
  maxSpeed: z.number().positive().default(12000),
  centrifugalForce: z.number().min(0).default(0.3),
  accel: z.number().positive().default(2000),
  brake: z.number().positive().default(4000),
  decel: z.number().positive().default(800),
  offRoadDecel: z.number().positive().default(2000),
  offRoadLimit: z.number().positive().default(4000),
  steerSpeed: z.number().positive().default(3.0),
  playerZOffset: z.number().default(0),
  laneWidth: z.number().positive().default(0.3),
  trafficDensity: z.number().min(0).max(1).default(0.02),
  WIDTH: z.number().positive().default(800),
  HEIGHT: z.number().positive().default(600)
});

export type OutrunConfig = z.infer<typeof OutrunConfigSchema>;

export const DEFAULT_OUTRUN_CONFIG: OutrunConfig = OutrunConfigSchema.parse({});
