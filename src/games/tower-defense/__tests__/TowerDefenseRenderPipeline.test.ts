import { Renderer } from "@tiny-aster/core";
import { TowerDefenseGame } from "../TowerDefenseGame";
import { createIsoConfig, worldToIso, isoToWorld } from "../rendering/IsoProjection";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";

describe("Tower Defense Render Pipeline & F0 Baseline", () => {
  it("initializes renderer and registers shapes for Canvas2D and Skia", async () => {
    const game = new TowerDefenseGame();
    await game.init();

    const registeredCanvasShapes: string[] = [];
    const registeredSkiaShapes: string[] = [];
    const registeredCanvasEffects: string[] = [];
    const registeredSkiaEffects: string[] = [];

    const mockCanvasRenderer = {
      type: "canvas" as const,
      registerShape: (name: string) => registeredCanvasShapes.push(name),
      registerBackgroundEffect: (name: string) => registeredCanvasEffects.push(name),
    };

    const mockSkiaRenderer = {
      type: "skia" as const,
      registerShape: (name: string) => registeredSkiaShapes.push(name),
      registerBackgroundEffect: (name: string) => registeredSkiaEffects.push(name),
    };

    game.initializeRenderer(mockCanvasRenderer as never as Renderer<TowerDefenseComponentRegistry>);
    game.initializeRenderer(mockSkiaRenderer as never as Renderer<TowerDefenseComponentRegistry>);

    expect(registeredCanvasShapes).toContain("tower_basic");
    expect(registeredCanvasShapes).toContain("creep_grunt");
    expect(registeredCanvasShapes).toContain("tower_projectile");
    expect(registeredCanvasEffects).toContain("td_map");

    expect(registeredSkiaShapes).toContain("tower_basic");
    expect(registeredSkiaShapes).toContain("creep_grunt");
    expect(registeredSkiaShapes).toContain("tower_projectile");
    expect(registeredSkiaEffects).toContain("td_map");

    await game.destroy();
  });

  it("verifies default config uses isometric projection and IsoConfig is valid", async () => {
    const game = new TowerDefenseGame();
    await game.init();
    const world = game.getWorld();
    const config = world.getResource<TowerDefenseConfig>("GameConfig");

    expect(config).toBeDefined();
    expect(config?.projection).toBe("isometric");

    if (config) {
      const isoCfg = createIsoConfig(config);
      expect(isoCfg.enabled).toBe(true);

      const worldPoint = { x: 200, y: 150 };
      const isoPoint = worldToIso(isoCfg, worldPoint.x, worldPoint.y);
      const roundTripPoint = isoToWorld(isoCfg, isoPoint.x, isoPoint.y);

      expect(roundTripPoint.x).toBeCloseTo(worldPoint.x, 3);
      expect(roundTripPoint.y).toBeCloseTo(worldPoint.y, 3);
    }

    await game.destroy();
  });
});
