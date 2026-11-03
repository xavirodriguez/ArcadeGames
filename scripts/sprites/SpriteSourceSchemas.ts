import { z } from "zod";

const SlugSchema = z.string().regex(
  /^[a-z][a-z0-9_]*$/,
  "Use lowercase letters, digits and underscores; the first character must be a letter."
);

const AnchorSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1)
}).strict();

const AnimationOverrideSchema = z.object({
  loop: z.boolean().optional()
}).strict();

export const SpriteSourceConfigSchema = z.object({
  id: SlugSchema,
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  sourceMode: z.enum(["frames", "full-image"]).optional(),
  anchor: AnchorSchema.optional(),
  defaultLoop: z.boolean().optional(),
  animations: z.record(z.string(), AnimationOverrideSchema).optional()
}).strict();

export const SpriteEventSchema = z.object({
  frame: z.number().int().nonnegative(),
  type: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).optional()
}).strict();

export const SpriteEventsOverlaySchema = z.object({
  animations: z.record(z.string(), z.array(SpriteEventSchema))
}).strict();

const AsepriteRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number()
}).strict();

const AsepriteFrameSchema = z.object({
  frame: AsepriteRectSchema,
  rotated: z.boolean().optional(),
  trimmed: z.boolean().optional(),
  spriteSourceSize: AsepriteRectSchema.optional(),
  sourceSize: z.object({
    w: z.number(),
    h: z.number()
  }).strict().optional(),
  duration: z.number().optional()
}).passthrough();

const AsepriteFrameTagSchema = z.object({
  name: z.string(),
  from: z.number(),
  to: z.number(),
  direction: z.string().optional(),
  repeat: z.union([z.string(), z.number()]).optional()
}).passthrough();

export const AsepriteExportSchema = z.object({
  frames: z.union([
    z.array(AsepriteFrameSchema),
    z.record(z.string(), AsepriteFrameSchema)
  ]),
  meta: z.object({
    size: z.object({
      w: z.number(),
      h: z.number()
    }).strict().optional(),
    frameTags: z.array(AsepriteFrameTagSchema).optional()
  }).passthrough()
}).passthrough();

export type SpriteSourceConfig = z.infer<typeof SpriteSourceConfigSchema>;
export type SpriteEventsOverlay = z.infer<typeof SpriteEventsOverlaySchema>;
export type AsepriteExport = z.infer<typeof AsepriteExportSchema>;
