import { Skia } from "../../../shared/rendering/SkiaContext";
import { getFroggerSkiaPaint } from "../FroggerSkiaVisuals";

jest.mock("@shopify/react-native-skia", () => {
  const paint = { setColor: jest.fn() };
  return {
    Skia: {
      Paint: jest.fn(() => paint),
    },
  };
});

describe("Frogger Skia paint reuse", () => {
  it("does not create new paints after the first call", () => {
    (Skia as any).Paint.mockClear();
    const first = getFroggerSkiaPaint("test-paint-unique");
    const second = getFroggerSkiaPaint("test-paint-unique");
    expect(first).toBe(second);
    expect((Skia as any).Paint).toHaveBeenCalledTimes(1);
  });
});