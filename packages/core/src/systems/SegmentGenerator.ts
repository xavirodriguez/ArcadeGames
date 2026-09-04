import { World } from "../ecs/World";
import { CoreComponentRegistry, TileDefinition } from "../ecs/CoreComponents";
import { RandomService } from "../utils/RandomService";
import { BlueprintRegistry } from "../ecs/BlueprintRegistry";

/**
 * Representation of a single spawn instruction in a segment.
 * @public
 */
export interface SegmentSpawnPoint {
  x: number;
  y: number;
  type: string;
  args?: Record<string, unknown>;
}

/**
 * Representation of a reusable segment template.
 * @public
 */
export interface SegmentTemplate {
  id: string;
  entry: { x: number; y: number };
  exit: { x: number; y: number };
  bounds: { width: number; height: number }; // in tiles
  difficulty: number;
  tags: string[];
  tileData: number[][]; // 2D array of tile types
  spawnPoints: SegmentSpawnPoint[];
}

/**
 * An instantiated segment placed in world coordinates.
 * @public
 */
export interface SegmentInstance {
  templateId: string;
  offsetX: number; // in tiles
  offsetY: number; // in tiles
  tileData: number[][];
  spawnPoints: SegmentSpawnPoint[];
  entry: { x: number; y: number }; // in tiles relative to segment
  exit: { x: number; y: number }; // in tiles relative to segment
}

/**
 * Represents a complete structured plan of a level.
 * @public
 */
export interface LevelPlan {
  seed: number;
  segments: SegmentInstance[];
  totalWidth: number; // in tiles
  totalHeight: number; // in tiles
  globalTilemap: number[][];
}

/**
 * Deterministic Level Generator using grammatical rules and templates.
 * @public
 */
export class SegmentGenerator {
  /**
   * Helper to get horizontal bounds of a segment instance.
   */
  private static getBoundsX(inst: SegmentInstance): number {
    return inst.tileData.length > 0 ? inst.tileData[0].length : 0;
  }

  /**
   * Helper to get vertical bounds of a segment instance.
   */
  private static getBoundsY(inst: SegmentInstance): number {
    return inst.tileData.length;
  }

  /**
   * Generates a complete LevelPlan from templates and grammatical tag sequence.
   *
   * @remarks
   * This generator is pure and deterministic given a seed.
   */
  public static generatePlan(
    templates: SegmentTemplate[],
    grammar: string[],
    seed: number
  ): LevelPlan {
    const random = new RandomService(seed);
    const instances: SegmentInstance[] = [];

    for (let i = 0; i < grammar.length; i++) {
      const tag = grammar[i];
      // Filter templates matching tag
      const matching = templates.filter((t) => t.tags.includes(tag));
      if (matching.length === 0) {
        throw new Error(`[SegmentGenerator] No templates found matching tag: ${tag}`);
      }

      // Select template deterministically
      const selectIndex = random.nextInt(0, matching.length - 1);
      const template = matching[selectIndex];

      let offsetX = 0;
      let offsetY = 0;

      if (instances.length === 0) {
        // First segment starts at 0, 0
        offsetX = 0;
        offsetY = 0;
      } else {
        const prev = instances[instances.length - 1];
        // Exit of previous in global coordinates
        const prevGlobalExitX = prev.offsetX + prev.exit.x;
        const prevGlobalExitY = prev.offsetY + prev.exit.y;

        // Align current segment's entry with previous exit
        offsetX = prevGlobalExitX - template.entry.x;
        offsetY = prevGlobalExitY - template.entry.y;
      }

      instances.push({
        templateId: template.id,
        offsetX,
        offsetY,
        tileData: template.tileData,
        spawnPoints: template.spawnPoints,
        entry: template.entry,
        exit: template.exit
      });
    }

    // Determine global tilemap dimensions (incorporating negative offsets gracefully)
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    for (const inst of instances) {
      const bX = SegmentGenerator.getBoundsX(inst);
      const bY = SegmentGenerator.getBoundsY(inst);

      if (inst.offsetX < minX) minX = inst.offsetX;
      if (inst.offsetX + bX > maxX) maxX = inst.offsetX + bX;
      if (inst.offsetY < minY) minY = inst.offsetY;
      if (inst.offsetY + bY > maxY) maxY = inst.offsetY + bY;
    }

    // Shift offsets so that top-left is 0, 0
    const shiftX = -minX;
    const shiftY = -minY;

    for (const inst of instances) {
      inst.offsetX += shiftX;
      inst.offsetY += shiftY;
    }

    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;

    // Create a giant empty grid
    const globalTilemap: number[][] = [];
    for (let r = 0; r < totalHeight; r++) {
      globalTilemap.push(new Array(totalWidth).fill(0));
    }

    // Stitch templates together into the global grid
    for (const inst of instances) {
      const rows = inst.tileData.length;
      const cols = rows > 0 ? inst.tileData[0].length : 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const globalR = inst.offsetY + r;
          const globalC = inst.offsetX + c;
          if (globalR >= 0 && globalR < totalHeight && globalC >= 0 && globalC < totalWidth) {
            // Overwrite if solid or non-empty
            const val = inst.tileData[r][c];
            if (val !== 0) {
              globalTilemap[globalR][globalC] = val;
            }
          }
        }
      }
    }

    return {
      seed,
      segments: instances,
      totalWidth,
      totalHeight,
      globalTilemap
    };
  }

  /**
   * Spawns all entities (tilemap and spawnPoints) from a LevelPlan in the ECS world.
   */
  public static instantiatePlan(
    world: World<CoreComponentRegistry>,
    plan: LevelPlan,
    tileSize: number,
    tileDefinitions?: Record<number, TileDefinition>
  ): void {
    const registry = world.getResource<BlueprintRegistry<CoreComponentRegistry>>("BlueprintRegistry");

    // 1. Spawn Tilemap
    if (registry && !registry.has("tilemap")) {
      console.warn("[SegmentGenerator] Blueprint 'tilemap' is not registered in BlueprintRegistry.");
    }
    world.commands.spawnFromBlueprint("tilemap", {
      data: plan.globalTilemap,
      tileDefinitions
    });

    // 2. Spawn other elements
    for (const inst of plan.segments) {
      for (const sp of inst.spawnPoints) {
        if (registry && !registry.has(sp.type)) {
          console.warn(`[SegmentGenerator] Blueprint '${sp.type}' is not registered. Skipping spawn point at tile (${sp.x}, ${sp.y}) in segment '${inst.templateId}'.`);
          continue;
        }

        // Calculate global pixel coordinates
        const globalPixelX = (inst.offsetX + sp.x) * tileSize + tileSize / 2;
        const globalPixelY = (inst.offsetY + sp.y) * tileSize + tileSize / 2;

        const args: Record<string, unknown> = {
          x: globalPixelX,
          y: globalPixelY,
          ...(sp.args ?? {})
        };

        try {
          const entity = world.reserveEntityId();
          world.commands.createEntity(entity);
          world.commands.spawnFromBlueprintForEntity(entity, sp.type, args);
          world.commands.addComponent(entity, {
            type: "Respawnable",
            blueprintKey: sp.type,
            initialArgs: args
          });
        } catch (err) {
          console.error(`[SegmentGenerator] Failed to schedule blueprint '${sp.type}':`, err);
        }
      }
    }
  }
}

