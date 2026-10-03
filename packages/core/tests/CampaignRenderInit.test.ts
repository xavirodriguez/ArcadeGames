import { AsteroidsGame } from "../../../src/games/asteroids/AsteroidsGame";
import { Renderer } from "../src";

describe("Campaign Render Init Test (Hypothesis A)", () => {
  it("calls initializeRenderer and registers custom shape renderers", async () => {
    const game = new AsteroidsGame({ headless: false });
    await game.init();

    const mockRenderer = {
      type: "canvas",
      registerShape: jest.fn(),
      registerShapeRenderer: jest.fn(),
      registerBackgroundEffect: jest.fn(),
      registerPostProcessEffect: jest.fn(),
      registerParticleEffect: jest.fn()
    } as unknown as Renderer<Record<string, never>, Record<string, never>>;

    const spy = jest.spyOn(game, "initializeRenderer");

    // Simulate onInitialize callback passed to CanvasRenderer in CampaignScreen
    game.initializeRenderer(mockRenderer as unknown as Parameters<typeof game.initializeRenderer>[0]);

    expect(spy).toHaveBeenCalledWith(mockRenderer);
    expect((mockRenderer as Record<string, any>).registerShape).toHaveBeenCalled();
    game.destroy();
  });
});
