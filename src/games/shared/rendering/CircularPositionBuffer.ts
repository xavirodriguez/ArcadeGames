/**
 * Represents a single calculated point within the motion trail circular buffer.
 * Pre-allocated to avoid Garbage Collection allocations during gameplay updates.
 *
 * @public
 */
export interface TrailBufferPoint {
  /** World X position. */
  x: number;
  /** World Y position. */
  y: number;
  /** World Z position (3D depth / height offset). */
  z: number;
  /** Entity rotation angle in radians. */
  rotation: number;
  /** Timestamp in seconds or frame count when position was recorded. */
  time: number;
  /** Calculated opacity alpha from 1.0 (head / newest) to 0.0 (tail / oldest). */
  alpha: number;
  /** Calculated width scale factor from 1.0 (head / newest) to end scale (tail / oldest). */
  widthScale: number;
}

/**
 * Configuration parameters for CircularPositionBuffer.
 *
 * @public
 */
export interface CircularPositionBufferConfig {
  /** Maximum capacity of points stored in the ring buffer. Default: 30 */
  capacity?: number;
  /** Minimum distance required between consecutive points to record a sample. Default: 1.0 */
  minDistance?: number;
  /** Minimum time interval required between consecutive points in seconds. Default: 0.0 */
  minTimeInterval?: number;
  /** Maximum distance step allowed before treating as a teleport/re-spawn and clearing the buffer. Default: 100.0 */
  maxDiscontinuityDistance?: number;
  /** Opacity alpha at the head (newest point). Default: 1.0 */
  startAlpha?: number;
  /** Opacity alpha at the tail (oldest point). Default: 0.0 */
  endAlpha?: number;
  /** Progressive width scale at the head (newest point). Default: 1.0 */
  startWidthScale?: number;
  /** Progressive width scale at the tail (oldest point). Default: 0.1 */
  endWidthScale?: number;
}

/**
 * Fixed-capacity Circular (Ring) Position Buffer for zero-allocation motion trails.
 *
 * @remarks
 * Stores entity historical spatial positions, rotation, and timestamps in contiguous Float32Arrays.
 * Prevents memory garbage collection pauses by reusing pre-allocated struct views on every frame.
 *
 * @public
 */
export class CircularPositionBuffer {
  private capacity: number;
  private minDistance: number;
  private minDistanceSq: number;
  private minTimeInterval: number;
  private maxDiscontinuityDistance: number;
  private maxDiscontinuityDistanceSq: number;
  private startAlpha: number;
  private endAlpha: number;
  private startWidthScale: number;
  private endWidthScale: number;

  private xBuffer: Float32Array;
  private yBuffer: Float32Array;
  private zBuffer: Float32Array;
  private rotBuffer: Float32Array;
  private timeBuffer: Float32Array;

  private headIndex: number = -1;
  private count: number = 0;

  private pointsPool: TrailBufferPoint[];
  private activePointsView: TrailBufferPoint[];

  /**
   * Constructs a CircularPositionBuffer with pre-allocated memory.
   *
   * @param config - Optional initial buffer configuration parameters.
   */
  constructor(config: CircularPositionBufferConfig = {}) {
    this.capacity = config.capacity ?? 30;
    this.minDistance = config.minDistance ?? 1.0;
    this.minDistanceSq = this.minDistance * this.minDistance;
    this.minTimeInterval = config.minTimeInterval ?? 0.0;
    this.maxDiscontinuityDistance = config.maxDiscontinuityDistance ?? 100.0;
    this.maxDiscontinuityDistanceSq = this.maxDiscontinuityDistance * this.maxDiscontinuityDistance;
    this.startAlpha = config.startAlpha ?? 1.0;
    this.endAlpha = config.endAlpha ?? 0.0;
    this.startWidthScale = config.startWidthScale ?? 1.0;
    this.endWidthScale = config.endWidthScale ?? 0.1;

    this.xBuffer = new Float32Array(this.capacity);
    this.yBuffer = new Float32Array(this.capacity);
    this.zBuffer = new Float32Array(this.capacity);
    this.rotBuffer = new Float32Array(this.capacity);
    this.timeBuffer = new Float32Array(this.capacity);

    this.pointsPool = new Array(this.capacity);
    this.activePointsView = new Array(this.capacity);

    for (let i = 0; i < this.capacity; i++) {
      const pt: TrailBufferPoint = {
        x: 0,
        y: 0,
        z: 0,
        rotation: 0,
        time: 0,
        alpha: 1.0,
        widthScale: 1.0
      };
      this.pointsPool[i] = pt;
      this.activePointsView[i] = pt;
    }
    this.activePointsView.length = 0;
  }

