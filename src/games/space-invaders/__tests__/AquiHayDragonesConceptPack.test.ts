import { World, THEME_RESOURCE_KEY, resolveThemeColor } from "@tiny-aster/core";
import {
  aquiHayDragonesConceptPack,
  AQUI_HAY_DRAGONES_PALETTE,
  nauticalChartConceptPack,
} from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import { availableConceptPacks } from "../../../theme/conceptPacks";
import { resolveInvaderColor, resolveInvaderRenderSetup } from "../rendering/SpaceInvadersVisualUtils";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

describe("Aquí hay dragones Concept Pack (nautical-chart)", () => {
  it("registers under both aqui_hay_dragones and nautical-chart ids", () => {
    expect(availableConceptPacks["aqui_hay_dragones"]).toBe(aquiHayDragonesConceptPack);
    expect(availableConceptPacks["nautical-chart"]).toBe(aquiHayDragonesConceptPack);
    expect(nauticalChartConceptPack).toBe(aquiHayDragonesConceptPack);
  });

  it("registers concept pack as Theme resource and resolves role colors", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, aquiHayDragonesConceptPack);

    expect(resolveThemeColor(world, "player")).toBe(AQUI_HAY_DRAGONES_PALETTE.ink);
    expect(resolveThemeColor(world, "invader")).toBe(AQUI_HAY_DRAGONES_PALETTE.red);
    expect(resolveThemeColor(world, "invader_commander")).toBe(AQUI_HAY_DRAGONES_PALETTE.red);
    expect(resolveThemeColor(world, "ufo")).toBe(AQUI_HAY_DRAGONES_PALETTE.ink);
    expect(resolveThemeColor(world, "shield")).toBe(AQUI_HAY_DRAGONES_PALETTE.land);
    expect(resolveThemeColor(world, "player-bullet")).toBe(AQUI_HAY_DRAGONES_PALETTE.ink);
    expect(resolveThemeColor(world, "enemy-bullet")).toBe(AQUI_HAY_DRAGONES_PALETTE.red);
    expect(resolveThemeColor(world, "parchment")).toBe(AQUI_HAY_DRAGONES_PALETTE.parchment);
    expect(resolveThemeColor(world, "teal")).toBe(AQUI_HAY_DRAGONES_PALETTE.teal);
  });

  it("exposes customGeometries for Space Invaders roles", () => {
    const customGeom = aquiHayDragonesConceptPack.visualTheme?.shapeTokens?.customGeometries;
    expect(customGeom).toBeDefined();
    expect(customGeom?.["ufo"]).toBeDefined();
    expect(customGeom?.["invader_scout"]).toBeDefined();
    expect(customGeom?.["invader_commander"]).toBeDefined();
    expect(customGeom?.["invader"]).toBeDefined();
    expect(customGeom?.["enemy_bullet"]).toBeDefined();

    expect(customGeom?.["ufo"]?.subPaths.length).toBeGreaterThan(0);
    expect(aquiHayDragonesConceptPack.visualTheme?.shapeTokens?.playerGeometry).toBeDefined();
    expect(aquiHayDragonesConceptPack.visualTheme?.shapeTokens?.projectileGeometry).toBeDefined();
  });

  it("has valid concept pack metadata and lore", () => {
    expect(aquiHayDragonesConceptPack.conceptPack?.id).toBe("aqui_hay_dragones");
    expect(aquiHayDragonesConceptPack.conceptPack?.name).toBe("Aquí hay dragones");
    expect(aquiHayDragonesConceptPack.conceptPack?.roleLabels?.["ufo"]).toBe("Ballena");
    expect(aquiHayDragonesConceptPack.conceptPack?.roleLabels?.["invader_commander"]).toBe("Kraken");
    expect(aquiHayDragonesConceptPack.lore?.title).toBe("Aquí hay dragones");
    expect(aquiHayDragonesConceptPack.visualTheme?.palette?.background).toBe(
      AQUI_HAY_DRAGONES_PALETTE.parchment
    );
  });

  it("uses parchment background and disables starfield/glow for chart look", () => {
    expect(aquiHayDragonesConceptPack.vfxProfile?.backgroundLayers).toContain("parchment_chart");
    expect(aquiHayDragonesConceptPack.vfxProfile?.starDensity).toBe(0);
    expect(aquiHayDragonesConceptPack.vfxProfile?.ambientGlow).toBe(0);
  });

  it("resolves invader colors and custom geometries through SpaceInvadersVisualUtils", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, aquiHayDragonesConceptPack);

    const ufoEntity = world.createEntity();
    world.addComponent(ufoEntity, {
      type: "Render",
      shape: "ufo",
      size: 30,
      color: "#FFFFFF",
      visible: true,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });
    world.addComponent(ufoEntity, { type: "EnemyTag", blueprintId: "ufo", level: 1 });

    const ufoColorState = resolveInvaderColor(
      world,
      world.getComponent(ufoEntity, "Render"),
      undefined,
      world.getComponent(ufoEntity, "EnemyTag")
    );
    expect(ufoColorState.baseColor).toBe(AQUI_HAY_DRAGONES_PALETTE.ink);

    const ufoSetup = resolveInvaderRenderSetup(world, ufoEntity);
    expect(ufoSetup).not.toBeNull();
    expect(ufoSetup?.customGeom).toBe(
      aquiHayDragonesConceptPack.visualTheme?.shapeTokens?.customGeometries?.["ufo"]
    );

    const commanderEntity = world.createEntity();
    world.addComponent(commanderEntity, {
      type: "Render",
      shape: "invader",
      size: 20,
      color: "#FFFFFF",
      visible: true,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });
    world.addComponent(commanderEntity, { type: "Invader", row: 0, col: 0, points: 30 });
    world.addComponent(commanderEntity, {
      type: "EnemyTag",
      blueprintId: "invader",
      variant: "commander",
      level: 1,
    });

    const commanderSetup = resolveInvaderRenderSetup(world, commanderEntity);
    expect(commanderSetup).not.toBeNull();
    expect(commanderSetup?.baseColor).toBe(AQUI_HAY_DRAGONES_PALETTE.red);
    expect(commanderSetup?.customGeom).toBe(
      aquiHayDragonesConceptPack.visualTheme?.shapeTokens?.customGeometries?.["invader_commander"]
    );
  });
});
