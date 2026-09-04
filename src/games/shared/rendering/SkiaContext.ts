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

let cachedPaint: any = null;

/**
 * Returns a cached Skia Paint instance if Skia is available.
 */
export function getPaint(): any {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint;
}
