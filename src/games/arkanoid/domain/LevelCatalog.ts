import { z } from "zod";

export type ArkanoidLevelKind = "standard" | "boss";

export type BrickMaterial =
  | "standard"
  | "silver"
  | "gold"
  | "explosive"
  | "regenerable"
  | "gravitational";

export type BrickColorName =
  | "white"
  | "orange"
  | "cyan"
  | "green"
  | "red"
  | "blue"
  | "pink"
  | "yellow"
  | "silver"
  | "gold"
  | "purple";

export type CapsuleType = "E" | "L" | "C" | "S" | "M" | "B" | "P";

export interface ArkanoidBrickCell {
  row: number;
  col: number;
  material: BrickMaterial;
  color: BrickColorName;
  hp?: number;
  points?: number;
  powerUp?: CapsuleType;
}

export interface ArkanoidLevelDefinition {
  id: number;
  kind: ArkanoidLevelKind;
  rows: number;
  columns: number;
  cells: readonly ArkanoidBrickCell[];
  themeId: string;
}

export const ArkanoidBrickCellSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  material: z.enum([
    "standard",
    "silver",
    "gold",
    "explosive",
    "regenerable",
    "gravitational"
  ]),
  color: z.enum([
    "white",
    "orange",
    "cyan",
    "green",
    "red",
    "blue",
    "pink",
    "yellow",
    "silver",
    "gold",
    "purple"
  ]),
  hp: z.number().optional(),
  points: z.number().int().optional(),
  powerUp: z.enum(["E", "L", "C", "S", "M", "B", "P"]).optional()
});

export const ArkanoidLevelDefinitionSchema = z.object({
  id: z.number().int().min(1).max(33),
  kind: z.enum(["standard", "boss"]),
  rows: z.number().int().positive(),
  columns: z.number().int().positive(),
  cells: z.array(ArkanoidBrickCellSchema),
  themeId: z.string().min(1)
});

export class LevelCatalog {
  private static levelsMap: Map<number, ArkanoidLevelDefinition> | null = null;

  public static initialize(): void {
    if (this.levelsMap) return;

    const catalog = new Map<number, ArkanoidLevelDefinition>();
    for (let i = 1; i <= 33; i++) {
      const formattedNum = String(i).padStart(2, "0");
      /* eslint-disable @typescript-eslint/no-require-imports */
      const rawData = require(`../config/levels/level-${formattedNum}.json`);
      const parsed = ArkanoidLevelDefinitionSchema.parse(rawData) as ArkanoidLevelDefinition;
      this.validateLevel(parsed);
      catalog.set(parsed.id, parsed);
    }

    this.levelsMap = catalog;
  }

  public static getLevel(id: number): ArkanoidLevelDefinition {
    this.initialize();
    const level = this.levelsMap!.get(id);
    if (!level) {
      throw new Error(`[LevelCatalog] Level ${id} not found in catalog.`);
    }
    return level;
  }

  public static validateLevel(level: ArkanoidLevelDefinition): void {
    if (level.id < 1 || level.id > 33) {
      throw new Error(`[LevelCatalog] Invalid level ID ${level.id}. Must be 1..33.`);
    }
    if (level.id === 33 && level.kind !== "boss") {
      throw new Error(`[LevelCatalog] Level 33 must be marked as kind "boss".`);
    }
    if (level.kind === "boss" && level.id !== 33) {
      throw new Error(`[LevelCatalog] Level ${level.id} cannot be kind "boss" unless it is level 33.`);
    }

    for (const cell of level.cells) {
      if (cell.row < 0 || cell.row >= level.rows) {
        throw new Error(`[LevelCatalog] Cell row out of bounds: ${cell.row} in level ${level.id}`);
      }
      if (cell.col < 0 || cell.col >= level.columns) {
        throw new Error(`[LevelCatalog] Cell col out of bounds: ${cell.col} in level ${level.id}`);
      }
    }
  }

  public static getAllLevels(): readonly ArkanoidLevelDefinition[] {
    this.initialize();
    return Array.from(this.levelsMap!.values());
  }
}