  /**
   * Pushes a new position into the circular buffer if sampling thresholds (distance/time) are met.
   *
   * @param x - Entity world X position.
   * @param y - Entity world Y position.
   * @param rotation - Entity rotation angle in radians (default: 0).
   * @param time - Current timestamp or simulation time (default: 0).
   * @param z - Entity world Z position or depth offset (default: 0).
   * @returns `true` if position sample was recorded, `false` if rejected by sampling rate.
   */
  public pushPosition(x: number, y: number, rotation: number = 0, time: number = 0, z: number = 0): boolean {
    if (this.count > 0) {
      const lastX = this.xBuffer[this.headIndex];
      const lastY = this.yBuffer[this.headIndex];
      const lastZ = this.zBuffer[this.headIndex];
      const lastTime = this.timeBuffer[this.headIndex];

      const dx = x - lastX;
      const dy = y - lastY;
      const dz = z - lastZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dt = time - lastTime;

      // Detect object pool recycling or teleport jump
      if (this.maxDiscontinuityDistanceSq > 0 && distSq > this.maxDiscontinuityDistanceSq) {
        this.clear();
      } else {
        const hasDistanceThreshold = this.minDistanceSq > 0;
        const hasTimeThreshold = this.minTimeInterval > 0;

        const satisfiesDistance = hasDistanceThreshold ? distSq >= this.minDistanceSq : true;
        const satisfiesTime = hasTimeThreshold ? dt >= this.minTimeInterval : true;

        if (hasDistanceThreshold && hasTimeThreshold) {
          if (!satisfiesDistance && !satisfiesTime) return false;
        } else if (hasDistanceThreshold) {
          if (!satisfiesDistance) return false;
        } else if (hasTimeThreshold) {
          if (!satisfiesTime) return false;
        }
      }
    }

    this.headIndex = (this.headIndex + 1) % this.capacity;
    this.xBuffer[this.headIndex] = x;
    this.yBuffer[this.headIndex] = y;
    this.zBuffer[this.headIndex] = z;
    this.rotBuffer[this.headIndex] = rotation;
    this.timeBuffer[this.headIndex] = time;

    if (this.count < this.capacity) {
      this.count++;
    }

    return true;
  }

  /**
   * Retrieves active historical points ordered from head (newest, index 0) to tail (oldest, index count-1).
   *
   * @remarks
   * Reuses pre-allocated `TrailBufferPoint` instances and array view without creating heap allocations.
   *
   * @returns Readonly array of point structures.
   */
  public getPoints(): readonly TrailBufferPoint[] {
    const currentCount = this.count;
    this.activePointsView.length = currentCount;

    if (currentCount === 0) {
      return this.activePointsView;
    }

    const maxI = currentCount - 1;
    for (let i = 0; i < currentCount; i++) {
      const ringIdx = (this.headIndex - i + this.capacity) % this.capacity;
      const pt = this.pointsPool[i];

      pt.x = this.xBuffer[ringIdx];
      pt.y = this.yBuffer[ringIdx];
      pt.z = this.zBuffer[ringIdx];
      pt.rotation = this.rotBuffer[ringIdx];
      pt.time = this.timeBuffer[ringIdx];

      const t = maxI > 0 ? i / maxI : 0;
      pt.alpha = this.startAlpha + (this.endAlpha - this.startAlpha) * t;
      pt.widthScale = this.startWidthScale + (this.endWidthScale - this.startWidthScale) * t;

      this.activePointsView[i] = pt;
    }

    return this.activePointsView;
  }

  /**
   * Clears all recorded history points instantly without freeing memory buffers.
   */
  public clear(): void {
    this.headIndex = -1;
    this.count = 0;
    this.activePointsView.length = 0;
  }

  /**
   * Returns `true` if no points are currently stored in the buffer.
   */
  public isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Returns `true` if the buffer has reached maximum capacity.
   */
  public isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Gets current count of recorded points.
   */
  public getCount(): number {
    return this.count;
  }

  /**
   * Gets buffer total point capacity.
   */
  public getCapacity(): number {
    return this.capacity;
  }

  /**
   * Gets minimum distance sampling threshold.
   */
  public getMinDistance(): number {
    return this.minDistance;
  }

  /**
   * Sets minimum distance sampling threshold.
   */
  public setMinDistance(dist: number): void {
    this.minDistance = Math.max(0, dist);
    this.minDistanceSq = this.minDistance * this.minDistance;
  }

  /**
   * Gets minimum time interval sampling threshold.
   */
  public getMinTimeInterval(): number {
    return this.minTimeInterval;
  }

  /**
   * Sets minimum time interval sampling threshold.
   */
  public setMinTimeInterval(interval: number): void {
    this.minTimeInterval = Math.max(0, interval);
  }

  /**
   * Configures fade alpha parameters.
   */
  public setAlphaRange(startAlpha: number, endAlpha: number): void {
    this.startAlpha = startAlpha;
    this.endAlpha = endAlpha;
  }

  /**
   * Configures width scaling parameters.
   */
  public setWidthScaleRange(startScale: number, endScale: number): void {
    this.startWidthScale = startScale;
    this.endWidthScale = endScale;
  }
}
