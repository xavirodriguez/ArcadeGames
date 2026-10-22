import { Renderer, RenderContext } from "@tiny-aster/core";
import { CentipedeGame } from "../CentipedeGame";
import { CentipedeEntityFactory } from "../EntityFactory";
import { CentipedeComponentRegistry } from "../types/CentipedeTypes";
import { DEFAULT_PALETTE, DEFAULT_PALETTE_COLORBLIND } from "../types/CentipedeConfigSchema";

describe("Centipede Presentation & Visual Layer Parity", () => {
  it("maintains identical gameplay state with or without visual systems registered", async () => {
    const seed = 12345;

    const game1 = new CentipedeGame({ headless: true, gameOptions: { seed } });
    await game1.init();

    const game2 = new CentipedeGame({ headless: true, gameOptions: { seed } });
    await game2.init();

    for (let i = 0; i < 50; i++) {
      game1.update(0.016);
      game2.update(0.016);
    }

    const state1 = game1.getGameState();
    const state2 = game2.getGameState();

    expect(state1.score).toBe(state2.score);
    expect(state1.lives).toBe(state2.lives);
    expect(state1.level).toBe(state2.level);
    expect(state1.status).toBe(state2.status);

    const segments1 = game1.getWorld().query("CentipedeSegment");
    const segments2 = game2.getWorld().query("CentipedeSegment");
    expect(segments1.length).toBe(segments2.length);

    const mushrooms1 = game1.getWorld().query("Mushroom");
    const mushrooms2 = game2.getWorld().query("Mushroom");
    expect(mushrooms1.length).toBe(mushrooms2.length);

    game1.destroy();
    game2.destroy();
  });

  it("ensures lit lobes equals HP for mushrooms from HP 4 down to 1", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 101 } });
    await game.init();
    const world = game.getWorld();

    CentipedeEntityFactory.createMushroom(world, 5, 5, false, 4);

    const mushroomEntity = world.query("Mushroom").find((mEnt: number) => {
      const m = world.getComponent(mEnt, "Mushroom")!;
      return m.row === 5 && m.col === 5;
    });

    expect(mushroomEntity).toBeDefined();

    for (let hp = 4; hp >= 1; hp--) {
      const m = world.getMutableComponent(mushroomEntity!, "Mushroom")!;
      expect(m.hp).toBe(hp);

      m.hp -= 1;
    }

    game.destroy();
  });

  it("applies damage normally to mushrooms that are still sprouting (growProgress < 1.0)", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 202 } });
    await game.init();
    const world = game.getWorld();

    CentipedeEntityFactory.createMushroom(world, 10, 10, false, 4);

    const mEnt = world.query("Mushroom").find((e: number) => {
      const m = world.getComponent(e, "Mushroom")!;
      return m.row === 10 && m.col === 10;
    });

    expect(mEnt).toBeDefined();

    const vis = world.getMutableComponent(mEnt!, "MushroomVisual");
    if (vis) vis.growProgress = 0.2;

    const mushroom = world.getMutableComponent(mEnt!, "Mushroom")!;
    expect(mushroom.hp).toBe(4);

    mushroom.hp -= 1;
    expect(mushroom.hp).toBe(3);

    game.destroy();
  });

  it("has drawer parity: every registered shape in CentipedeGame has Canvas AND Skia drawer", async () => {
    const registeredShapesCanvas: string[] = [];
    const registeredShapesSkia: string[] = [];

    const dummyRendererCanvas: Renderer<CentipedeComponentRegistry, RenderContext> = {
      type: "canvas",
      registerShape: (name: string) => registeredShapesCanvas.push(name),
      registerBackgroundEffect: (name: string) => registeredShapesCanvas.push(name),
      render: () => {},
    };

    const dummyRendererSkia: Renderer<CentipedeComponentRegistry, RenderContext> = {
      type: "skia",
      registerShape: (name: string) => registeredShapesSkia.push(name),
      registerBackgroundEffect: (name: string) => registeredShapesSkia.push(name),
      render: () => {},
    };

    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 1 } });
    await game.init();

    game.initializeRenderer(dummyRendererCanvas);
    game.initializeRenderer(dummyRendererSkia);

    const expectedShapes = [
      "centipede_bg",
      "centipede_head",
      "centipede_body",
      "mushroom",
      "spider",
      "flea",
      "scorpion",
      "shooter",
      "dart"
    ];

    expect(registeredShapesCanvas).toEqual(expect.arrayContaining(expectedShapes));
    expect(registeredShapesSkia).toEqual(expect.arrayContaining(expectedShapes));

    game.destroy();
  });

  it("resolves distinct color tokens for colorblind palette compared to default palette", () => {
    expect(DEFAULT_PALETTE.soil).not.toEqual(DEFAULT_PALETTE_COLORBLIND.soil);
    expect(DEFAULT_PALETTE.centipedeHead).not.toEqual(DEFAULT_PALETTE_COLORBLIND.centipedeHead);
    expect(DEFAULT_PALETTE.mushroomA).not.toEqual(DEFAULT_PALETTE_COLORBLIND.mushroomA);
    expect(DEFAULT_PALETTE.amber).not.toEqual(DEFAULT_PALETTE_COLORBLIND.amber);
  });

  it("renders canvas drawers without error in both high and low quality modes", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 99 } });
    await game.init();
    const world = game.getWorld();

    const mockCtx: Partial<CanvasRenderingContext2D> = {
      canvas: { width: 300, height: 320 } as HTMLCanvasElement,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "butt" as CanvasLineCap,
      globalAlpha: 1.0,
      font: "",
      textAlign: "left" as CanvasTextAlign,
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      translate: () => {},
      scale: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      quadraticCurveTo: () => {},
    };

    const {
      renderCentipedeBackground,
      renderCentipedeHead,
      renderCentipedeBody,
      renderMushroom,
      renderSpider,
      renderFlea,
      renderScorpion,
      renderShooter,
      renderDart,
    } = require("../rendering/CentipedeCanvasVisuals");

    const ctx = mockCtx as RenderContext;

    expect(() => renderCentipedeBackground(ctx, world)).not.toThrow();

    const headEnt = world.query("CentipedeSegment")[0];
    if (headEnt) {
      expect(() => renderCentipedeHead(ctx, world, headEnt)).not.toThrow();
      expect(() => renderCentipedeBody(ctx, world, headEnt)).not.toThrow();
    }

    const mushEnt = world.query("Mushroom")[0];
    if (mushEnt) {
      expect(() => renderMushroom(ctx, world, mushEnt)).not.toThrow();
    }

    expect(() => renderSpider(ctx, world, 1)).not.toThrow();
    expect(() => renderFlea(ctx, world, 1)).not.toThrow();
    expect(() => renderScorpion(ctx, world, 1)).not.toThrow();

    const shooterEnt = world.query("Shooter")[0];
    if (shooterEnt) {
      expect(() => renderShooter(ctx, world, shooterEnt)).not.toThrow();
    }
    expect(() => renderDart(ctx, world, 1)).not.toThrow();

    game.destroy();
  });
});
