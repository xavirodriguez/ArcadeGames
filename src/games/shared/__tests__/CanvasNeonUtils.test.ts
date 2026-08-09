import { getComboReaction } from "../rendering/CanvasNeonUtils";

describe("CanvasNeonUtils - getComboReaction", () => {
  it("should return correct default colors and trail lengths for multiplier x1", () => {
    const reaction = getComboReaction(1);
    expect(reaction.trailLength).toBe(8);
    expect(reaction.trailColor).toBe("rgba(0, 255, 255, 0.4)");
    expect(reaction.mainColor).toBe("#00FFFF");
  });

  it("should shift color and extend trail length for multiplier x2", () => {
    const reaction = getComboReaction(2);
    expect(reaction.trailLength).toBe(16);
    expect(reaction.trailColor).toBe("rgba(255, 0, 255, 0.5)");
    expect(reaction.mainColor).toBe("#FF00FF");
  });

  it("should shift to gold color and maximum trail length for multiplier x3 and above", () => {
    const reaction = getComboReaction(3);
    expect(reaction.trailLength).toBe(24);
    expect(reaction.trailColor).toBe("rgba(255, 215, 0, 0.6)");
    expect(reaction.mainColor).toBe("#FFD700");

    const reaction5 = getComboReaction(5);
    expect(reaction5.trailLength).toBe(24);
    expect(reaction5.trailColor).toBe("rgba(255, 215, 0, 0.6)");
    expect(reaction5.mainColor).toBe("#FFD700");
  });
});
