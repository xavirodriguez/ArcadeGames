import { ComponentStorage } from "./ComponentStorage";
import { Entity } from "../Entity";

/**
 * Trivial wrapper over standard JS Map implementing ComponentStorage.
 *
 * @typeParam T - Component data payload type.
 * @internal
 */
export class MapStorage<T> implements ComponentStorage<T> {
  private map = new Map<Entity, T>();

  public get(entity: Entity): T | undefined {
    return this.map.get(entity);
  }

  public set(entity: Entity, component: T): void {
    this.map.set(entity, component);
  }

  public delete(entity: Entity): boolean {
    return this.map.delete(entity);
  }

  public has(entity: Entity): boolean {
    return this.map.has(entity);
  }

  public entities(): Iterable<Entity> {
    return this.map.keys();
  }

  public values(): Iterable<T> {
    return this.map.values();
  }

  public entries(): Iterable<[Entity, T]> {
    return this.map.entries();
  }

  public forEach(callback: (value: T, entity: Entity) => void): void {
    this.map.forEach((val, key) => callback(val, key));
  }

  public clear(): void {
    this.map.clear();
  }

  public get size(): number {
    return this.map.size;
  }
}
