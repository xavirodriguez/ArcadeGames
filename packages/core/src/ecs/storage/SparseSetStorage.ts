import { ComponentStorage } from "./ComponentStorage";
import { Entity, unpackEntityIndex } from "../Entity";

/**
 * Data-oriented component storage using sparse sets.
 *
 * @remarks
 * Maintains parallel `dense` (component payload) and `denseEntities` arrays,
 * with a `sparse` Int32Array mapping unpacked entity slot indices to dense array indices.
 * Elements are stored sorted by Entity ID to ensure deterministic iteration order.
 *
 * @typeParam T - Component data payload type.
 * @internal
 */
export class SparseSetStorage<T> implements ComponentStorage<T> {
  public dense: T[] = [];
  public denseEntities: Entity[] = [];
  public sparse: Int32Array;

  constructor(initialCapacity = 1024) {
    this.sparse = new Int32Array(initialCapacity);
    this.sparse.fill(-1);
  }

  private ensureSparseCapacity(index: number): void {
    if (index >= this.sparse.length) {
      let newCap = this.sparse.length * 2;
      while (newCap <= index) {
        newCap *= 2;
      }
      const newSparse = new Int32Array(newCap);
      newSparse.fill(-1);
      newSparse.set(this.sparse);
      this.sparse = newSparse;
    }
  }

  private updateSparseIndices(startIdx: number): void {
    const len = this.denseEntities.length;
    for (let k = startIdx; k < len; k++) {
      this.sparse[unpackEntityIndex(this.denseEntities[k])] = k;
    }
  }

  private getDenseIndex(entity: Entity): number {
    const idx = unpackEntityIndex(entity);
    if (idx >= this.sparse.length) return -1;
    const denseIdx = this.sparse[idx];
    if (denseIdx < 0 || denseIdx >= this.denseEntities.length) return -1;
    if (this.denseEntities[denseIdx] !== entity) return -1;
    return denseIdx;
  }

  public get(entity: Entity): T | undefined {
    const denseIdx = this.getDenseIndex(entity);
    return denseIdx >= 0 ? this.dense[denseIdx] : undefined;
  }

  public has(entity: Entity): boolean {
    return this.getDenseIndex(entity) >= 0;
  }

  public set(entity: Entity, component: T): void {
    const idx = unpackEntityIndex(entity);
    this.ensureSparseCapacity(idx);
    const existingDenseIdx = this.sparse[idx];

    if (
      existingDenseIdx >= 0 &&
      existingDenseIdx < this.denseEntities.length &&
      this.denseEntities[existingDenseIdx] === entity
    ) {
      this.dense[existingDenseIdx] = component;
      return;
    }

    let low = 0;
    let high = this.denseEntities.length - 1;
    let insertIdx = this.denseEntities.length;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.denseEntities[mid] > entity) {
        insertIdx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    this.denseEntities.splice(insertIdx, 0, entity);
    this.dense.splice(insertIdx, 0, component);
    this.updateSparseIndices(insertIdx);
  }

  public delete(entity: Entity): boolean {
    const denseIdx = this.getDenseIndex(entity);
    if (denseIdx < 0) return false;

    const idx = unpackEntityIndex(entity);
    this.denseEntities.splice(denseIdx, 1);
    this.dense.splice(denseIdx, 1);
    this.sparse[idx] = -1;
    this.updateSparseIndices(denseIdx);

    return true;
  }

  public entities(): Iterable<Entity> {
    return this.denseEntities;
  }

  public values(): Iterable<T> {
    return this.dense;
  }

  public *entries(): IterableIterator<[Entity, T]> {
    for (let i = 0; i < this.denseEntities.length; i++) {
      yield [this.denseEntities[i], this.dense[i]];
    }
  }

  public forEach(callback: (value: T, entity: Entity) => void): void {
    for (let i = 0; i < this.denseEntities.length; i++) {
      callback(this.dense[i], this.denseEntities[i]);
    }
  }

  public clear(): void {
    this.dense.length = 0;
    this.denseEntities.length = 0;
    this.sparse.fill(-1);
  }

  public get size(): number {
    return this.denseEntities.length;
  }
}
