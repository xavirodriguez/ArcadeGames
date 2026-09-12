import { z } from "zod";
import level01 from "../config/levels/level-01.json";
import level02 from "../config/levels/level-02.json";
import level03 from "../config/levels/level-03.json";
import level04 from "../config/levels/level-04.json";
import level05 from "../config/levels/level-05.json";
import level06 from "../config/levels/level-06.json";
import level07 from "../config/levels/level-07.json";
import level08 from "../config/levels/level-08.json";
import level09 from "../config/levels/level-09.json";
import level10 from "../config/levels/level-10.json";
import level11 from "../config/levels/level-11.json";
import level12 from "../config/levels/level-12.json";
import level13 from "../config/levels/level-13.json";
import level14 from "../config/levels/level-14.json";
import level15 from "../config/levels/level-15.json";
import level16 from "../config/levels/level-16.json";
import level17 from "../config/levels/level-17.json";
import level18 from "../config/levels/level-18.json";
import level19 from "../config/levels/level-19.json";
import level20 from "../config/levels/level-20.json";
import level21 from "../config/levels/level-21.json";
import level22 from "../config/levels/level-22.json";
import level23 from "../config/levels/level-23.json";
import level24 from "../config/levels/level-24.json";
import level25 from "../config/levels/level-25.json";
import level26 from "../config/levels/level-26.json";
import level27 from "../config/levels/level-27.json";
import level28 from "../config/levels/level-28.json";
import level29 from "../config/levels/level-29.json";
import level30 from "../config/levels/level-30.json";
import level31 from "../config/levels/level-31.json";
import level32 from "../config/levels/level-32.json";
import level33 from "../config/levels/level-33.json";

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

const RAW_LEVELS: unknown[] = [
  level01, level02, level03, level04, level05,
  level06, level07, level08, level09, level10,
  level11, level12, level13, level14, level15,
  level16, level17, level18, level19, level20,
  level21, level22, level23, level24, level25,
  level26, level27, level28, level29, level30,
  level31, level32, level33
];

export class LevelCatalog {
  private static levelsMap: Map<number, ArkanoidLevelDefinition> | null = null;

  public static initialize(): void {
    if (this.levelsMap) return;

    const catalog = new Map<number, ArkanoidLevelDefinition>();
    for (const rawData of RAW_LEVELS) {
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
