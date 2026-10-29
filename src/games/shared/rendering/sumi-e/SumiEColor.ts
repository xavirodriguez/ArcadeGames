/**
 * Convert a semantic Sumi-e hex color to an rgba CSS color for translucent strokes.
 * Keeps color selection in the semantic palette and opacity in the renderer.
 */
const HEX_COLOR_PATTERN = /^#([0-9A-F]{6})$/i;

export function withSumiEAlpha(color: string, alpha: number): string {
  const match = HEX_COLOR_PATTERN.exec(color);
  if (!match) {
    throw new TypeError(`Invalid Sumi-e color "${color}": expected #RRGGBB.`);
  }

  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError(
      `Invalid Sumi-e alpha "${alpha}": expected a finite number between 0 and 1.`
    );
  }

  const hex = match[1]!;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
