export interface Point {
  x: number;
  y: number;
}

export interface TrackRibbonPoint {
  x: number;
  y: number;
  radius: number;
}

export interface TrackRibbonGeometry {
  center: Point[];
  left: Point[];
  right: Point[];
}

/**
 * Evaluates a 2D Catmull-Rom spline point given 4 control points and normalized t in [0, 1].
 */
function catmullRomPoint(
  p0: TrackRibbonPoint,
  p1: TrackRibbonPoint,
  p2: TrackRibbonPoint,
  p3: TrackRibbonPoint,
  t: number
): TrackRibbonPoint {
  const t2 = t * t;
  const t3 = t2 * t;

  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;

  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
    radius: p0.radius * f0 + p1.radius * f1 + p2.radius * f2 + p3.radius * f3
  };
}

/**
 * Pure function to build a smooth, closed track ribbon geometry from waypoints.
 * The left, right, and center point arrays have equal length and form closed loops.
 */
export function buildTrackRibbon(
  waypoints: readonly TrackRibbonPoint[],
  subdivisionsPerSegment: number = 8
): TrackRibbonGeometry {
  if (waypoints.length < 3) {
    return { center: [], left: [], right: [] };
  }

  const n = waypoints.length;
  const interpolated: TrackRibbonPoint[] = [];

  for (let i = 0; i < n; i += 1) {
    const p0 = waypoints[(i - 1 + n) % n]!;
    const p1 = waypoints[i]!;
    const p2 = waypoints[(i + 1) % n]!;
    const p3 = waypoints[(i + 2) % n]!;

    for (let s = 0; s < subdivisionsPerSegment; s += 1) {
      const t = s / subdivisionsPerSegment;
      interpolated.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }

  const count = interpolated.length;
  const center: Point[] = new Array(count);
  const left: Point[] = new Array(count);
  const right: Point[] = new Array(count);

  for (let i = 0; i < count; i += 1) {
    const prev = interpolated[(i - 1 + count) % count]!;
    const next = interpolated[(i + 1) % count]!;
    const curr = interpolated[i]!;

    // Tangent vector
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    let len = Math.hypot(dx, dy);

    if (len === 0) {
      dx = 1;
      dy = 0;
      len = 1;
    }

    const ux = dx / len;
    const uy = dy / len;

    // Normal vector perpendicular to tangent (rotated -90 deg)
    const nx = -uy;
    const ny = ux;

    const r = curr.radius;

    center[i] = { x: curr.x, y: curr.y };
    left[i] = { x: curr.x + nx * r, y: curr.y + ny * r };
    right[i] = { x: curr.x - nx * r, y: curr.y - ny * r };
  }

  return { center, left, right };
}
