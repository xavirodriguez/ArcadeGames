/**
 * Generic object pool implementation.
 *
 * @remarks
 * Designed to help reduce garbage collector pressure in high-frequency paths by
 * reusing objects. Overall effectiveness depends on the implementation of the factory
 * and reset functions, as well as the nature of the objects being pooled.
 *
 * When `maxSize` is set, `release` discards objects once the idle pool is full so
 * the idle buffer cannot grow without bound under acquire/release imbalance.
 *
 * @warning **Stale Data**: Failure to correctly implement the `reset` function may
 * lead to "memory" effects where recycled objects retain state from previous usages.
 * @public
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset?: (obj: T) => void;
  /** Maximum number of idle instances retained. `undefined` means unbounded (legacy). */
  private readonly maxSize: number | undefined;

  /**
   * @param factory - Creates a new instance when the idle pool is empty.
   * @param reset - Optional reset applied on release before the instance is stored.
   * @param initialSize - Pre-warm count (clamped to `maxSize` when set).
   * @param maxSize - Optional cap on idle instances. Releases beyond the cap are dropped.
   */
  constructor(factory: () => T, reset?: (obj: T) => void, initialSize = 0, maxSize?: number) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize =
      maxSize !== undefined && Number.isFinite(maxSize) && maxSize >= 0
        ? Math.floor(maxSize)
        : undefined;

    const warm = this.maxSize !== undefined ? Math.min(initialSize, this.maxSize) : initialSize;
    for (let i = 0; i < warm; i++) {
      this.pool.push(this.factory());
    }
  }

  /** Retrieves an available instance from the pool or allocates a new one via factory. */
  public acquire(): T {
    const obj = this.pool.pop() || this.factory();
    return obj;
  }

  /**
   * Returns an instance to the pool after running the optional reset handler.
   * If the idle pool is already at `maxSize`, the instance is not retained (eligible for GC).
   */
  public release(obj: T): void {
    if (this.reset) {
      this.reset(obj);
    }
    if (this.maxSize !== undefined && this.pool.length >= this.maxSize) {
      return;
    }
    this.pool.push(obj);
  }

  /** Empties all pooled instances. */
  public clear(): void {
    this.pool = [];
  }

  /** Current number of available pooled instances in storage. */
  public get size(): number {
    return this.pool.length;
  }

  /** Configured idle capacity limit, or `undefined` when unbounded. */
  public get capacity(): number | undefined {
    return this.maxSize;
  }
}
