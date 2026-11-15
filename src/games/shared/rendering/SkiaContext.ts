import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";

/**
 * Shared Skia context initialization for Node / React Native environments.
 */
let Skia: any = null;
let BlendMode: { SrcOver?: unknown; Plus?: unknown; Screen?: unknown } | null = null;
try {
  const skiaModule = require("@shopify/react-native-skia");
  Skia = skiaModule.Skia;
  BlendMode = skiaModule.BlendMode;
} catch {
  // Silent fallback in test environments
}

export { Skia, BlendMode };
export type { SkCanvas, SkPaint } from "@shopify/react-native-skia";

let cachedPaint: SkPaint | null = null;

/**
 * Returns a cached Skia Paint instance if Skia is available.
 */
export function getPaint(): SkPaint {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint!;
}
