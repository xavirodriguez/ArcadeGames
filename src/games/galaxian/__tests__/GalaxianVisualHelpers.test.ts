import { World, TransformComponent } from "@tiny-aster/core";
import { GalaxianComponentRegistry } from "../types/GalaxianTypes";
import { GalaxianConfigSchema, GalaxianConfig } from "../types/GalaxianConfigSchema";
import { ConfigService } from "@tiny-aster/core";
import galaxianConfigRaw from "../config/galaxian.json";
import {
  getGalaxianPalette,
  resolvePaperSkyVisualContext,
  resolveOrigamiBirdColors,
  resolveGalaxianEnemyVisualContext,
} from "../rendering/GalaxianVisualHelpers";
import { ORIGAMI_BIRD_POLYGONS, PLAYER_SHIP_POLYGONS } from "../rendering/GalaxianVisualTokens";

describe("GalaxianVisualHelpers & GalaxianVisualTokens", () => {
  let world: World<GalaxianComponentRegistry>;
  let config: GalaxianConfig;

  beforeEach(() => {
    world = new World<GalaxianComponentRegistry>();
    config = ConfigService.load<GalaxianConfig>(
      "galaxian",
      GalaxianConfigSchema,
      galaxianConfigRaw
    );
    world.setResource("GameConfig", config);
  });

  it("should resolve normal vs colorblind palette accurately", () => {
    const defaultPalette = getGalaxianPalette(world);
    expect(defaultPalette).toBeDefined();
    expect(defaultPalette?.paperNight).toBe(config.visual.palette.paperNight);

    config.visual.colorblindMode = true;
    const colorblindPalette = getGalaxianPalette(world);
    expect(colorblindPalette).toBeDefined();
    expect(colorblindPalette?.paperNight).toBe(config.visual.paletteColorblind.paperNight);
  });

  it("should resolve paper sky visual context with correct stars and layers", () => {
    const sky = resolvePaperSkyVisualContext(world);
    expect(sky).not.toBeNull();
    if (!sky) return;

    expect(sky.w).toBe(config.worldWidth);
    expect(sky.h).toBe(config.worldHeight);
    expect(sky.palette).toEqual(config.visual.palette);
    expect(sky.stars.length).toBe(55); // high quality default
    expect(sky.layers.length).toBe(3);

    // Verify low quality configuration
    config.visual.quality = "low";
    const skyLow = resolvePaperSkyVisualContext(world);
    expect(skyLow?.stars.length).toBe(25);
    expect(skyLow?.layers.length).toBe(1);
  });

  it("should resolve origami bird colors for all enemy types and damage states", () => {
    const palette = config.visual.palette;

    const droneColors = resolveOrigamiBirdColors("drone", palette);
    expect(droneColors.light).toBe(palette.droneLight);
    expect(droneColors.mid).toBe(palette.droneMid);
    expect(droneColors.dark).toBe(palette.droneDark);

    const emissaryColors = resolveOrigamiBirdColors("emissary", palette);
    expect(emissaryColors.light).toBe(palette.emissaryLight);
    expect(emissaryColors.mid).toBe(palette.emissaryMid);
    expect(emissaryColors.dark).toBe(palette.emissaryDark);

    const escortColors = resolveOrigamiBirdColors("escort", palette);
    expect(escortColors.light).toBe(palette.escortLight);
    expect(escortColors.mid).toBe(palette.escortMid);
    expect(escortColors.dark).toBe(palette.escortDark);

    const flagshipUndamaged = resolveOrigamiBirdColors("flagship", palette, false);
    expect(flagshipUndamaged.light).toBe(palette.flagshipLight);
    expect(flagshipUndamaged.mid).toBe(palette.flagshipMid);

    const flagshipDamaged = resolveOrigamiBirdColors("flagship", palette, true);
    expect(flagshipDamaged.light).toBe(palette.escortLight);
    expect(flagshipDamaged.mid).toBe(palette.escortMid);
  });

  it("should resolve enemy visual context with transforms and trail", () => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "GalaxianEnemy",
      enemyType: "flagship",
      row: 0,
      col: 0,
      slotId: "0_0",
      pointsFormation: 100,
      pointsDive: 200,
      bonusEscorted: 50,
      state: "diving",
      windupTimer: 0,
      shotsFiredInDive: 0,
      hitsRemaining: 1,
    });
    const transform: TransformComponent = {
      type: "Transform",
      x: 120,
      y: 200,
      rotation: 0.5,
      scaleX: 1,
      scaleY: 1,
      worldX: 120,
      worldY: 200,
      worldRotation: 0.5,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    };
    world.addComponent(entity, transform);
    world.addComponent(entity, {
      type: "VisualPose",
      rotation: 0.8,
      scaleX: 1.1,
      scaleY: 1.2,
      visualOffsetX: 0,
      visualOffsetY: 0,
      previousX: 120,
      previousY: 200,
      hasPreviousPosition: true,
    });
    world.addComponent(entity, {
      type: "DiveTrail",
      maxHistory: 20,
      history: [
        { x: 100, y: 180 },
        { x: 120, y: 200 },
      ],
    });

    const ctx = resolveGalaxianEnemyVisualContext(world, entity);
    expect(ctx).not.toBeNull();
    if (!ctx) return;

    expect(ctx.baseScale).toBe(1.25); // flagship baseScale
    expect(ctx.isDamaged).toBe(true);
    expect(ctx.deltaRotation).toBeCloseTo(0.3);
    expect(ctx.scaleX).toBe(1.1);
    expect(ctx.scaleY).toBe(1.2);
    expect(ctx.trailPoints).toHaveLength(2);
    expect(ctx.trailPoints?.[0]).toEqual({ x: -20, y: -20 });
    expect(ctx.trailPoints?.[1]).toEqual({ x: 0, y: 0 });
    expect(ctx.showWindupReticle).toBe(false);
  });

  it("should provide well-formed polygon token structures", () => {
    expect(ORIGAMI_BIRD_POLYGONS.leftBody.length).toBeGreaterThanOrEqual(3);
    expect(ORIGAMI_BIRD_POLYGONS.head.length).toBe(3);
    expect(ORIGAMI_BIRD_POLYGONS.flagshipCrest.length).toBe(4);
    expect(PLAYER_SHIP_POLYGONS.leftWing.length).toBe(3);
    expect(PLAYER_SHIP_POLYGONS.tail.length).toBe(4);
  });
});
