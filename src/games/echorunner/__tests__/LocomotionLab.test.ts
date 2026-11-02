import locomotionLabLevelData from "../levels/locomotion-lab.json";

describe("Locomotion Lab level contract", () => {
  it("provides a valid deterministic single-segment course", () => {
    expect(locomotionLabLevelData.grammar).toEqual(["locomotion-lab"]);
    expect(locomotionLabLevelData.templates).toHaveLength(1);
    const [segment] = locomotionLabLevelData.templates;
    expect(segment.bounds).toEqual({ width: 24, height: 14 });
    expect(segment.tileData).toHaveLength(segment.bounds.height);
    expect(segment.tileData.every(row => row.length === segment.bounds.width)).toBe(true);
  });

  it("includes normal, ice, bounce, one-way and slope surfaces", () => {
    const tileIds = new Set(locomotionLabLevelData.templates[0].tileData.flat());
    for (const tileId of [1, 2, 3, 5, 6]) {
      expect(tileIds.has(tileId)).toBe(true);
    }
  });

  it("includes a constrained slide corridor and a moving support", () => {
    const platforms = locomotionLabLevelData.templates[0].spawnPoints.filter(
      point => point.type === "moving_platform"
    );
    expect(platforms).toHaveLength(2);
    expect(platforms.some(point => point.args?.ampX === 0 && point.args?.freq === 0 && point.y === 11.25 && point.x === 15.5)).toBe(true);
    expect(platforms.some(point => point.args?.ampX === 80 && point.args?.freq === 0.35 && point.y === 10.5)).toBe(true);
  });
});
