import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { RandomService } from "../utils/RandomService";

/**
 * Representation of a single spawn instruction in a segment.
 * @public
 */
export interface SegmentSpawnPoint {
  x: number;
  y: number;
  type: string;
  args?: any;
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
    tileDefinitions: any
  ): void {
    // 1. Spawn Tilemap
    world.commands.spawnFromBlueprint("tilemap" as any, {
      data: plan.globalTilemap,
      tileDefinitions
    } as any);

    // 2. Spawn other elements
    for (const inst of plan.segments) {
      for (const sp of inst.spawnPoints) {
        // Calculate global pixel coordinates
        const globalPixelX = (inst.offsetX + sp.x) * tileSize + tileSize / 2;
        const globalPixelY = (inst.offsetY + sp.y) * tileSize + tileSize / 2;

        const args = {
          x: globalPixelX,
          y: globalPixelY,
          ...(sp.args ?? {})
        };

        const entity = world.reserveEntityId();
        world.commands.createEntity(entity);
        world.commands.spawnFromBlueprintForEntity(entity, sp.type as any, args);
        world.commands.addComponent(entity, {
          type: "Respawnable",
          blueprintKey: sp.type,
          initialArgs: args
        });
      }
    }
  }
}
