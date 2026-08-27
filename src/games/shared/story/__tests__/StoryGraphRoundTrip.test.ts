import { StoryGraphValidator, StoryGraph } from "@tiny-aster/core";
import { caveAdventureGraph } from "../TheCaveAdventure";
import { BlindStationGraph } from "../BlindStation";

describe("StoryGraph Data-Driven Serialization & Visual Editor Round-Trip", () => {
  it("serializes and deserializes caveAdventureGraph cleanly without structural loss or validation errors", () => {
    // 1. Serialize StoryGraph object directly to JSON string (simulating visual editor export)
    const serializedJson = JSON.stringify(caveAdventureGraph, null, 2);
    expect(typeof serializedJson).toBe("string");

    // 2. Deserialize JSON back to pure StoryGraph object
    const deserializedGraph: StoryGraph = JSON.parse(serializedJson);

    // 3. Verify structural equality
    expect(deserializedGraph).toEqual(caveAdventureGraph);

    // 4. Validate deserialized graph using StoryGraphValidator
    const validationResult = StoryGraphValidator.validate(deserializedGraph, {
      declaredFlags: ["has_torch"],
    });

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toEqual([]);
  });

  it("serializes and deserializes BlindStationGraph cleanly without structural loss or validation errors", () => {
    const serializedJson = JSON.stringify(BlindStationGraph, null, 2);
    const deserializedGraph: StoryGraph = JSON.parse(serializedJson);

    expect(deserializedGraph).toEqual(BlindStationGraph);

    const validationResult = StoryGraphValidator.validate(deserializedGraph, {
      declaredFlags: [
        "visitedReactor",
        "visitedInfirmary",
        "visitedComms",
        "investigationComplete",
        "reactorActive",
        "foundVega",
        "rescueIncoming",
        "sawCryoRecord",
        "sawSecretRecording",
        "powerInfirmary",
        "powerComms",
        "powerLifeSupport",
        "secretEndingUnlocked",
      ],
      declaredVariables: ["evidenceCount", "trustARES", "trustVega", "oxygen"],
    });

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toEqual([]);
  });
});
