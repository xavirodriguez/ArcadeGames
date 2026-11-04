import campaignData from "../levels/locomotion-campaign.json";
import {
  PHYSICS_MATERIAL_PRESETS,
  SegmentGenerator,
  validateSegmentTemplates,
  type SegmentTemplate
} from "@tiny-aster/core";
import { DEFAULT_PLATFORMER_TILE_DEFINITIONS } from "../../shared/PlatformerArcadeGame";

const templates = campaignData.templates as never as SegmentTemplate[];
const momentum = campaignData.templates.find((template) => template.id === "momentum-01")!;
const surface = campaignData.templates.find((template) => template.id === "surface-mastery-01")!;

describe("Platformer locomotion campaign — PR2", () => {
  it("keeps all templates structurally valid and covers every grammar step", () => {
    expect(validateSegmentTemplates(templates, campaignData.grammar)).toEqual([]);
  });

  it("authors a genuine momentum route: run-up, ascending slope, raised landing and hazard", () => {
    const rows = momentum.tileData;
    expect(rows[10][8]).toBe(6);
    expect(rows[9][9]).toBe(6);
    expect(rows[8][10]).toBe(6);
    expect(rows[8].slice(11, 14)).toEqual([1, 1, 1]);
    expect(rows[8].slice(17, 20)).toEqual([1, 1, 1]);

    // The three-tile launch gap is empty through both ground layers and the raised deck.
    for (const y of [8, 9, 10, 11, 12]) {
      expect(rows[y].slice(14, 17)).toEqual([0, 0, 0]);
    }
    expect(rows[11][20]).toBe(4);
    expect(rows[11].slice(21, 24)).toEqual([1, 1, 1]);
  });

  it("requires ice-to-normal control, elastic rebound and a one-way landing", () => {
    const rows = surface.tileData;
    expect(rows[11].slice(3, 9)).toEqual([2, 2, 2, 2, 2, 2]);
    expect(rows[11].slice(9, 14)).toEqual([1, 1, 1, 1, 1]);
    expect(rows[11][14]).toBe(0);
    expect(rows[11][15]).toBe(7);
    expect(DEFAULT_PLATFORMER_TILE_DEFINITIONS[7].materialId).toBe("elastic");
    expect(PHYSICS_MATERIAL_PRESETS.elastic.restitution).toBe(0.82);

    expect(rows[11].slice(16, 20)).toEqual([5, 5, 5, 5]);
    for (const y of [12]) {
      expect(rows[y].slice(16, 20)).toEqual([0, 0, 0, 0]);
    }
    expect(rows[11].slice(21, 24)).toEqual([1, 1, 1]);
  });

  it.each([1, 42, 41873])("stitches the campaign without broken seams for seed %i", (seed) => {
    const plan = SegmentGenerator.generatePlan(templates, campaignData.grammar, seed);
    expect(plan.segments.map((segment) => segment.templateId)).toEqual([
      "momentum-01",
      "surface-mastery-01",
      "traversal-challenge-01"
    ]);

    for (let index = 1; index < plan.segments.length; index++) {
      const previous = plan.segments[index - 1];
      const current = plan.segments[index];
      const previousExitX = previous.offsetX + previous.exit.x;
      const previousExitY = previous.offsetY + previous.exit.y;
      const currentEntryX = current.offsetX + current.entry.x;
      const currentEntryY = current.offsetY + current.entry.y;

      expect(currentEntryX).toBe(previousExitX);
      expect(currentEntryY).toBe(previousExitY);
      expect(plan.globalTilemap[currentEntryY][currentEntryX]).toBe(1);
    }
  });
});
