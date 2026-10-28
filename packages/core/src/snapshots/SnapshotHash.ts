import { SoAWorldSnapshot } from "./WorldSnapshot";
import { isSnapshotComponentExcluded } from "./SnapshotExclusionPolicy";

const floatBuffer = new Float64Array(1);
const byteBuffer = new Uint8Array(floatBuffer.buffer);

interface SnapshotHeader {
  tick: number;
  seed: number;
  rngState?: number;
  entities: number[] | Int32Array;
}

function hashSnapshotHeader(header: SnapshotHeader): number {
  let hash = 2166136261;

  hash = hashInt32(hash, header.tick);
  hash = hashInt32(hash, header.seed);
  if (header.rngState !== undefined) {
    hash = hashInt32(hash, header.rngState);
  }

  const entities = header.entities;
  hash = hashInt32(hash, entities.length);
  for (let i = 0; i < entities.length; i++) {
    hash = hashInt32(hash, entities[i]);
  }

  return hash;
}

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
export function hashSoA(snapshot: SoAWorldSnapshot): string {
  let hash = hashSnapshotHeader(snapshot);

  // 3. Hash Component Data
  const soaComponentData = snapshot.soaComponentData;
  if (soaComponentData) {
    const types = Object.keys(soaComponentData).filter(type => !isSnapshotComponentExcluded(type)).sort();
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
export function hashAoS(snapshot: {
  tick: number;
  entities: number[];
  componentData: Record<string, Record<number, unknown>>;
  seed: number;
  rngState?: number;
}): string {
  let hash = hashSnapshotHeader(snapshot);

  const componentData = snapshot.componentData;
  if (componentData) {
    const types = Object.keys(componentData).filter(type => !isSnapshotComponentExcluded(type)).sort();
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

function compareStableKeys(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Builds a deterministic ordering key for non-numeric Map/Set entries before hashing them. */
function stableValueKey(value: unknown, ancestors = new WeakSet<object>()): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const valueType = typeof value;
  if (valueType === "string") return `string:${JSON.stringify(value)}`;
  if (valueType === "boolean") return value ? "boolean:1" : "boolean:0";
  if (valueType === "number") {
    if (Number.isNaN(value as number)) return "number:NaN";
    if (Object.is(value, -0)) return "number:-0";
    return `number:${String(value)}`;
  }
  if (valueType === "bigint") return `bigint:${String(value)}`;
  if (valueType !== "object") return `${valueType}:${String(value)}`;

  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    throw new Error("Snapshot hashing requires acyclic component data.");
  }
  ancestors.add(objectValue);

  try {
    if (value instanceof Date) return `date:${value.getTime()}`;

    if (value instanceof Map) {
      const entries = Array.from(value.entries(), ([key, entryValue]) => [
        stableValueKey(key, ancestors),
        stableValueKey(entryValue, ancestors)
      ] as const);
      entries.sort((left, right) =>
        compareStableKeys(left[0], right[0]) || compareStableKeys(left[1], right[1])
      );
      return `map:{${entries.map(([key, entryValue]) => `${key}=>${entryValue}`).join("|")}}`;
    }

    if (value instanceof Set) {
      const entries = Array.from(value, entry => stableValueKey(entry, ancestors)).sort(compareStableKeys);
      return `set:{${entries.join("|")}}`;
    }

    if (value instanceof ArrayBuffer) {
      const bytes = new Uint8Array(value);
      return `arraybuffer:${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
    }

    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      const name = (value as { constructor: { name: string } }).constructor.name;
      const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      return `view:${name}:${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
    }

    if (Array.isArray(value)) {
      return `array:[${value.map(entry => stableValueKey(entry, ancestors)).join("|")}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort(compareStableKeys);
    return `object:{${keys.map(key => `${JSON.stringify(key)}:${stableValueKey(record[key], ancestors)}`).join("|")}}`;
  } finally {
    ancestors.delete(objectValue);
  }
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
  if (type === "bigint") {
    hash = hashInt32(hash, 6);
    return hashString(hash, (val as bigint).toString());
  }
  if (Array.isArray(val)) {
    hash = hashInt32(hash, 4);
    hash = hashInt32(hash, val.length);
    for (let i = 0; i < val.length; i++) {
      hash = hashValue(hash, val[i]);
    }
    return hash;
  }
  if (val instanceof Date) {
    hash = hashInt32(hash, 7);
    return hashFloat64(hash, val.getTime());
  }
  if (val instanceof Map) {
    hash = hashInt32(hash, 8);
    hash = hashInt32(hash, val.size);
    const entries = Array.from(val.entries(), ([key, entryValue]) => ({
      key,
      entryValue,
      keySort: stableValueKey(key),
      valueSort: stableValueKey(entryValue)
    }));
    entries.sort((left, right) =>
      compareStableKeys(left.keySort, right.keySort) || compareStableKeys(left.valueSort, right.valueSort)
    );
    for (const entry of entries) {
      hash = hashValue(hash, entry.key);
      hash = hashValue(hash, entry.entryValue);
    }
    return hash;
  }
  if (val instanceof Set) {
    hash = hashInt32(hash, 9);
    hash = hashInt32(hash, val.size);
    const entries = Array.from(val, entry => ({ entry, sortKey: stableValueKey(entry) }));
    entries.sort((left, right) => compareStableKeys(left.sortKey, right.sortKey));
    for (const entry of entries) hash = hashValue(hash, entry.entry);
    return hash;
  }
  if (val instanceof ArrayBuffer) {
    hash = hashInt32(hash, 10);
    const bytes = new Uint8Array(val);
    hash = hashInt32(hash, bytes.length);
    for (let i = 0; i < bytes.length; i++) hash = hashInt32(hash, bytes[i]);
    return hash;
  }
  if (ArrayBuffer.isView(val)) {
    hash = hashInt32(hash, 11);
    const view = val as ArrayBufferView;
    const name = (val as { constructor: { name: string } }).constructor.name;
    hash = hashString(hash, name);
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    hash = hashInt32(hash, bytes.length);
    for (let i = 0; i < bytes.length; i++) hash = hashInt32(hash, bytes[i]);
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
