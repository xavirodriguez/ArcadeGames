import { validateSegmentTemplates, SegmentTemplate } from "../src/systems/SegmentGenerator";
import platformerLevel01 from "../../../src/games/platformer/levels/level-01.json";
import echoRunnerLevel01 from "../../../src/games/echorunner/levels/level-01.json";

describe("SegmentGenerator Validation Tests", () => {
  it("should validate Platformer level-01.json without errors", () => {
    const templates = platformerLevel01.templates as SegmentTemplate[];
    const grammar = platformerLevel01.grammar as string[];

    const errors = validateSegmentTemplates(templates, grammar);
    expect(errors).toEqual([]);
  });

  it("should validate EchoRunner level-01.json without errors", () => {
    const templates = echoRunnerLevel01.templates as SegmentTemplate[];
    const grammar = echoRunnerLevel01.grammar as string[];

    const errors = validateSegmentTemplates(templates, grammar);
    expect(errors).toEqual([]);
  });

  it("should report errors for invalid templates and mismatched grammar tags", () => {
    const invalidTemplates: SegmentTemplate[] = [
      {
        id: "",
        entry: { x: 0, y: 0 },
        exit: { x: 10, y: 0 },
        bounds: { width: 10, height: 2 },
        difficulty: 1,
        tags: ["intro"],
        tileData: [
          [1, 1, 1] // length 3, expected 10; row count 1, expected 2
        ],
        spawnPoints: []
      }
    ];

    const grammar = ["intro", "nonexistent_tag"];

    const errors = validateSegmentTemplates(invalidTemplates, grammar);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("missing a valid 'id'"))).toBe(true);
    expect(errors.some((e) => e.includes("row count"))).toBe(true);
    expect(errors.some((e) => e.includes("row 0 length"))).toBe(true);
    expect(errors.some((e) => e.includes("Grammar tag 'nonexistent_tag'"))).toBe(true);
  });
});
