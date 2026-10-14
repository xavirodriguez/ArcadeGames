import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";

/**
 * Shared Skia context initialization for Node / React Native environments.
 */
let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {
  // Silent fallback in test environments
}

export { Skia };
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
