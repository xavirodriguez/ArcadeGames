import { World } from "@tiny-aster/core";
import { OutrunGame } from "../OutrunGame";
import { registerVisualMod, resolveVisualMod, listVisualMods } from "../mods/registry";
import { classicMod } from "../mods/classic/ClassicMod";
import { arcadeMotorcycleMod } from "../mods/motorcycle/ArcadeMotorcycleMod";
import { resolveMotorcycleFrameIndex } from "../mods/motorcycle/resolveMotorcycleFrameIndex";
import { resolveOutrunRoadsideKind } from "../rendering/OutrunRoadsideArtwork";
import {
  resolveOutrunTrafficArtworkStyle,
  resolveOutrunTrafficPaletteIndex,
  resolveOutrunTrafficVehicleGeometry,
  resolveOutrunTrafficVehicleKind
} from "../rendering/OutrunVehicleArtwork";
import { initializeOutrunRenderer } from "../rendering/OutrunRendererManager";
import type { OutrunVisualMod, OutrunThemeModule, OutrunGameplayMod } from "../mods/types";
import type { OutrunComponentRegistry, OutrunEventRegistry, RoadData } from "../types/OutrunTypes";
import { OutrunConfigSchema } from "../types/OutrunConfigSchema";

describe("Outrun Visual Mods Architecture", () => {
  it("registers and resolves custom visual mod", () => {
    const customMod: OutrunVisualMod = {
      id: "test_medieval_preview",
      displayName: "Medieval Preview",
      createTheme: (base) => base,
      registerDrawers: jest.fn(),
      resolveScenarioDecorKind: (_scenarioId, slotHash) => (slotHash > 0.5 ? "wooden_fence" : "hay_stack"),
      resolveRoadsideKind: (kind) => (kind === "wooden_fence" || kind === "hay_stack" ? kind : "wooden_fence"),
      resolveTrafficVehicleShape: (_styleIndex) => "horse_cart"
    };

    registerVisualMod(customMod);

    const resolved = resolveVisualMod("test_medieval_preview");
    expect(resolved.id).toBe("test_medieval_preview");
    expect(listVisualMods().some((m) => m.id === "test_medieval_preview")).toBe(true);
  });

  it("prevents resolveOutrunRoadsideKind from collapsing custom kinds when handled by mod", () => {
    const customMod: OutrunVisualMod = {
      id: "custom_decor_mod",
      displayName: "Custom Decor Mod",
      createTheme: (base) => base,
      registerDrawers: jest.fn(),
      resolveScenarioDecorKind: () => "wooden_fence",
      resolveRoadsideKind: (kind) => {
        if (kind === "wooden_fence" || kind === "stone_wall") return kind;
        return "wooden_fence";
      }
    };

    // Without mod -> unknown kind collapses to "dry_shrub"
    expect(resolveOutrunRoadsideKind("wooden_fence")).toBe("dry_shrub");

    // With mod -> kind is preserved as "wooden_fence"
    expect(resolveOutrunRoadsideKind("wooden_fence", customMod)).toBe("wooden_fence");
    expect(resolveOutrunRoadsideKind("stone_wall", customMod)).toBe("stone_wall");
  });

  it("uses custom mod decor resolver during road generation and exposes mod as world resource", async () => {
    const customMod: OutrunVisualMod = {
      id: "custom_road_gen_mod",
      displayName: "Custom Road Gen Mod",
      createTheme: (base) => base,
      registerDrawers: jest.fn(),
      resolveScenarioDecorKind: (_scenarioId, slotHash) => (slotHash > 0.5 ? "wooden_fence" : "wagon")
    };

    registerVisualMod(customMod);

    const game = new OutrunGame({
      seed: 12345,
      gameOptions: { mod: "custom_road_gen_mod" },
      headless: true
    });

    await game.init();

    const world = game.getWorld();
    const activeMod = world.getResource<OutrunVisualMod>("VisualMod");
    expect(activeMod).toBeDefined();
    expect(activeMod?.id).toBe("custom_road_gen_mod");

    const roadData = world.getResource<RoadData>("RoadData");
    expect(roadData).toBeDefined();

    // Check generated roadside sprites contain "wooden_fence" or "wagon"
    const generatedKinds = new Set<string>();
    for (const seg of roadData!.segments) {
      if (seg.sprites) {
        for (const sp of seg.sprites) {
          generatedKinds.add(sp.kind);
        }
      }
    }

    expect(generatedKinds.has("wooden_fence") || generatedKinds.has("wagon")).toBe(true);

    game.destroy();
  });

  it("resolves custom traffic vehicle shape via mod", () => {
    const defaultConfig = OutrunConfigSchema.parse({});

    const customMod: OutrunVisualMod = {
      id: "custom_vehicle_mod",
      displayName: "Custom Vehicle Mod",
      createTheme: (base) => base,
      registerDrawers: jest.fn(),
      resolveScenarioDecorKind: () => "tree",
      resolveTrafficVehicleShape: (styleIndex) => (styleIndex % 2 === 0 ? "horse_cart" : "carriage")
    };

    const styleEven = resolveOutrunTrafficArtworkStyle(defaultConfig, 0, 100, customMod);
    expect(styleEven.shape).toBe("horse_cart");

    const styleOdd = resolveOutrunTrafficArtworkStyle(defaultConfig, 1, 100, customMod);
    expect(styleOdd.shape).toBe("carriage");
  });

  it("distributes four deterministic traffic archetypes with independent palette selection", () => {
    const buckets = Array.from({ length: 16 }, (_, index) => resolveOutrunTrafficVehicleKind(index));
    expect(buckets.filter((kind) => kind === "coupe")).toHaveLength(8);
    expect(buckets.filter((kind) => kind === "van")).toHaveLength(4);
    expect(buckets.filter((kind) => kind === "truck")).toHaveLength(2);
    expect(buckets.filter((kind) => kind === "motorcycle")).toHaveLength(2);

    for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
      for (let bucket = 0; bucket < 16; bucket++) {
        const seed = paletteIndex * 16 + bucket;
        expect(resolveOutrunTrafficPaletteIndex(seed)).toBe(paletteIndex);
        expect(resolveOutrunTrafficVehicleKind(seed)).toBe(buckets[bucket]);
      }
    }

    expect(resolveOutrunTrafficVehicleKind(Number.NaN)).toBe("coupe");
    expect(resolveOutrunTrafficPaletteIndex(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("builds renderer-neutral geometry for coupe, motorcycle, van and truck", () => {
    const defaultConfig = OutrunConfigSchema.parse({});
    const expectedKinds = ["coupe", "motorcycle", "van", "truck"] as const;
    const seedByKind = new Map(expectedKinds.map((kind) => [
      kind,
      Array.from({ length: 16 }, (_, index) => index).find((index) => resolveOutrunTrafficVehicleKind(index) === kind)!
    ]));

    for (const kind of expectedKinds) {
      const seed = seedByKind.get(kind);
      expect(seed).toBeDefined();
      const style = resolveOutrunTrafficArtworkStyle(defaultConfig, seed!, 100);
      const geometry = resolveOutrunTrafficVehicleGeometry(style);
      expect(style.shape).toBe(kind);
      expect(geometry.length).toBeGreaterThan(5);
      expect(geometry.every((command) => command.color.startsWith("#"))).toBe(true);
      expect(geometry.every((command) => {
        if (command.kind === "rect") return [command.x, command.y, command.width, command.height].every(Number.isFinite);
        if (command.kind === "ellipse") return [command.centerX, command.centerY, command.radiusX, command.radiusY].every(Number.isFinite);
        return command.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      })).toBe(true);
    }

    const coupe = resolveOutrunTrafficArtworkStyle(defaultConfig, seedByKind.get("coupe")!, 100);
    const motorcycle = resolveOutrunTrafficArtworkStyle(defaultConfig, seedByKind.get("motorcycle")!, 100);
    const van = resolveOutrunTrafficArtworkStyle(defaultConfig, seedByKind.get("van")!, 100);
    const truck = resolveOutrunTrafficArtworkStyle(defaultConfig, seedByKind.get("truck")!, 100);

    expect(motorcycle.bodyWidth).toBeLessThan(coupe.bodyWidth);
    expect(motorcycle.bodyHeight).toBeGreaterThan(coupe.bodyHeight);
    expect(van.bodyWidth).toBeGreaterThan(coupe.bodyWidth);
    expect(truck.bodyWidth).toBeGreaterThan(van.bodyWidth);
  });

  it("delegates drawer and background effect registration to active mod in initializeOutrunRenderer", () => {
    const registeredCanvasShapes: string[] = [];
    const registeredSkiaShapes: string[] = [];
    const registeredCanvasEffects: string[] = [];
    const registeredSkiaEffects: string[] = [];

    const mockCanvasRenderer: any = {
      type: "canvas",
      registerShape: jest.fn((shape) => registeredCanvasShapes.push(shape)),
      registerBackgroundEffect: jest.fn((name) => registeredCanvasEffects.push(name))
    };

    const mockSkiaRenderer: any = {
      type: "skia",
      registerShape: jest.fn((shape) => registeredSkiaShapes.push(shape)),
      registerBackgroundEffect: jest.fn((name) => registeredSkiaEffects.push(name))
    };

    const customMod: OutrunVisualMod = {
      id: "custom_renderer_mod",
      displayName: "Custom Renderer Mod",
      createTheme: (base) => base,
      registerDrawers: (register) => {
        register("canvas", "road", { draw: () => {} } as never);
        register("skia", "road", { draw: () => {} } as never);
      },
      registerBackgroundEffects: (register) => {
        register("canvas", "outrun_hud", () => {});
        register("skia", "outrun_hud", () => {});
      },
      resolveScenarioDecorKind: () => "tree"
    };

    initializeOutrunRenderer(mockCanvasRenderer, customMod);
    initializeOutrunRenderer(mockSkiaRenderer, customMod);

    expect(registeredCanvasShapes).toContain("road");
    expect(registeredCanvasEffects).toContain("outrun_hud");
    expect(registeredSkiaShapes).toContain("road");
    expect(registeredSkiaEffects).toContain("outrun_hud");
  });

  it("maps the continuous steering tilt to seven clamped motorcycle poses", () => {
    expect([
      resolveMotorcycleFrameIndex(-0.08),
      resolveMotorcycleFrameIndex(-0.05),
      resolveMotorcycleFrameIndex(-0.02),
      resolveMotorcycleFrameIndex(0),
      resolveMotorcycleFrameIndex(0.02),
      resolveMotorcycleFrameIndex(0.05),
      resolveMotorcycleFrameIndex(0.08)
    ]).toEqual([-3, -2, -1, 0, 1, 2, 3]);

    expect(resolveMotorcycleFrameIndex(-1)).toBe(-3);
    expect(resolveMotorcycleFrameIndex(1)).toBe(3);
    expect(resolveMotorcycleFrameIndex(Number.NaN)).toBe(0);
  });

  it("registers the Arcade Moto player drawer for Canvas and Skia without replacing traffic", () => {
    const registeredCanvasShapes: string[] = [];
    const registeredSkiaShapes: string[] = [];
    const mockCanvasRenderer: any = {
      type: "canvas",
      registerShape: jest.fn((shape) => registeredCanvasShapes.push(shape)),
      registerBackgroundEffect: jest.fn()
    };
    const mockSkiaRenderer: any = {
      type: "skia",
      registerShape: jest.fn((shape) => registeredSkiaShapes.push(shape)),
      registerBackgroundEffect: jest.fn()
    };

    initializeOutrunRenderer(mockCanvasRenderer, arcadeMotorcycleMod);
    initializeOutrunRenderer(mockSkiaRenderer, arcadeMotorcycleMod);

    expect(registeredCanvasShapes).toEqual(["road", "outrun_car", "outrun_racer"]);
    expect(registeredSkiaShapes).toEqual(["road", "outrun_car", "outrun_racer"]);
    expect(arcadeMotorcycleMod.resolveRoadsideKind?.("cypress")).toBe("pine");
    expect(arcadeMotorcycleMod.resolveTrafficVehicleShape?.(2)).toBe(
      classicMod.resolveTrafficVehicleShape?.(2)
    );
    expect(listVisualMods().some((mod) => mod.id === "arcade-moto" && mod.displayName === "Arcade Moto")).toBe(true);
  });

  it("activates Arcade Moto through gameOptions.mod without exposing presentation to gameplay", async () => {
    const game = new OutrunGame({
      seed: 9876,
      gameOptions: { mod: "arcade-moto" },
      headless: true
    });

    await game.init();

    const world = game.getWorld();
    const activeMod = world.getResource<OutrunVisualMod>("VisualMod");
    const themeModule = world.getResource<OutrunThemeModule>("OutrunThemeModule");
    const gameplayMod = world.getResource<OutrunGameplayMod>("GameplayMod");

    expect(activeMod?.id).toBe("arcade-moto");
    expect(themeModule?.id).toBe("arcade-moto");
    expect(gameplayMod?.id).toBe("arcade-moto");
    expect("registerDrawers" in (gameplayMod ?? {})).toBe(false);
    expect(activeMod?.resolveTrafficVehicleShape?.(0)).toBe("coupe");

    game.destroy();
  });

  it("preserves ClassicMod behavior when no mod is specified", () => {
    const registeredCanvasShapes: string[] = [];
    const mockCanvasRenderer: any = {
      type: "canvas",
      registerShape: jest.fn((shape) => registeredCanvasShapes.push(shape)),
      registerBackgroundEffect: jest.fn()
    };

    initializeOutrunRenderer(mockCanvasRenderer);

    expect(registeredCanvasShapes).toEqual(["road", "outrun_car", "outrun_racer"]);
    expect(classicMod.resolveScenarioDecorKind("coast", 0.1)).toBe("lighthouse");
    expect(classicMod.resolveScenarioDecorKind("coast", 0.9)).toBe("palm");
    expect(classicMod.resolveRoadsideKind?.("cypress")).toBe("pine");
  });
});
