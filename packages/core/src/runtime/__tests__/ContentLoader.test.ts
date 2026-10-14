import { ContentLoader, ContentValidationError } from "../ContentLoader";
import { z } from "zod";

const TowerDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().positive(),
  range: z.number().positive(),
  damage: z.number().positive(),
  fireRate: z.number().positive(),
  projectileSpeed: z.number().positive()
});

const CreepDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.number().positive(),
  speed: z.number().positive(),
  reward: z.number().nonnegative()
});

describe("ContentLoader", () => {
  it("should successfully parse and return valid content", () => {
    const rawTower = {
      id: "basic",
      name: "Basic Tower",
      cost: 50,
      range: 120,
      damage: 15,
      fireRate: 1.0,
      projectileSpeed: 400
    };

    const parsed = ContentLoader.load(TowerDefinitionSchema, rawTower, "tower-basic");
    expect(parsed.id).toBe("basic");
    expect(parsed.cost).toBe(50);
  });

  it("should throw ContentValidationError with exact field path on validation failure", () => {
    const invalidCreep = {
      id: "grunt",
      name: "Grunt",
      hp: -10,
      speed: 60,
      reward: 10
    };

    expect(() => {
      ContentLoader.load(CreepDefinitionSchema, invalidCreep, "creep-grunt");
    }).toThrow(ContentValidationError);

    try {
      ContentLoader.load(CreepDefinitionSchema, invalidCreep, "creep-grunt");
    } catch (err: any) {
      expect(err).toBeInstanceOf(ContentValidationError);
      expect(err.message).toContain("hp");
    }
  });

  it("should load external JSON files from content/tower-defense/", () => {
    const path = require("path");
    const rootDir = path.resolve(__dirname, "../../../../../");
    const classicLayout = require(path.join(rootDir, "content/tower-defense/levels/classic.json"));
    const towers = require(path.join(rootDir, "content/tower-defense/towers.json"));
    const creeps = require(path.join(rootDir, "content/tower-defense/creeps.json"));

    const parsedLayout = ContentLoader.load(z.array(z.string()), classicLayout, "classic-level");
    expect(parsedLayout).toHaveLength(12);

    const parsedTowers = ContentLoader.load(z.array(TowerDefinitionSchema), towers, "towers-catalog");
    expect(parsedTowers.length).toBeGreaterThan(0);

    const parsedCreeps = ContentLoader.load(z.array(CreepDefinitionSchema), creeps, "creeps-catalog");
    expect(parsedCreeps.length).toBeGreaterThan(0);
  });
});
