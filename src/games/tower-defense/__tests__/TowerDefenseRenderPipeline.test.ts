import { GameLoop, type Renderer } from "@tiny-aster/core";
import { subscribeRenderFrames } from "../../shared/rendering/subscribeRenderFrames";
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

  it("dispatches every loop frame to both backends with the same ECS world", () => {
    const gameLoop = new GameLoop({ manual: true });
    const world = { id: "tower-defense-world" };
    const canvasFrames: Array<{ world: typeof world; alpha: number }> = [];
    const skiaFrames: Array<{ world: typeof world; alpha: number }> = [];

    const unsubscribeCanvas = subscribeRenderFrames(gameLoop, () => world, (frameWorld, alpha) => {
      canvasFrames.push({ world: frameWorld, alpha });
    });
    const unsubscribeSkia = subscribeRenderFrames(gameLoop, () => world, (frameWorld, alpha) => {
      skiaFrames.push({ world: frameWorld, alpha });
    });

    gameLoop.start();
    gameLoop.tick();
    gameLoop.tick();

    expect(canvasFrames).toHaveLength(2);
    expect(skiaFrames).toHaveLength(2);
    expect(canvasFrames.map((frame) => frame.world)).toEqual([world, world]);
    expect(skiaFrames.map((frame) => frame.world)).toEqual([world, world]);
    expect(canvasFrames.map((frame) => frame.alpha)).toEqual(skiaFrames.map((frame) => frame.alpha));
    for (const frame of [...canvasFrames, ...skiaFrames]) {
      expect(frame.alpha).toBeGreaterThanOrEqual(0);
      expect(frame.alpha).toBeLessThan(1);
    }

    unsubscribeCanvas();
    unsubscribeSkia();
    gameLoop.tick();

    expect(canvasFrames).toHaveLength(2);
    expect(skiaFrames).toHaveLength(2);
    gameLoop.stop();
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
