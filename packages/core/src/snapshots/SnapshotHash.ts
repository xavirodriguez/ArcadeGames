import { SoAWorldSnapshot } from "./WorldSnapshot";

const floatBuffer = new Float64Array(1);
const byteBuffer = new Uint8Array(floatBuffer.buffer);

/**
 * High-performance zero-allocation FNV-1a hashing utilities for Structure of Arrays (SoA) snapshots.
 *
 * @remarks
 * `hashSoA` calculates a 32-bit FNV-1a hash over binary buffers (`Float64Array` and `Int32Array`)
 * without creating intermediate JSON strings or heap allocations in the numeric path.
 *
 * @param snapshot - The Structure of Arrays snapshot to hash.
 * @returns 8-character hexadecimal state hash string.
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con snapshots/SnapshotHash.ts:93-108. Considerar extraer a función compartida. Ref: 5dee7222
export function hashSoA(snapshot: SoAWorldSnapshot): string {
  let hash = 2166136261;

  // 1. Hash tick, seed, rngState
  hash = hashInt32(hash, snapshot.tick);
  hash = hashInt32(hash, snapshot.seed);
  if (snapshot.rngState !== undefined) {
    hash = hashInt32(hash, snapshot.rngState);
  }

  // 2. Hash active entities array
  const entities = snapshot.entities;
  hash = hashInt32(hash, entities.length);
  for (let i = 0; i < entities.length; i++) {
    hash = hashInt32(hash, entities[i]);
  }

  // 3. Hash Component Data
  const soaComponentData = snapshot.soaComponentData;
  if (soaComponentData) {
    const types = Object.keys(soaComponentData).sort();
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      hash = hashString(hash, type);

      const compData = soaComponentData[type];
      if (!compData) continue;

      // Hash keys schema
      const keys = compData.keys;
      hash = hashInt32(hash, keys.length);
      for (let k = 0; k < keys.length; k++) {
        hash = hashString(hash, keys[k]);
      }

      // Hash entities buffer
      const compEntities = compData.entities;
      hash = hashInt32(hash, compEntities.length);
      for (let e = 0; e < compEntities.length; e++) {
        hash = hashInt32(hash, compEntities[e]);
      }

      // Hash values buffer (Float64Array)
      const values = compData.values;
      hash = hashInt32(hash, values.length);
      for (let v = 0; v < values.length; v++) {
        hash = hashFloat64(hash, values[v]);
      }

      // Hash non-numeric values if present
      const nonNumeric = compData.nonNumericValues;
      if (nonNumeric) {
        hash = hashInt32(hash, nonNumeric.length);
        for (let n = 0; n < nonNumeric.length; n++) {
          hash = hashValue(hash, nonNumeric[n]);
        }
      }
    }
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Calculates an FNV-1a state hash for Array of Structures (AoS) snapshots without intermediate stringification.
 *
 * @param snapshot - The AoS snapshot object to hash.
 * @returns 8-character hexadecimal state hash string.
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con snapshots/SnapshotHash.ts:18-36. Considerar extraer a función compartida. Ref: a8d6766c
export function hashAoS(snapshot: {
  tick: number;
  entities: number[];
  componentData: Record<string, Record<number, unknown>>;
  seed: number;
  rngState?: number;
}): string {
  let hash = 2166136261;

  hash = hashInt32(hash, snapshot.tick);
  hash = hashInt32(hash, snapshot.seed);
  if (snapshot.rngState !== undefined) {
    hash = hashInt32(hash, snapshot.rngState);
  }

  const entities = snapshot.entities;
  hash = hashInt32(hash, entities.length);
  for (let i = 0; i < entities.length; i++) {
    hash = hashInt32(hash, entities[i]);
  }

  const componentData = snapshot.componentData;
  if (componentData) {
    const types = Object.keys(componentData).sort();
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      hash = hashString(hash, type);

      const entityMap = componentData[type];
      if (!entityMap) continue;

      const entityKeys = Object.keys(entityMap).map(Number).sort((a, b) => a - b);
      hash = hashInt32(hash, entityKeys.length);

      for (let j = 0; j < entityKeys.length; j++) {
        const entityId = entityKeys[j];
        hash = hashInt32(hash, entityId);
        hash = hashValue(hash, entityMap[entityId]);
      }
    }
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function hashInt32(hash: number, val: number): number {
  val = val | 0;
  hash ^= val & 0xff;
  hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) | 0;
  hash ^= (val >>> 8) & 0xff;
  hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) | 0;
  hash ^= (val >>> 16) & 0xff;
  hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) | 0;
  hash ^= (val >>> 24) & 0xff;
  hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) | 0;
  return hash;
}

function hashFloat64(hash: number, val: number): number {
  floatBuffer[0] = val;
  for (let b = 0; b < 8; b++) {
    hash ^= byteBuffer[b];
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) | 0;
  }
  return hash;
}

function hashString(hash: number, str: string): number {
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) | 0;
  }
  return hash;
}

function hashValue(hash: number, val: unknown): number {
  if (val === null || val === undefined) {
    return hashInt32(hash, 0);
  }
  const type = typeof val;
  if (type === "boolean") {
    return hashInt32(hash, val ? 1 : 2);
  }
  if (type === "number") {
    return hashFloat64(hash, val as number);
  }
  if (type === "string") {
    hash = hashInt32(hash, 3);
    return hashString(hash, val as string);
  }
  if (Array.isArray(val)) {
    hash = hashInt32(hash, 4);
    hash = hashInt32(hash, val.length);
    for (let i = 0; i < val.length; i++) {
      hash = hashValue(hash, val[i]);
    }
    return hash;
  }
  if (type === "object") {
    hash = hashInt32(hash, 5);
    const keys = Object.keys(val as object).sort();
    hash = hashInt32(hash, keys.length);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      hash = hashString(hash, k);
      hash = hashValue(hash, (val as Record<string, unknown>)[k]);
    }
    return hash;
  }
  return hash;
}
