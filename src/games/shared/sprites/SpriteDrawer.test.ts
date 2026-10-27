jest.mock("../rendering/SkiaContext", () => ({
  getPaint: () => ({
    setAlphaf: () => undefined,
    setColorFilter: () => undefined
  }),
  Skia: null
}));

import { SpriteRegistry } from "./SpriteRegistry";
import {
  isCanvasSpriteReady,
  preloadSpriteSheetCanvas,
  retrySpriteSheetLoad
} from "./SpriteDrawer";
import type { SpriteSheetDef } from "./SpriteTypes";

let attempts = 0;
const originalImageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Image");

class RetryTestImage {
  width = 16;
  height = 16;
  naturalWidth = 0;
  naturalHeight = 0;
  complete = false;
  onload: (() => void) | null = null;
  onerror: ((error?: unknown) => void) | null = null;

  set src(_uri: string) {
    attempts += 1;
    queueMicrotask(() => {
      this.complete = true;
      if (attempts === 1) {
        this.onerror?.(new Error("Simulated first-load failure"));
        return;
      }

      this.naturalWidth = 16;
      this.naturalHeight = 16;
      this.onload?.();
    });
  }
}

const RETRY_SHEET: SpriteSheetDef = {
  id: "sprite_retry_unit_test",
  assetPath: "assets/sprite_retry_unit_test.png",
  imageSource: "sprite://retry-unit-test",
  frameWidth: 16,
  frameHeight: 16,
  animations: {
    idle: {
      name: "idle",
      frames: [{ x: 0, y: 0, w: 16, h: 16 }],
      frameDuration: 0.1,
      loop: true
    }
  }
};

describe("SpriteDrawer loading lifecycle", () => {
  beforeEach(() => {
    attempts = 0;
    SpriteRegistry.register(RETRY_SHEET);
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      writable: true,
      value: RetryTestImage
    });
  });

  afterEach(() => {
    if (originalImageDescriptor) {
      Object.defineProperty(globalThis, "Image", originalImageDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "Image");
    }
  });

  it("retries Canvas after a load failure instead of permanently suppressing requests", async () => {
    await expect(preloadSpriteSheetCanvas(RETRY_SHEET.id)).rejects.toThrow(
      "Failed to load sprite sheet"
    );

    expect(isCanvasSpriteReady(RETRY_SHEET.id)).toBe(false);
    await expect(retrySpriteSheetLoad(RETRY_SHEET.id, "canvas")).resolves.toBeUndefined();

    expect(attempts).toBe(2);
    expect(isCanvasSpriteReady(RETRY_SHEET.id)).toBe(true);
  });

  it("rejects retry requests for unknown sheet ids", async () => {
    await expect(retrySpriteSheetLoad("sprite_that_does_not_exist", "canvas"))
      .rejects.toThrow("Cannot retry unknown sprite sheet");
  });
});
