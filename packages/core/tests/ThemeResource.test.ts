import { World, Theme, THEME_RESOURCE_KEY, RenderComponent, SpriteComponent, BlueprintRegistry, getMissionTitle, getMissionDescription } from "../src";
import { registerAsteroidsBlueprints } from "../../../src/games/asteroids/EntityFactory";
import { createThemeFromGameAccents } from "../../../src/theme/gameAccents";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../../../src/games/asteroids/types/AsteroidRegistry";
import { ww2DogfightConceptPack } from "../../../src/theme/conceptPacks/ww2DogfightConceptPack";
import { zombieSurvivalConceptPack } from "../../../src/theme/conceptPacks/zombieSurvivalConceptPack";
import { resolvePlayerRoleVisual, calculateBossPhase } from "../../../src/games/shared/rendering/spaceInvadersMath";
import { colors } from "../../../src/theme/colors";

describe("Theme Resource & Entity Factory Integration", () => {
  it("should validate Theme resource shape in development mode", () => {
    const world = new World();

    const validTheme: Theme = {
      spriteMap: { "player-ship": "custom_ship" },
      colorMap: { "player-ship": "#ff0000" },
      lore: { title: "Custom Theme" }
    };

    world.setResource(THEME_RESOURCE_KEY, validTheme);
    expect(world.getResource<Theme>(THEME_RESOURCE_KEY)).toEqual(validTheme);

    // Invalid non-object Theme should throw
    expect(() => {
      world.setResource("Theme", JSON.parse('"invalid"'));
    }).toThrow(/Resource "Theme" must be an object/);

    // Invalid spriteMap shape should throw
    expect(() => {
      world.setResource("Theme", JSON.parse('{"spriteMap": "invalid", "colorMap": {}}'));
    }).toThrow(/spriteMap must be an object/);

    // Invalid colorMap shape should throw
    expect(() => {
      world.setResource("Theme", JSON.parse('{"spriteMap": {}, "colorMap": 123}'));
    }).toThrow(/colorMap must be an object/);

    // Invalid vfxProfile shape should throw
    expect(() => {
      world.setResource("Theme", JSON.parse('{"spriteMap": {}, "colorMap": {}, "vfxProfile": 123}'));
    }).toThrow(/vfxProfile must be an object/);
  });

  it("should fall back to default assetKey and GAME_ACCENTS color when default Theme resource is set", () => {
    const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    const defaultTheme = createThemeFromGameAccents("asteroids");
    world.setResource(THEME_RESOURCE_KEY, defaultTheme);
    registerAsteroidsBlueprints(world);

    const shipEntity = world.createEntity();
    const registry = world.getResource<BlueprintRegistry<AsteroidsComponentRegistry>>("BlueprintRegistry")!;
    registry.get("ship")!.spawn(world, shipEntity, { x: 100, y: 100 });

    const render = world.getComponent(shipEntity, "Render") as RenderComponent;
    const sprite = world.getComponent(shipEntity, "Sprite") as SpriteComponent;

    expect(render).toBeDefined();
    expect(render.color).toBe(defaultTheme.colorMap["player-ship"]);
    expect(sprite).toBeDefined();
    expect(sprite.assetKey).toBe("ship_sprite");
  });

  it("should apply custom Theme spriteMap and colorMap when constructing entities via blueprints", () => {
    const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    world.gameplayRandom.unlock();

    const customTheme: Theme = {
      spriteMap: {
        "player-ship": "cyber_ship_v2"
      },
      colorMap: {
        "player-ship": "#ff0077",
        "asteroid-large": "#00ffaa",
        "bullet": "#ffff00"
      }
    };

    world.setResource(THEME_RESOURCE_KEY, customTheme);
    registerAsteroidsBlueprints(world);

    const registry = world.getResource<BlueprintRegistry<AsteroidsComponentRegistry>>("BlueprintRegistry")!;

    // Spawn ship
    const shipEntity = world.createEntity();
    registry.get("ship")!.spawn(world, shipEntity, { x: 100, y: 100 });

    const shipRender = world.getComponent(shipEntity, "Render") as RenderComponent;
    const shipSprite = world.getComponent(shipEntity, "Sprite") as SpriteComponent;

    expect(shipRender.color).toBe("#ff0077");
    expect(shipSprite.assetKey).toBe("cyber_ship_v2");

    // Spawn bullet
    const bulletEntity = world.createEntity();
    registry.get("bullet")!.spawn(world, bulletEntity, { x: 100, y: 100, vx: 10, vy: 0 });

    const bulletRender = world.getComponent(bulletEntity, "Render") as RenderComponent;
    expect(bulletRender.color).toBe("#ffff00");

    // Spawn asteroid
    const asteroidEntity = world.createEntity();
    registry.get("asteroid")!.spawn(world, asteroidEntity, { x: 100, y: 100, size: "large" });

    const asteroidRender = world.getComponent(asteroidEntity, "Render") as RenderComponent;
    expect(asteroidRender.color).toBe("#00ffaa");
  });

  it("should construct a Theme object with default colors using createThemeFromGameAccents", () => {
    const theme = createThemeFromGameAccents("asteroids", {
      spriteMap: { "player-ship": "hero_ship" }
    });

    expect(theme.spriteMap["player-ship"]).toBe("hero_ship");
    expect(theme.colorMap["player"]).toBeDefined();
    expect(theme.colorMap["enemy"]).toBeDefined();
  });

  describe("Concept Pack System Verification", () => {
    it("should resolve parametric geometry, custom role labels, and mission overrides for WW2 Dogfight pack", () => {
      const theme = ww2DogfightConceptPack;
      expect(theme.visualTheme?.shapeTokens?.playerGeometry?.motionEffect).toBe("exhaust_smoke");
      expect(theme.visualTheme?.shapeTokens?.playerGeometry?.subPaths.length).toBeGreaterThan(0);

      // Mission title override
      const title = getMissionTitle(theme, "rey_del_caos", "Rey del Caos");
      expect(title).toBe("Reina del Humo");

      // Mission description override
      const desc = getMissionDescription(theme, "rey_del_caos", "Default desc");
      expect(desc).toContain("bombardero pesado");

      // Role visual resolution
      const roleVisual = resolvePlayerRoleVisual("hunter", theme);
      expect(roleVisual.name).toBe("LÍDER DE ESCUADRÓN");
      expect(roleVisual.roleColor).toBe("#FF5500");
    });

    it("should resolve parametric geometry, role visuals, and mission overrides for Zombie Survival pack", () => {
      const theme = zombieSurvivalConceptPack;
      expect(theme.visualTheme?.shapeTokens?.playerGeometry?.motionEffect).toBe("dust_trail");

      // Mission title override
      const title = getMissionTitle(theme, "rey_del_caos", "Rey del Caos");
      expect(title).toBe("Zona de Contagio");

      // Role visual resolution
      const roleVisual = resolvePlayerRoleVisual("hunter", theme);
      expect(roleVisual.name).toBe("SUPERVIVIENTE BERSERKER");
      expect(roleVisual.roleColor).toBe("#E76F51");
    });

    it("should fall back to default mission strings and original role visuals when no concept pack is present", () => {
      const defaultTheme = createThemeFromGameAccents("asteroids");

      const title = getMissionTitle(defaultTheme, "rey_del_caos", "Rey del Caos");
      expect(title).toBe("Rey del Caos");

      const roleVisual = resolvePlayerRoleVisual("hunter", defaultTheme);
      expect(roleVisual.name).toBe("HUNTER");
      expect(roleVisual.roleColor).toBe("#FF006E");

      const phaseVisual = calculateBossPhase(0.2, defaultTheme);
      expect(phaseVisual.phase).toBe(3);
      expect(phaseVisual.baseColor).toBe(colors.red);
    });
  });
});
