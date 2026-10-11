export function isPointInZone(
  px: number,
  py: number,
  zone: { x: number; y: number; width: number; height: number }
): boolean {
  const halfW = zone.width / 2;
  const halfH = zone.height / 2;
  return (
    px >= zone.x - halfW &&
    px <= zone.x + halfW &&
    py >= zone.y - halfH &&
    py <= zone.y + halfH
  );
}
