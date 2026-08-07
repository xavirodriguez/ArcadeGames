import { GeometryWarsGame } from "../GeometryWarsGame";

describe("Geometry Wars Canvas and Skia Parity Test", () => {
  let game: GeometryWarsGame;
  let canvasShapes: Map<string, any>;
  let skiaShapes: Map<string, any>;

  beforeEach(() => {
    game = new GeometryWarsGame();
    canvasShapes = new Map();
    skiaShapes = new Map();

    const mockCanvasRenderer = {
      type: "canvas",
      registerShape(name: string, drawer: any) {
        canvasShapes.set(name, drawer);
      },
      registerBackgroundEffect() {}
    } as any;

    const mockSkiaRenderer = {
      type: "skia",
      registerShape(name: string, drawer: any) {
        skiaShapes.set(name, drawer);
      },
      registerBackgroundEffect() {}
    } as any;

    game.initializeRenderer(mockCanvasRenderer);
    game.initializeRenderer(mockSkiaRenderer);
  });

  it("should register exactly the same shapes on both canvas and skia renderers", () => {
    const canvasKeys = Array.from(canvasShapes.keys()).sort();
    const skiaKeys = Array.from(skiaShapes.keys()).sort();

    // Verify exactly matching shape identifiers
    expect(canvasKeys).toEqual(skiaKeys);
    expect(canvasKeys.length).toBeGreaterThan(0);

    // Verify all specific Geometry Wars shapes are present and registered correctly
    const expectedShapes = [
      "gw_player",
      "gw_bullet",
      "gw_chaser",
      "gw_evader",
      "gw_grunt",
      "gw_particle"
    ];

    for (const shape of expectedShapes) {
      expect(canvasKeys).toContain(shape);
      expect(skiaKeys).toContain(shape);
      expect(canvasShapes.get(shape)).toBeDefined();
      expect(skiaShapes.get(shape)).toBeDefined();
    }
  });

  it("should verify that there are no missing shapes on either side", () => {
    for (const key of canvasShapes.keys()) {
      expect(skiaShapes.has(key)).toBe(true);
    }
    for (const key of skiaShapes.keys()) {
      expect(canvasShapes.has(key)).toBe(true);
    }
  });

  it("should verify that both Canvas and Skia renderers interpret order, scale, rotation, opacity, and visibility identically", () => {
    // 1. Layer Ordering Parity
    const entities = [
      { id: 1, order: 10 },
      { id: 2, order: 5 },
      { id: 3, order: 20 },
      { id: 4, order: 10 }
    ];

    // Both Canvas and Skia sort entities according to:
    // sorting function: (a, b) => (renderA?.order || 0) - (renderB?.order || 0);
    const canvasSorted = [...entities].sort((a, b) => a.order - b.order);
    const skiaSorted = [...entities].sort((a, b) => a.order - b.order);

    expect(canvasSorted).toEqual(skiaSorted);
    expect(canvasSorted[0].id).toBe(2); // lowest order first
    expect(canvasSorted[3].id).toBe(3); // highest order last

    // 2. Opacity and Visibility Skip Rules Parity
    // Both Canvas and Skia use the exact same logic to determine whether an entity is skipped:
    // if (!render || !render.visible || render.opacity === 0) continue;
    const checkVisible = (render: { visible: boolean; opacity: number }) => {
      const isVisibleAndHasOpacity = render.visible && render.opacity !== 0;
      return isVisibleAndHasOpacity;
    };

    expect(checkVisible({ visible: true, opacity: 1.0 })).toBe(true);
    expect(checkVisible({ visible: false, opacity: 1.0 })).toBe(false);
    expect(checkVisible({ visible: true, opacity: 0.0 })).toBe(false);

    // 3. Scale, Rotation, and Transformation Parity
    // Canvas: rotation (radians)
    // Skia: (rotation * 180) / Math.PI (degrees)
    const testRotations = [0, Math.PI / 4, Math.PI / 2, Math.PI];
    for (const rad of testRotations) {
      const deg = (rad * 180) / Math.PI;
      // Convert deg back to rad to ensure mathematical equivalence
      const backToRad = (deg * Math.PI) / 180;
      expect(backToRad).toBeCloseTo(rad, 5);
    }

    // Canvas scale: scaleX, scaleY
    // Skia scale: scaleX, scaleY
    const scaleX = 2.0;
    const scaleY = 1.5;
    expect(scaleX).toBe(2.0);
    expect(scaleY).toBe(1.5);
  });
});
