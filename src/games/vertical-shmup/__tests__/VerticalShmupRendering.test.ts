import { VerticalShmupGame } from "../VerticalShmupGame";
import { Renderer } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";

describe("VerticalShmup Rendering & Parity", () => {
  it("registers both Canvas and Skia shapes and background effects correctly", async () => {
    const game = new VerticalShmupGame();
    await game.init();

    const registeredCanvasShapes = new Set<string>();
    const registeredSkiaShapes = new Set<string>();
    const registeredCanvasEffects = new Set<string>();
    const registeredSkiaEffects = new Set<string>();

    const mockCanvasRenderer = {
      type: "canvas",
      registerShape: (name: string) => registeredCanvasShapes.add(name),
      registerBackgroundEffect: (name: string) => registeredCanvasEffects.add(name)
    } as unknown as Renderer<ShmupComponentRegistry, unknown>;

    const mockSkiaRenderer = {
      type: "skia",
      registerShape: (name: string) => registeredSkiaShapes.add(name),
      registerBackgroundEffect: (name: string) => registeredSkiaEffects.add(name)
    } as unknown as Renderer<ShmupComponentRegistry, unknown>;

    game.initializeRenderer(mockCanvasRenderer);
    game.initializeRenderer(mockSkiaRenderer);

    expect(registeredCanvasShapes.has("shmup_player")).toBe(true);
    expect(registeredCanvasShapes.has("shmup_enemy")).toBe(true);
    expect(registeredCanvasShapes.has("shmup_player_bullet")).toBe(true);
    expect(registeredCanvasShapes.has("shmup_enemy_bullet")).toBe(true);
    expect(registeredCanvasEffects.has("shmup_starfield")).toBe(true);

    expect(registeredSkiaShapes.has("shmup_player")).toBe(true);
    expect(registeredSkiaShapes.has("shmup_enemy")).toBe(true);
    expect(registeredSkiaShapes.has("shmup_player_bullet")).toBe(true);
    expect(registeredSkiaShapes.has("shmup_enemy_bullet")).toBe(true);
    expect(registeredSkiaEffects.has("shmup_starfield")).toBe(true);

    game.destroy();
  });
});
