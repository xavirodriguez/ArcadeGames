import {
  CanvasPresentationPainter,
  type PresentationCanvasContext,
  type PresentationCanvasImageResolver
} from "./CanvasPresentationPainter";

interface SavedState {
  readonly globalAlpha: number;
  readonly fillStyle: string | CanvasGradient | CanvasPattern;
  readonly strokeStyle: string | CanvasGradient | CanvasPattern;
  readonly lineWidth: number;
  readonly lineCap: CanvasLineCap;
  readonly lineJoin: CanvasLineJoin;
  readonly font: string;
  readonly textAlign: CanvasTextAlign;
  readonly textBaseline: CanvasTextBaseline;
}

interface CanvasMock {
  readonly context: PresentationCanvasContext;
  readonly calls: string[];
  readonly fillAlphas: number[];
  readonly imageArgs: Array<Array<CanvasImageSource | number>>;
  readonly textCalls: Array<{ text: string; x: number; y: number; font: string; align: CanvasTextAlign }>;
}

function createCanvasMock(): CanvasMock {
  const calls: string[] = [];
  const fillAlphas: number[] = [];
  const imageArgs: Array<Array<CanvasImageSource | number>> = [];
  const textCalls: Array<{ text: string; x: number; y: number; font: string; align: CanvasTextAlign }> = [];
  const stateStack: SavedState[] = [];
  const metrics = {
    width: 24,
    actualBoundingBoxAscent: 8,
    actualBoundingBoxDescent: 2
  } as TextMetrics;
  const gradient = {
    addColorStop: (_offset: number, _color: string) => calls.push("gradient-stop")
  } as CanvasGradient;

  let context: PresentationCanvasContext;
  context = {
    globalAlpha: 1,
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "10px sans-serif",
    textAlign: "left",
    textBaseline: "alphabetic",
    save: () => {
      calls.push("save");
      stateStack.push({
        globalAlpha: context.globalAlpha,
        fillStyle: context.fillStyle,
        strokeStyle: context.strokeStyle,
        lineWidth: context.lineWidth,
        lineCap: context.lineCap,
        lineJoin: context.lineJoin,
        font: context.font,
        textAlign: context.textAlign,
        textBaseline: context.textBaseline
      });
    },
    restore: () => {
      calls.push("restore");
      const state = stateStack.pop();
      if (!state) return;
      context.globalAlpha = state.globalAlpha;
      context.fillStyle = state.fillStyle;
      context.strokeStyle = state.strokeStyle;
      context.lineWidth = state.lineWidth;
      context.lineCap = state.lineCap;
      context.lineJoin = state.lineJoin;
      context.font = state.font;
      context.textAlign = state.textAlign;
      context.textBaseline = state.textBaseline;
    },
    translate: (_x: number, _y: number) => calls.push("translate"),
    scale: (_x: number, _y: number) => calls.push("scale"),
    rotate: (_angle: number) => calls.push("rotate"),
    beginPath: () => calls.push("beginPath"),
    moveTo: (_x: number, _y: number) => calls.push("moveTo"),
    lineTo: (_x: number, _y: number) => calls.push("lineTo"),
    quadraticCurveTo: (_cx: number, _cy: number, _x: number, _y: number) => calls.push("quadraticCurveTo"),
    bezierCurveTo: (
      _c1x: number,
      _c1y: number,
      _c2x: number,
      _c2y: number,
      _x: number,
      _y: number
    ) => calls.push("bezierCurveTo"),
    closePath: () => calls.push("closePath"),
    fill: () => calls.push("fill"),
    stroke: () => calls.push("stroke"),
    fillRect: (_x: number, _y: number, _width: number, _height: number) => {
      calls.push("fillRect");
      fillAlphas.push(context.globalAlpha);
    },
    strokeRect: (_x: number, _y: number, _width: number, _height: number) => calls.push("strokeRect"),
    arc: (_x: number, _y: number, _radius: number, _startAngle: number, _endAngle: number) => calls.push("arc"),
    ellipse: (
      _x: number,
      _y: number,
      _radiusX: number,
      _radiusY: number,
      _rotation: number,
      _startAngle: number,
      _endAngle: number
    ) => calls.push("ellipse"),
    rect: (_x: number, _y: number, _width: number, _height: number) => calls.push("rect"),
    clip: () => calls.push("clip"),
    fillText: (text: string, x: number, y: number) => {
      calls.push("fillText");
      textCalls.push({ text, x, y, font: context.font, align: context.textAlign });
    },
    measureText: (_text: string) => metrics,
    createLinearGradient: (_startX: number, _startY: number, _endX: number, _endY: number) => gradient,
    createRadialGradient: (
      _startX: number,
      _startY: number,
      _startRadius: number,
      _endX: number,
      _endY: number,
      _endRadius: number
    ) => gradient,
    drawImage: (...args: Array<CanvasImageSource | number>) => {
      calls.push("drawImage");
      imageArgs.push(args);
    }
  };
  return { context, calls, fillAlphas, imageArgs, textCalls };
}