/**
 * Validates a list of segment templates and an optional level grammar for structural consistency.
 *
 * @param templates - The segment templates to validate.
 * @param grammar - Optional grammatical tag sequence to verify template coverage.
 * @returns Array of validation error messages. Returns an empty array if all validations pass.
 * @public
 */
export function validateSegmentTemplates(
  templates: SegmentTemplate[],
  grammar?: string[]
): string[] {
  const errors: string[] = [];

  if (!Array.isArray(templates) || templates.length === 0) {
    errors.push("Templates array must not be empty.");
    return errors;
  }

  const registeredTags = new Set<string>();

  templates.forEach((template, idx) => {
    const idStr = template.id ? `template '${template.id}' (index ${idx})` : `template at index ${idx}`;

    if (!template.id) {
      errors.push(`Template at index ${idx} is missing a valid 'id'.`);
    }

    if (!template.bounds || typeof template.bounds.width !== "number" || typeof template.bounds.height !== "number") {
      errors.push(`${idStr} must specify valid numerical 'bounds' ({ width, height }).`);
    } else if (template.bounds.width <= 0 || template.bounds.height <= 0) {
      errors.push(`${idStr} bounds width and height must be greater than 0.`);
    }

    if (!Array.isArray(template.tileData)) {
      errors.push(`${idStr} 'tileData' must be a 2D array.`);
    } else if (template.bounds) {
      if (template.tileData.length !== template.bounds.height) {
        errors.push(
          `${idStr} 'tileData' row count (${template.tileData.length}) does not match bounds.height (${template.bounds.height}).`
        );
      }
      for (let r = 0; r < template.tileData.length; r++) {
        const row = template.tileData[r];
        if (!Array.isArray(row) || row.length !== template.bounds.width) {
          errors.push(
            `${idStr} 'tileData' row ${r} length (${Array.isArray(row) ? row.length : "invalid"}) does not match bounds.width (${template.bounds.width}).`
          );
        }
      }
    }

    if (!template.entry || typeof template.entry.x !== "number" || typeof template.entry.y !== "number") {
      errors.push(`${idStr} must specify a valid 'entry' point ({ x, y }).`);
    }

    if (!template.exit || typeof template.exit.x !== "number" || typeof template.exit.y !== "number") {
      errors.push(`${idStr} must specify a valid 'exit' point ({ x, y }).`);
    }

    if (!Array.isArray(template.tags) || template.tags.length === 0) {
      errors.push(`${idStr} must have at least one tag in 'tags'.`);
    } else {
      template.tags.forEach((tag) => registeredTags.add(tag));
    }
  });

  if (grammar && Array.isArray(grammar)) {
    grammar.forEach((tag, idx) => {
      if (!registeredTags.has(tag)) {
        errors.push(`Grammar tag '${tag}' at step ${idx} has no matching template in templates.`);
      }
    });
  }

  return errors;
}
