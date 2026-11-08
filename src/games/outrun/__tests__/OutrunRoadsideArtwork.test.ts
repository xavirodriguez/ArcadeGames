import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RaceStateComponent, RoadData, RoadSegmentSprite } from "../types/OutrunTypes";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import { createVisualPaletteResource, lerpColor } from "../utils/palette";
import { fogIntensity } from "../rendering/OutrunFog";
import {
  resolveOutrunRoadsideArtworkStyle,
  resolveOutrunRoadsideKind,
  shouldDrawOutrunRoadsideSprite
} from "../rendering/OutrunRoadsideArtwork";
import {
  resolveOutrunBitmapSpriteBounds,
  resolvePineTierGeometry,
  resolveRockGeometry,
  resolvePalmFrondGeometry,
  resolveLighthouseGeometry,
  resolveCactusLineSegments,
  resolveDryShrubLineSegments,
  resolveWindTowerGeometry,
  resolveChevronGeometry
} from "../rendering/OutrunVisualHelpers";

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
      lerpColor(visual.tokens.foliage, visual.tokens.horizon, fogIntensity(1))
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
        fogIntensity(0.9)
      ));
    }
  });

  describe("Roadside geometric helper resolvers", () => {
    it("computes bitmap sprite destination bounds and respects clipY", () => {
      const spec = { assetKey: "test", aspectRatio: 1.5 };
      const bounds = resolveOutrunBitmapSpriteBounds(spec, 100, 200, 50, 250);
      expect(bounds).not.toBeNull();
      expect(bounds?.w).toBe(40);
      expect(bounds?.h).toBe(60);
      expect(bounds?.dx).toBe(80);
      expect(bounds?.dy).toBe(140);

      // Occluded below clip line
      expect(resolveOutrunBitmapSpriteBounds(spec, 100, 260, 50, 250)).toBeNull();
      // Too small (< 2 width)
      expect(resolveOutrunBitmapSpriteBounds(spec, 100, 200, 2, 250)).toBeNull();
    });

    it("generates 3 pine tiers with light and dark polygons", () => {
      const tiers = resolvePineTierGeometry(150, 300, 100);
      expect(tiers).toHaveLength(3);
      for (const tier of tiers) {
        expect(tier.lightPolygon).toHaveLength(3);
        expect(tier.darkPolygon).toHaveLength(3);
        expect(tier.lightPolygon[0].x).toBe(150);
        expect(tier.darkPolygon[0].x).toBe(150);
      }
    });

    it("generates rock base and shade polygons", () => {
      const rock = resolveRockGeometry(200, 400, 80, 50);
      expect(rock.basePolygon).toHaveLength(6);
      expect(rock.shadePolygon).toHaveLength(5);
      expect(rock.basePolygon[0]).toEqual({ x: 160, y: 400 });
    });

    it("generates palm trunk bezier control points and 5 leaf fronds", () => {
      const palm = resolvePalmFrondGeometry(100, 200, 120);
      expect(palm.fronds).toHaveLength(5);
      expect(palm.trunkCtrlX).toBeLessThan(100);
      expect(palm.crownTopX).toBeGreaterThan(100);
      expect(palm.fronds[0].polygon).toHaveLength(3);
    });

    it("generates lighthouse tower polygon and 3 accent bands", () => {
      const lighthouse = resolveLighthouseGeometry(100, 300, 60, 150);
      expect(lighthouse.towerPolygon).toHaveLength(4);
      expect(lighthouse.bands).toHaveLength(3);
      for (const band of lighthouse.bands) {
        expect(band).toHaveLength(4);
      }
    });

    it("generates cactus trunk line segments and highlight stripe", () => {
      const cactus = resolveCactusLineSegments(100, 200, 80);
      expect(cactus.trunkSegments).toHaveLength(5);
      expect(cactus.stripeSegment.x1).toBe(cactus.stripeSegment.x2);
    });

    it("generates dry shrub main and highlight branches", () => {
      const shrub = resolveDryShrubLineSegments(100, 200, 60);
      expect(shrub.mainBranches).toHaveLength(3);
      expect(shrub.highlightBranches).toHaveLength(2);
    });

    it("generates wind tower mast lines, rotor hub and 3 blade angles", () => {
      const tower = resolveWindTowerGeometry(120, 250, 100);
      expect(tower.towerLines).toHaveLength(2);
      expect(tower.bladeAngles).toEqual([0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]);
      expect(tower.rotorY).toBeLessThan(tower.topY);
    });

    it("generates chevron triangle polygon coordinates", () => {
      const chevron = resolveChevronGeometry(100, 200, 50);
      expect(chevron).toHaveLength(3);
      expect(chevron[0].y).toBe(200);
      expect(chevron[1].x).toBeGreaterThan(100);
      expect(chevron[2].y).toBeLessThan(200);
    });
  });
});
