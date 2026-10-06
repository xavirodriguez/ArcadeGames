import { initializeAsteroidsRenderer } from "../rendering/AsteroidsRendererManager";

describe("Campaign Render Fix (Hypothesis A)", () => {
  it("verifies initializeRenderer registers player_ship, asteroid, and bullet shapes on canvas renderer", () => {
    const mockRenderer = {
      type: "canvas" as const,
      render: jest.fn(),
      registerShape: jest.fn(),
      registerBackgroundEffect: jest.fn()
    };

    initializeAsteroidsRenderer(
      mockRenderer as never
    );

    expect(mockRenderer.registerShape).toHaveBeenCalledWith("player_ship", expect.objectContaining({ draw: expect.any(Function) }));
    expect(mockRenderer.registerShape).toHaveBeenCalledWith("asteroid", expect.objectContaining({ draw: expect.any(Function) }));
    expect(mockRenderer.registerShape).toHaveBeenCalledWith("bullet", expect.objectContaining({ draw: expect.any(Function) }));
  });
});
