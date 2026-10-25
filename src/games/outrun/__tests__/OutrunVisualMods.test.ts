import { World } from "@tiny-aster/core";
import { OutrunGame } from "../OutrunGame";
import { registerVisualMod, resolveVisualMod, listVisualMods } from "../mods/registry";
import { classicMod } from "../mods/classic/ClassicMod";
import { resolveOutrunRoadsideKind } from "../rendering/OutrunRoadsideArtwork";
import { resolveOutrunTrafficArtworkStyle } from "../rendering/OutrunVehicleArtwork";
import { initializeOutrunRenderer } from "../rendering/OutrunRendererManager";
import type { OutrunVisualMod } from "../mods/types";
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