describe("CanvasPresentationPainter", () => {
  test("applies operation alpha without leaking Canvas state", () => {
    const mock = createCanvasMock();
    mock.context.globalAlpha = 0.8;
    const painter = new CanvasPresentationPainter(mock.context);

    painter.fillRect(
      { x: 2, y: 3, width: 20, height: 10 },
      { color: "#171817", alpha: 0.25 }
    );

    expect(mock.calls).toContain("fillRect");
    expect(mock.fillAlphas).toEqual([0.2]);
    expect(mock.context.globalAlpha).toBe(0.8);
    expect(mock.context.fillStyle).toBe("#000000");
  });

  test("uses gradients created by the same painter and rejects foreign gradients", () => {
    const mock = createCanvasMock();
    const painter = new CanvasPresentationPainter(mock.context);
    const gradient = painter.createLinearGradient(0, 0, 100, 0);
    gradient.addColorStop(0, "#ffffff");
    painter.fillRect({ x: 0, y: 0, width: 100, height: 20 }, { gradient });

    expect(mock.calls).toContain("gradient-stop");
    expect(mock.calls).toContain("fillRect");
    expect(() =>
      painter.fillRect(
        { x: 0, y: 0, width: 1, height: 1 },
        { gradient: { addColorStop: (_offset: number, _color: string) => undefined } }
      )
    ).toThrow("Gradient was not created by this painter.");
  });

  test("measures and positions text using the supplied typography contract", () => {
    const mock = createCanvasMock();
    const painter = new CanvasPresentationPainter(mock.context);
    const style = {
      fontFamily: "serif",
      fontSize: 18,
      fontWeight: "bold" as const,
      align: "center" as const,
      baseline: "middle" as const,
      color: "#171817"
    };

    expect(painter.measureText("ink", style)).toEqual({ width: 24, height: 10 });
    painter.fillText("ink", 50, 30, style);

    expect(mock.textCalls[0]).toEqual({
      text: "ink",
      x: 50,
      y: 30,
      font: "bold 18px serif",
      align: "center"
    });
    expect(mock.context.font).toBe("10px sans-serif");
    expect(mock.context.textAlign).toBe("left");
  });

  test("resolves semantic image IDs and passes source cropping to Canvas", () => {
    const mock = createCanvasMock();
    const image = { width: 32, height: 16 } as CanvasImageSource;
    const resolver: PresentationCanvasImageResolver = {
      getImage: (assetId) => assetId === "village-roof" ? image : undefined
    };
    const painter = new CanvasPresentationPainter(mock.context, resolver);

    painter.drawImage(
      "village-roof",
      { x: 1, y: 2, width: 24, height: 12 },
      { x: 4, y: 2, width: 16, height: 8 },
      0.5
    );

    expect(mock.calls).toContain("drawImage");
    expect(mock.imageArgs).toHaveLength(1);
    expect(mock.imageArgs[0]).toHaveLength(9);
    expect(mock.imageArgs[0][0]).toBe(image);
    expect(mock.context.globalAlpha).toBe(1);
  });

  test("skips drawing while a semantic image is unavailable", () => {
    const mock = createCanvasMock();
    const resolver: PresentationCanvasImageResolver = { getImage: () => undefined };
    const painter = new CanvasPresentationPainter(mock.context, resolver);

    painter.drawImage("not-loaded", { x: 0, y: 0, width: 10, height: 10 });

    expect(mock.calls).not.toContain("drawImage");
  });
});
