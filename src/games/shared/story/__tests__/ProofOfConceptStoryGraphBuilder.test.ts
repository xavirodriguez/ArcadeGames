import { StoryGraphValidator } from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "../ProofOfConceptStoryGraph";
import { builtProofOfConceptStoryGraph } from "../ProofOfConceptStoryGraphBuilder";

describe("ProofOfConceptStoryGraphBuilder (Pilot Migration)", () => {
  it("should produce a graph structurally identical (toEqual) to the manual proofOfConceptStoryGraph literal", () => {
    expect(builtProofOfConceptStoryGraph).toEqual(proofOfConceptStoryGraph);
  });

  it("should be validated by StoryGraphValidator without any errors or warnings", () => {
    const result = StoryGraphValidator.validate(builtProofOfConceptStoryGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
