/**
 * An Entity is represented by a unique numerical identifier packing slot index and generation.
 *
 * @remarks
 * In this ECS implementation, entities are light-weight handles. Their
 * actual data is stored in component maps within the {@link World}.
 * @public
 */
export type Entity = number;

/**
 * Number of bits dedicated to the slot index (20 bits allows 1,048,575 concurrent entities).
 * @public
 */
export const INDEX_BITS = 20;

/**
 * Mask for extracting the slot index (0xFFFFF).
 * @public
 */
export const INDEX_MASK = (1 << INDEX_BITS) - 1;

/**
 * Packs a slot index and generation into a single 32-bit Entity integer.
 * @public
 */
export function packEntity(index: number, generation: number): Entity {
  return ((generation & 0xFFF) << INDEX_BITS) | (index & INDEX_MASK);
}

/**
 * Extracts the slot index from a packed Entity integer.
 * @public
 */
export function unpackEntityIndex(entity: Entity): number {
  return entity & INDEX_MASK;
}

/**
 * Extracts the generation from a packed Entity integer.
 * @public
 */
export function unpackEntityGeneration(entity: Entity): number {
  return (entity >> INDEX_BITS) & 0xFFF;
}
