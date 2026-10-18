import { World, THEME_RESOURCE_KEY, resolveThemeColor } from "@tiny-aster/core";
import { siegeShieldWallConceptPack } from "../../../theme/conceptPacks/siegeShieldWallConceptPack";
import { resolveInvaderColor, resolveInvaderRenderSetup } from "../rendering/SpaceInvadersVisualUtils";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

describe("Siege Shield Wall Concept Pack ('Asedio de la Muralla de Escudos')", () => {
  it("registers concept pack as 'Theme' resource in World and resolves role colors correctly", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, siegeShieldWallConceptPack);

    // ColorMap role assertions
    expect(resolveThemeColor(world, "invader_commander")).toBe("#B8860B");
    expect(resolveThemeColor(world, "player")).toBe("#B87333");
    expect(resolveThemeColor(world, "ufo")).toBe("#D4A017");
    expect(resolveThemeColor(world, "shield")).toBe("#6B5D4F");
    expect(resolveThemeColor(world, "bullet")).toBe("#FFE135");
    expect(resolveThemeColor(world, "enemy-bullet")).toBe("#FF3D00");
  });

  it("contains customGeometries for all Space Invaders roles in visualTheme", () => {
    const customGeom = siegeShieldWallConceptPack.visualTheme?.shapeTokens?.customGeometries;
    expect(customGeom).toBeDefined();
    expect(customGeom?.["ufo"]).toBeDefined();
    expect(customGeom?.["invader_scout"]).toBeDefined();
    expect(customGeom?.["invader_commander"]).toBeDefined();
    expect(customGeom?.["invader"]).toBeDefined();

    expect(customGeom?.["ufo"]?.subPaths.length).toBeGreaterThan(0);
    expect(siegeShieldWallConceptPack.visualTheme?.shapeTokens?.playerGeometry).toBeDefined();
    expect(siegeShieldWallConceptPack.visualTheme?.shapeTokens?.projectileGeometry).toBeDefined();
  });

  it("contains valid concept pack metadata and role labels", () => {
    expect(siegeShieldWallConceptPack.conceptPack?.id).toBe("siege_shield_wall");
    expect(siegeShieldWallConceptPack.conceptPack?.name).toBe("Asedio de la Muralla de Escudos");
    expect(siegeShieldWallConceptPack.conceptPack?.roleLabels?.["ufo"]).toBe("Portador de Estandarte");
    expect(siegeShieldWallConceptPack.conceptPack?.roleLabels?.["invader_commander"]).toBe("Infantería Pesada");
    expect(siegeShieldWallConceptPack.lore?.title).toBe("Asedio de la Muralla de Escudos");
  });

  it("resolves invader colors and custom geometries through SpaceInvadersVisualUtils", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, siegeShieldWallConceptPack);

    // 1. UFO / Top Row entity
    const ufoEntity = world.createEntity();
    world.addComponent(ufoEntity, { type: "Render", shape: "ufo", size: 30, color: "#FFFFFF", visible: true, opacity: 1, order: 0, rotation: 0, angularVelocity: 0, hitFlashFrames: 0 });
    world.addComponent(ufoEntity, { type: "EnemyTag", blueprintId: "ufo", level: 1 });

    const ufoColorState = resolveInvaderColor(world, world.getComponent(ufoEntity, "Render"), undefined, world.getComponent(ufoEntity, "EnemyTag"));
    expect(ufoColorState.baseColor).toBe("#D4A017");

    const ufoSetup = resolveInvaderRenderSetup(world, ufoEntity);
    expect(ufoSetup).not.toBeNull();
    expect(ufoSetup?.customGeom).toBe(siegeShieldWallConceptPack.visualTheme?.shapeTokens?.customGeometries?.["ufo"]);

    // 2. Commander entity (middle row)
    const commanderEntity = world.createEntity();
    world.addComponent(commanderEntity, { type: "Render", shape: "invader", size: 20, color: "#FFFFFF", visible: true, opacity: 1, order: 0, rotation: 0, angularVelocity: 0, hitFlashFrames: 0 });
    world.addComponent(commanderEntity, { type: "Invader", row: 1, col: 0, points: 20 });
    world.addComponent(commanderEntity, { type: "EnemyTag", blueprintId: "invader", variant: "commander", level: 1 });

    const commanderSetup = resolveInvaderRenderSetup(world, commanderEntity);
    expect(commanderSetup).not.toBeNull();
    expect(commanderSetup?.baseColor).toBe("#B8860B");
    expect(commanderSetup?.customGeom).toBe(siegeShieldWallConceptPack.visualTheme?.shapeTokens?.customGeometries?.["invader_commander"]);

    // 3. Line Invader entity
    const lineEntity = world.createEntity();
    world.addComponent(lineEntity, { type: "Render", shape: "invader", size: 20, color: "#FFFFFF", visible: true, opacity: 1, order: 0, rotation: 0, angularVelocity: 0, hitFlashFrames: 0 });
    world.addComponent(lineEntity, { type: "Invader", row: 3, col: 0, points: 10 });
    world.addComponent(lineEntity, { type: "EnemyTag", blueprintId: "invader", level: 1 });

    const lineSetup = resolveInvaderRenderSetup(world, lineEntity);
    expect(lineSetup).not.toBeNull();
    expect(lineSetup?.baseColor).toBe("#8B0000");
    expect(lineSetup?.customGeom).toBe(siegeShieldWallConceptPack.visualTheme?.shapeTokens?.customGeometries?.["invader"]);
  });
});
