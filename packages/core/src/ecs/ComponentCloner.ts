/**
 * Utility for deep cloning component data.
 *
 * @internal
 *
 * @remarks
 * Clones arrays, plain objects, Map, Set, Date, ArrayBuffer, DataView, and typed arrays.
 * Circular references and shared references are preserved by the clone operation. Class instances
 * retain enumerable own data only; prototypes, methods, private state, and external native handles
 * are not reconstructed. Snapshot hashing requires acyclic data even though cloning can preserve cycles.
 */
export class ComponentCloner {
  /**
   * Performs a deep clone of the provided value.
   *
   * @param component - The value to clone.
   * @returns A deep clone with mutable nested values isolated from the source.
   *
   * @example
   * ```ts
   * const cloned = ComponentCloner.cloneComponent({ x: 10, y: 20 });
   * ```
   */
  public static cloneComponent<T>(component: T): T {
    return this.cloneValue(component, new WeakMap<object, unknown>()) as T;
  }

  private static cloneValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
    if (value === null || typeof value !== "object") return value;

    const previous = seen.get(value);
    if (previous !== undefined) return previous;

    if (value instanceof Date) {
      const clone = new Date(value.getTime());
      seen.set(value, clone);
      return clone;
    }

    if (value instanceof Map) {
      const clone = new Map<unknown, unknown>();
      seen.set(value, clone);
      for (const [key, entryValue] of value) {
        clone.set(this.cloneValue(key, seen), this.cloneValue(entryValue, seen));
      }
      return clone;
    }

    if (value instanceof Set) {
      const clone = new Set<unknown>();
      seen.set(value, clone);
      for (const entry of value) clone.add(this.cloneValue(entry, seen));
      return clone;
    }

    if (value instanceof ArrayBuffer) {
      const clone = value.slice(0);
      seen.set(value, clone);
      return clone;
    }

    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      const copiedBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      const clone: ArrayBufferView = value instanceof DataView
        ? new DataView(copiedBuffer)
        : new (value.constructor as { new (buffer: ArrayBufferLike): ArrayBufferView })(copiedBuffer);
      seen.set(value, clone);
      return clone;
    }

    if (Array.isArray(value)) {
      const clone: unknown[] = [];
      seen.set(value, clone);
      for (const entry of value) clone.push(this.cloneValue(entry, seen));
      return clone;
    }

    const clone: Record<string, unknown> = {};
    seen.set(value, clone);
    const source = value as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      clone[key] = this.cloneValue(source[key], seen);
    }
    return clone;
  }
}
