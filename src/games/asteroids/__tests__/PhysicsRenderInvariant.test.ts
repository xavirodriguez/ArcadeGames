import { computeShipPhysics, SHIP_FORWARD_AXIS, World, RenderComponent } from "@tiny-aster/core";
import { drawAsteroidsPlayerShip } from "../rendering/AsteroidsCanvasVisuals";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";

describe("Physics and Render Cross-Invariant Test", () => {
  it("verifies that for rotation = 0, thrust accelerates strictly along SHIP_FORWARD_AXIS (+X)", () => {
    const transform = { rotation: 0 };
    const velocity = { vx: 0, vy: 0 };
    const config = { SHIP_THRUST: 100, SHIP_ROTATION_SPEED: 2.0, SHIP_FRICTION: 0 };
    const input = { actions: new Set(["thrust"]), axes: {} };

    const result = computeShipPhysics(transform, velocity, input, config, 1.0);

    // Thrust applied along forward vector: vx should increase, vy must remain 0
    expect(result.vx).toBeGreaterThan(0);
    expect(result.vx).toBeCloseTo(config.SHIP_THRUST * SHIP_FORWARD_AXIS.x, 5);
    expect(result.vy).toBeCloseTo(config.SHIP_THRUST * SHIP_FORWARD_AXIS.y, 5);
  });

  it("verifies that ship visual drawing nose vertex aligns with SHIP_FORWARD_AXIS (+size, 0)", () => {
    const mockContext = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn()
    };

    const mockWorld = {
      getComponent: (_entity: number, comp: keyof AsteroidsComponentRegistry) => {
        if (comp === "Render") {
          return { size: 20, color: "#00f0ff" } as RenderComponent;
        }
        return undefined;
      },
      hasComponent: () => false,
      tick: 0,
      renderRandom: { next: () => 0.5 }
    };

    drawAsteroidsPlayerShip.draw(
      mockContext as unknown as CanvasRenderingContext2D,
      mockWorld as unknown as World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
      1
    );

    // Find moveTo calls for ship nose
    const moveToCalls = (mockContext.moveTo as jest.Mock).mock.calls;
    expect(moveToCalls.length).toBeGreaterThan(0);

    // Nose vertex in drawNeonShape is drawn with size * breath * widthScale along SHIP_FORWARD_AXIS
    // First call inside drawNeonShape callback corresponds to nose (x > 0, y = 0)
    const noseCall = moveToCalls.find(([x, y]) => x > 0 && y === 0);
    expect(noseCall).toBeDefined();
    expect(noseCall![0]).toBeGreaterThan(0); // Positive X along SHIP_FORWARD_AXIS.x
    expect(noseCall![1]).toBe(0);            // Zero Y along SHIP_FORWARD_AXIS.y
  });
});
