import { Skia, type SkCanvas, type SkImage } from "@shopify/react-native-skia";
import { SkiaPresentationPainter } from "./SkiaPresentationPainter";

jest.mock("@shopify/react-native-skia", () => {
  const path = {
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadTo: jest.fn(),
    cubicTo: jest.fn(),
    close: jest.fn()
  };
  const paint = {
    setAntiAlias: jest.fn(),
    setStyle: jest.fn(),
    setAlphaf: jest.fn(),
    setColor: jest.fn(),
    setStrokeWidth: jest.fn(),
    setStrokeCap: jest.fn(),
    setStrokeJoin: jest.fn(),
    setShader: jest.fn()
  };
  const makeShader = jest.fn(() => ({ kind: "shader" }));
  return {
    ClipOp: { Intersect: 0 },
    PaintStyle: { Fill: 0, Stroke: 1 },
    StrokeJoin: { Miter: 0, Round: 1, Bevel: 2 },
    StrokeCap: { Butt: 0, Round: 1, Square: 2 },
    TileMode: { Clamp: 0 },
    Skia: {
      Path: { Make: jest.fn(() => path) },
      Paint: jest.fn(() => paint),
      XYWHRect: jest.fn((x: number, y: number, width: number, height: number) => ({ x, y, width, height })),
      Color: jest.fn((color: string) => color),
      Point: jest.fn((x: number, y: number) => ({ x, y })),
      Font: jest.fn((_typeface: null, _size: number) => ({
        measureText: (text: string) => ({ width: text.length * 8 }),
        getMetrics: () => ({ ascent: -8, descent: 2, leading: 0 })
      })),
      Shader: {
        MakeLinearGradient: makeShader,
        MakeTwoPointConicalGradient: makeShader
      }
    }
  };
});

function createSkiaCanvasMock(): SkCanvas {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    drawPath: jest.fn(),
    drawRect: jest.fn(),
    drawCircle: jest.fn(),
    drawOval: jest.fn(),
    drawText: jest.fn(),
    drawImageRect: jest.fn(),
    clipRect: jest.fn()
  } as never as SkCanvas;
}

describe("SkiaPresentationPainter", () => {
  test("renders a path with the backend-neutral fill/stroke contract", () => {
    const canvas = createSkiaCanvasMock();
    const painter = new SkiaPresentationPainter(canvas);

    painter.beginPath();
    painter.moveTo(0, 0);
    painter.quadraticCurveTo(5, 2, 10, 0);
    painter.lineTo(10, 10);
    painter.closePath();
    painter.fill({ color: "#171817", alpha: 0.75 });

    expect(canvas.drawPath).toHaveBeenCalledTimes(1);
    expect(Skia.Paint).toHaveBeenCalled();
  });

  test("translates semantic gradient stops into a Skia shader", () => {
    const canvas = createSkiaCanvasMock();
    const painter = new SkiaPresentationPainter(canvas);
    const gradient = painter.createLinearGradient(0, 0, 30, 0);
    gradient.addColorStop(0, "#171817");
    gradient.addColorStop(1, "#e7dfcb");

    painter.fillRect({ x: 0, y: 0, width: 30, height: 8 }, { gradient });

    expect(Skia.Shader.MakeLinearGradient).toHaveBeenCalled();
    expect(canvas.drawRect).toHaveBeenCalledTimes(1);
  });

  test("rejects a gradient owned by a different Skia painter", () => {
    const canvas = createSkiaCanvasMock();
    const ownerPainter = new SkiaPresentationPainter(createSkiaCanvasMock());
    const consumerPainter = new SkiaPresentationPainter(canvas);
    const foreignGradient = ownerPainter.createLinearGradient(0, 0, 10, 0);
    foreignGradient.addColorStop(0, "#000000");

    expect(() =>
      consumerPainter.fillRect(
        { x: 0, y: 0, width: 1, height: 1 },
        { gradient: foreignGradient }
      )
    ).toThrow("Gradient was not created by this painter.");
  });

  test("rejects a gradient that does not implement the Skia painter's gradient contract", () => {
    const painter = new SkiaPresentationPainter(createSkiaCanvasMock());

    expect(() =>
      painter.fillRect(
        { x: 0, y: 0, width: 1, height: 1 },
        { gradient: { addColorStop: (_offset: number, _color: string) => undefined } }
      )
    ).toThrow("Gradient was not created by this painter.");
  });

  test("resolves asset IDs and renders source rectangles with the native image adapter", () => {
    const canvas = createSkiaCanvasMock();
    const image = {
      width: () => 64,
      height: () => 32
    } as SkImage;
    const painter = new SkiaPresentationPainter(canvas, {
      getImage: (id) => id === "temple" ? image : undefined
    });

    painter.drawImage(
      "temple",
      { x: 1, y: 2, width: 20, height: 10 },
      { x: 4, y: 2, width: 16, height: 8 },
      0.5
    );

    expect(canvas.drawImageRect).toHaveBeenCalledTimes(1);
  });
});
