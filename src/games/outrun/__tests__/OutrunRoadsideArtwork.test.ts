import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData, RoadSegmentSprite } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { createVisualPaletteResource, lerpColor } from "../utils/palette";
import {
  resolveOutrunRoadsideArtworkStyle,
  resolveOutrunRoadsideKind,
  shouldDrawOutrunRoadsideSprite
} from "../rendering/OutrunRoadsideArtwork";

const roadData: RoadData = {
  trackLength: 600,
  segments: [
    { index: 0, length: 200, curve: 0, hill: 0 },
    { index: 1, length: 200, curve: 0, hill: 0 },
    { index: 2, length: 200, curve: 0, hill: 0 }
  ]
};

const makeState = (): RaceStateComponent => ({
  type: "RaceState", playerZ: 0, playerX: 0, speed: 0, lapTime: 0,
  isGameOver: false, position: 1, currentSegment: 0
});

function makeVisual(overrides: Partial<OutrunVisualPaletteResource> = {}): OutrunVisualPaletteResource {
  return {
    ...createVisualPaletteResource(makeState(), roadData, DEFAULT_OUTRUN_CONFIG),
    ...overrides
  };
}

function makeSprite(kind: string): RoadSegmentSprite {
  return { kind, offset: 1.5, side: 1 };
}

describe("Out Run roadside artwork", () => {
  it("maps legacy object kinds to the new biome silhouettes", () => {
    expect(resolveOutrunRoadsideKind("cypress")).toBe("pine");
    expect(resolveOutrunRoadsideKind("wall")).toBe("rock");
    expect(resolveOutrunRoadsideKind("lamp")).toBe("lighthouse");
    expect(resolveOutrunRoadsideKind("shrub")).toBe("dry_shrub");
    expect(resolveOutrunRoadsideKind("palm")).toBe("palm");
    expect(resolveOutrunRoadsideKind("cactus")).toBe("cactus");
  });

  it("scales trees from projected half-road width using the art-bible ratio", () => {
    const visual = makeVisual();
    const style = resolveOutrunRoadsideArtworkStyle(
      makeSprite("tree"), visual, 0, 100, false
    );

    expect(style.height).toBe(100 * visual.tuning.tree.heightToRoadHalfWidth);
    expect(style.kind).toBe("tree");
  });

  it("applies more horizon haze to distant objects deterministically", () => {
    const visual = makeVisual();
    const near = resolveOutrunRoadsideArtworkStyle(
      makeSprite("pine"), visual, 0, 120, false
    );
    const far = resolveOutrunRoadsideArtworkStyle(
      makeSprite("pine"), visual, 1, 120, false
    );

    expect(near.foliageColor).toBe(visual.tokens.foliage);
    expect(far.foliageColor).toBe(
      lerpColor(visual.tokens.foliage, visual.tokens.horizon, visual.tuning.decor.distantObjectHazeMix)
    );
    expect(resolveOutrunRoadsideArtworkStyle(
      makeSprite("pine"), visual, 1, 120, false
    )).toEqual(far);
  });

  it("thins natural detail in low quality but preserves signs and chevrons", () => {
    expect(shouldDrawOutrunRoadsideSprite("palm", 4, "low")).toBe(true);
    expect(shouldDrawOutrunRoadsideSprite("palm", 8, "low")).toBe(false);
    expect(shouldDrawOutrunRoadsideSprite("palm", 8, "high")).toBe(true);
    expect(shouldDrawOutrunRoadsideSprite("billboard", 8, "low")).toBe(true);
    expect(shouldDrawOutrunRoadsideSprite("chevron", 8, "low")).toBe(true);
  });

  it("keeps all supported roadside styles finite and visible at distant scales", () => {
    const visual = makeVisual();
    const kinds = [
      "tree", "pine", "rock", "palm", "lighthouse", "cactus", "dry_shrub", "wind_tower"
    ];
    for (const kind of kinds) {
      const style = resolveOutrunRoadsideArtworkStyle(
        makeSprite(kind), visual, 0.9, 0, true
      );
      expect(style.height).toBeGreaterThanOrEqual(2);
      expect(style.width).toBeGreaterThan(0);
      expect(style.lightColor).toBe(lerpColor(
        visual.tokens.sun,
        visual.tokens.horizon,
        0.9 * visual.tuning.decor.distantObjectHazeMix
      ));
    }
  });
});
