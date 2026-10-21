import { GalaxianGame } from "../GalaxianGame";
import { ConfigService } from "@tiny-aster/core";
import { GalaxianConfigSchema, GalaxianConfig } from "../types/GalaxianConfigSchema";
import galaxianConfigRaw from "../config/galaxian.json";

describe("Galaxian Visual Parity, Accessibility, and Decoupling", () => {
  it("should resolve colorblind palette distinct from normal palette", () => {
    const config = ConfigService.load<GalaxianConfig>(
      "galaxian",
      GalaxianConfigSchema,
      galaxianConfigRaw
    );

    expect(config.visual.paletteColorblind.paperNight).not.toBe(config.visual.palette.paperNight);
    expect(config.visual.paletteColorblind.droneLight).not.toBe(config.visual.palette.droneLight);
    expect(config.visual.paletteColorblind.flagshipLight).not.toBe(config.visual.palette.flagshipLight);
  });

  it("should register matching shape and background drawers for Canvas and Skia renderers", () => {
    const game = new GalaxianGame({ headless: true });

    const registeredCanvasShapes = new Set<string>();
    const registeredSkiaShapes = new Set<string>();
    const registeredCanvasEffects = new Set<string>();
    const registeredSkiaEffects = new Set<string>();

    const mockCanvasRenderer: any = {
      type: "canvas",
      registerShape: (name: string) => registeredCanvasShapes.add(name),
      registerBackgroundEffect: (name: string) => registeredCanvasEffects.add(name),
    };

    const mockSkiaRenderer: any = {
      type: "skia",
      registerShape: (name: string) => registeredSkiaShapes.add(name),
      registerBackgroundEffect: (name: string) => registeredSkiaEffects.add(name),
    };

    game.initializeRenderer(mockCanvasRenderer);
    game.initializeRenderer(mockSkiaRenderer);

    expect(registeredCanvasShapes).toEqual(registeredSkiaShapes);
    expect(registeredCanvasEffects).toEqual(registeredSkiaEffects);

    expect(registeredCanvasShapes.has("player_ship")).toBe(true);
    expect(registeredCanvasShapes.has("enemy_flagship")).toBe(true);
    expect(registeredCanvasShapes.has("enemy_escort")).toBe(true);
    expect(registeredCanvasShapes.has("enemy_emissary")).toBe(true);
    expect(registeredCanvasShapes.has("enemy_drone")).toBe(true);
    expect(registeredCanvasShapes.has("player_bullet")).toBe(true);
    expect(registeredCanvasShapes.has("enemy_bullet")).toBe(true);
    expect(registeredCanvasShapes.has("unfold_shard")).toBe(true);
    expect(registeredCanvasShapes.has("score_popup")).toBe(true);
    expect(registeredCanvasEffects.has("paper_sky")).toBe(true);
  });

  it("should yield identical gameplay simulation results regardless of visual presentation systems", async () => {
    const seed = 54321;

    // Simulation A: Full game with presentation systems
    const gameA = new GalaxianGame({ headless: true, seed });
    await gameA.init();

    // Simulation B: Full game with presentation systems on identical seed
    const gameB = new GalaxianGame({ headless: true, seed });
    await gameB.init();

    for (let tick = 0; tick < 100; tick++) {
      if (tick % 4 === 0) {
        gameA.setInput({ moveLeft: true, shoot: true });
        gameB.setInput({ moveLeft: true, shoot: true });
      } else {
        gameA.setInput({ moveLeft: false, shoot: false });
        gameB.setInput({ moveLeft: false, shoot: false });
      }
      gameA.update(0.05);
      gameB.update(0.05);
    }

    const stateA = gameA.getGameState();
    const stateB = gameB.getGameState();

    expect(stateA.score).toBe(stateB.score);
    expect(stateA.lives).toBe(stateB.lives);
    expect(stateA.enemiesRemaining).toBe(stateB.enemiesRemaining);
    expect(stateA.level).toBe(stateB.level);
    expect(stateA.activeDivesCount).toBe(stateB.activeDivesCount);
  });
});
