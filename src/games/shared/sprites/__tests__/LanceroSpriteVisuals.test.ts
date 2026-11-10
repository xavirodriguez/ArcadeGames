jest.mock("../../rendering/SkiaContext", () => {
  const paint = {
    reset: jest.fn(),
    setAntiAlias: jest.fn(),
    setAlphaf: jest.fn(),
    setStyle: jest.fn(),
    setColor: jest.fn(),
    setStrokeWidth: jest.fn()
  };

  return {
    Skia: {
      PaintStyle: { Fill: 0, Stroke: 1 },
      Color: jest.fn((value: string) => value),
      XYWHRect: jest.fn((x: number, y: number, width: number, height: number) => ({
        x,
        y,
        width,
        height
      }))
    },
    getPaint: jest.fn(() => paint),
    __mockPaint: paint
  };
});

import { World } from "@tiny-aster/core";
import {
  SpriteRegistry,
  createSpriteAnimator,
  setSkiaImage
} from "../index";
import {
  drawSkiaLanceroSprite,
  LANCERO_SHAPE,
  LANCERO_SPRITE_ID
} from "../LanceroSpriteVisuals";

const skiaMock = jest.requireMock("../../rendering/SkiaContext") as {
  Skia: {
    XYWHRect: jest.Mock;
    PaintStyle?: { Fill?: number; Stroke?: number };
  };
  __mockPaint: {
    setAlphaf: jest.Mock;
    setStyle: jest.Mock;
  };
};

function createLancero(visible = true, opacity = 0.4, size = 32): {
  world: World;
  entity: number;
} {
  const world = new World();
  const entity = world.createEntity();
  const animator = createSpriteAnimator(LANCERO_SPRITE_ID, "idle");
  animator.offsetX = 3;
  animator.offsetY = -2;
  animator.flipX = true;
  world.addComponent(entity, animator);
  world.addComponent(entity, {
    type: "Render",
    shape: LANCERO_SHAPE,
    visible,
    size,
    opacity,
    order: 0,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0
  });
  return { world, entity };
}

function createCanvas() {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    drawOval: jest.fn(),
    drawImageRect: jest.fn()
  };
}

describe("Lancero Skia drawer", () => {
  beforeEach(() => {
    SpriteRegistry.init();
    setSkiaImage(LANCERO_SPRITE_ID, null);
    jest.clearAllMocks();
  });

  afterEach(() => {
    setSkiaImage(LANCERO_SPRITE_ID, null);
  });

  it("draws the procedural fallback while the sprite image is unavailable", () => {
    const { world, entity } = createLancero(true, 0.4, 32);
    const canvas = createCanvas();

    drawSkiaLanceroSprite.draw(canvas as never, world as never, entity);

    expect(canvas.drawOval).toHaveBeenCalledTimes(2);
    expect(canvas.drawImageRect).not.toHaveBeenCalled();
    expect(canvas.translate).toHaveBeenCalledWith(3, -2);
    expect(canvas.scale).toHaveBeenCalledWith(-1, 1);
    expect(skiaMock.Skia.XYWHRect).toHaveBeenCalledWith(-11.2, -20.8, 22.4, 35.2);
    expect(skiaMock.__mockPaint.setAlphaf).toHaveBeenCalledWith(0.4);
  });

  it("uses stable Skia style enum fallbacks when PaintStyle is unavailable", () => {
    const originalPaintStyle = skiaMock.Skia.PaintStyle;
    skiaMock.Skia.PaintStyle = undefined;
    const { world, entity } = createLancero();
    const canvas = createCanvas();

    try {
      drawSkiaLanceroSprite.draw(canvas as never, world as never, entity);

      expect(skiaMock.__mockPaint.setStyle).toHaveBeenNthCalledWith(1, 0);
      expect(skiaMock.__mockPaint.setStyle).toHaveBeenNthCalledWith(2, 1);
      expect(canvas.drawOval).toHaveBeenCalledTimes(2);
    } finally {
      skiaMock.Skia.PaintStyle = originalPaintStyle;
    }
  });

  it("uses the loaded sprite instead of the procedural fallback", () => {
    setSkiaImage(LANCERO_SPRITE_ID, { width: 1376, height: 768 } as never);
    const { world, entity } = createLancero();
    const canvas = createCanvas();

    drawSkiaLanceroSprite.draw(canvas as never, world as never, entity);

    expect(canvas.drawImageRect).toHaveBeenCalledTimes(1);
    expect(canvas.drawOval).not.toHaveBeenCalled();
  });

  it("does not draw an invisible entity", () => {
    const { world, entity } = createLancero(false);
    const canvas = createCanvas();

    drawSkiaLanceroSprite.draw(canvas as never, world as never, entity);

    expect(canvas.save).not.toHaveBeenCalled();
    expect(canvas.drawOval).not.toHaveBeenCalled();
    expect(canvas.drawImageRect).not.toHaveBeenCalled();
  });
});
