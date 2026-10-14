import { z } from "zod";

/**
 * Zod schema defining individual component specification within a blueprint.
 * @public
 */
export const ComponentSpecSchema = z.object({
  type: z.string(),
  when: z.string().optional(),
  props: z.record(z.string(), z.any()).default({})
});

export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;

/**
 * Zod schema defining declarative entity blueprints.
 * Format: EntityBlueprintDef = { id, tags?, components: ComponentSpec[], onSpawn?: string[] }
 * @public
 */
export const EntityBlueprintDefSchema = z.object({
  id: z.string(),
  tags: z.array(z.string()).optional(),
  components: z.array(ComponentSpecSchema).default([]),
  onSpawn: z.array(z.object({
    event: z.string(),
    payload: z.record(z.string(), z.any()).optional()
  })).optional()
});

export type EntityBlueprintDef = z.infer<typeof EntityBlueprintDefSchema>;
