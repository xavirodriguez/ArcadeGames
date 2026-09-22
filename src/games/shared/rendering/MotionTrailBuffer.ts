/**
 * MotionTrailBuffer.ts
 * Reusable, high-performance motion trail buffer management and pure segment calculations.
 * Encapsulates entity position history using CircularPositionBuffer to prevent array copy allocations on updates.
 */

import { CircularPositionBuffer } from "./CircularPositionBuffer";

export interface TrailPoint {
  x: number;
  y: number;
  active: boolean;
}

export interface MotionTrailSegment {
  /** Normalized ratio from 1.0 (head / newest) to 0.0 (tail / oldest). */
  ratio: number;
  /** Calculated opacity alpha for rendering fading trails. */
  alpha: number;
  /** Scaled size/radius for rendering fading trail points. */
  trailSize: number;
}

/**
 * Pure helper function to compute trail segment ratio, alpha, and size based on index and total draw length.
 *
 * @param index - Index of point in trail (0 is head/newest, drawLength - 1 is tail/oldest).
 * @param drawLength - Total number of points being drawn.
 * @param size - Base size/radius of the trail object.
 * @public
 */
export function computeMotionTrailSegment(
  index: number,
  drawLength: number,
  size: number
): MotionTrailSegment {
  const safeLength = Math.max(1, drawLength);
  const ratio = 1 - index / safeLength;
  const alpha = ratio * 0.4;
  const trailSize = size * (0.3 + 0.7 * ratio);

  return { ratio, alpha, trailSize };
}

/**
 * Reusable motion trail buffer manager.
 * Stores circular position buffers per entity ID to track spatial motion history without GC allocations.
 *
 * @public
 */
export class MotionTrailBuffer {
  private readonly buffers = new Map<number, CircularPositionBuffer>();
  private readonly legacyTrailViews = new Map<number, TrailPoint[]>();
  private readonly maxPoints: number;

  constructor(maxPoints: number = 30) {
    this.maxPoints = maxPoints;
  }

  /**
   * Retrieves or initializes the CircularPositionBuffer for a given entity ID.
   */
  public getBuffer(entityId: number): CircularPositionBuffer {
    let buf = this.buffers.get(entityId);
    if (!buf) {
      buf = new CircularPositionBuffer({
        capacity: this.maxPoints,
        minDistance: 0,
        maxDiscontinuityDistance: 0
      });
      this.buffers.set(entityId, buf);
    }
    return buf;
  }

  /**
   * Retrieves or initializes a TrailPoint[] array view for backward compatibility.
   */
  public getTrail(entityId: number): TrailPoint[] {
    let view = this.legacyTrailViews.get(entityId);
    if (!view) {
      view = new Array<TrailPoint>(this.maxPoints);
      for (let i = 0; i < this.maxPoints; i++) {
        view[i] = { x: 0, y: 0, active: false };
      }
      this.legacyTrailViews.set(entityId, view);
    }

    const buf = this.getBuffer(entityId);
    const pts = buf.getPoints();
    const count = pts.length;

    for (let i = 0; i < this.maxPoints; i++) {
      if (i < count) {
        view[i].x = pts[i].x;
        view[i].y = pts[i].y;
        view[i].active = true;
      } else {
        view[i].active = false;
      }
    }

    return view;
  }

  /**
   * Updates trail position when the entity moves beyond minDistanceSq.
   */
  public update(entityId: number, x: number, y: number, minDistanceSq: number = 4): void {
    const buf = this.getBuffer(entityId);
    if (buf.isEmpty()) {
      buf.pushPosition(x, y);
      return;
    }

    const pts = buf.getPoints();
    const lastX = pts[0].x;
    const lastY = pts[0].y;
    const dx = x - lastX;
    const dy = y - lastY;

    if (dx * dx + dy * dy >= minDistanceSq) {
      buf.pushPosition(x, y);
    }
  }

  /**
   * Returns the maximum points capacity configured for this buffer manager.
   */
  public getMaxPoints(): number {
    return this.maxPoints;
  }
}
