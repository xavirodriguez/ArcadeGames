/**
 * Pure spatial helper function for testing if a 2D position is inside a zone bounds.
 * @public
 */
export function isPointInZone(
  x: number,
  y: number,
  zone: { x: number; y: number; width: number; height: number }
): boolean {
  const halfW = zone.width / 2;
  const halfH = zone.height / 2;
  return (
    x >= zone.x - halfW &&
    x <= zone.x + halfW &&
    y >= zone.y - halfH &&
    y <= zone.y + halfH
  );
}
