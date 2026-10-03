import { AsteroidsGame } from "../../../src/games/asteroids/AsteroidsGame";
import { Renderer } from "../src";

describe("Campaign Render Init Test (Hypothesis A)", () => {
  it("calls initializeRenderer and registers custom shape renderers", async () => {
    const game = new AsteroidsGame({ headless: false });
    await game.init();

    const mockRenderer = {
      type: "canvas",
      render: jest.fn(),
      registerShape: jest.fn(),
      registerBackgroundEffect: jest.fn(),
      registerPostProcessEffect: jest.fn(),
      registerParticleEffect: jest.fn()
    } as any;

    const spy = jest.spyOn(game, "initializeRenderer");

    // Simulate onInitialize callback passed to CanvasRenderer in CampaignScreen
    game.initializeRenderer(mockRenderer);

    expect(spy).toHaveBeenCalledWith(mockRenderer);
    expect(mockRenderer.registerShape).toHaveBeenCalled();
    game.destroy();
  });
});
