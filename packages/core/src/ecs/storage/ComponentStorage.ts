import { Entity } from "../Entity";

/**
 * Interface representing component storage abstraction.
 *
 * @typeParam T - Component data payload type.
 * @internal
 */
export interface ComponentStorage<T> {
  get(entity: Entity): T | undefined;
  set(entity: Entity, component: T): void;
  delete(entity: Entity): boolean;
  has(entity: Entity): boolean;
  entities(): Iterable<Entity>;
  values(): Iterable<T>;
  entries(): Iterable<[Entity, T]>;
  forEach(callback: (value: T, entity: Entity) => void): void;
  clear(): void;
  readonly size: number;
}
