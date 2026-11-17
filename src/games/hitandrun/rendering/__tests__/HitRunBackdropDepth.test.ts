import { drawHitRunProceduralBackdrop } from "../HitRunBackdropCanvas";
import { drawHitRunProceduralBackdropSkia } from "../HitRunBackdropSkia";
import { getHitRunTheme } from "../theme/HitRunPresentationSession";

jest.mock("../theme/HitRunPresentationSession", () => ({
  getHitRunTheme: jest.fn(),
  resizeHitRunPresentationSession: jest.fn()
}));

jest.mock("../../shared/rendering/SkiaContext", () => ({
  Skia: {},
  getPaint: jest.fn()
}));

const getTheme = getHitRunTheme as jest.MockedFunction<typeof getHitRunTheme>;

describe("Hit & Run backdrop walkable depth contract", () => {
  const walkableDepth = { min: 314, max: 472 };
  const movementConfig = {
    maxSpeedX: 160,
    maxSpeedY: 110,
    acceleration: 900,
    deceleration: 1100,
    hopImpulse: -220,
    hopGravity: 980,
    hopMaxAirSeconds: 0.45,
    depthMin: walkableDepth.min,
    depthMax: walkableDepth.max
  };

  const world = {
    query: jest.fn(() => []),
    getComponent: jest.fn(() => undefined),
    getResource: jest.fn((key: string) => {
      if (key === "GameConfig") return { viewportWidth: 800, viewportHeight: 600 };
      if (key === "BeltMovementConfig") return movementConfig;
      return undefined;
    }),
    tick: 60
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the resolved gameplay band to the Canvas theme backdrop", () => {
    const renderBackdrop = jest.fn();
    getTheme.mockReturnValue({ renderBackdrop } as never);

    drawHitRunProceduralBackdrop.draw(
      {} as CanvasRenderingContext2D,
      world as never
    );

    expect(renderBackdrop).toHaveBeenCalledWith(
      expect.anything(),
      800,
      600,
      0,
      0,
      1,
      walkableDepth
    );
  });

  it("passes the identical resolved gameplay band to the Skia theme backdrop", () => {
    const renderBackdropSkia = jest.fn();
    getTheme.mockReturnValue({ renderBackdropSkia } as never);
    const canvas = { drawRect: jest.fn() };

    drawHitRunProceduralBackdropSkia.draw(
      canvas as never,
      world as never
    );

    expect(renderBackdropSkia).toHaveBeenCalledWith(
      canvas,
      800,
      600,
      0,
      0,
      1,
      walkableDepth
    );
  });
});
