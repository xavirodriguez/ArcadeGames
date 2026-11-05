import { ComponentCloner } from "../ecs/ComponentCloner";
import type { InternalWorldAccess } from "./SnapshotInternalAccess";

/** Plain snapshot payload shared by AoS and SoA layouts. */
export interface SnapshotResourceState {
  /** Registered resource names, including names whose resource is currently absent. */
  snapshotResourceKeys: string[];
  /** Values present for registered resource names at capture time. */
  snapshotResources: Record<string, unknown>;
}

function assertSnapshotValue(value: unknown, resourceName: string, path: string, ancestors: WeakSet<object>): void {
  if (value === null || value === undefined) return;
  const kind = typeof value;
  if (kind === "string" || kind === "boolean" || kind === "number" || kind === "bigint") return;
  if (kind === "function" || kind === "symbol") {
    throw new Error(`[Snapshot] Resource "${resourceName}" contains unsupported ${kind} at ${path}.`);
  }
  if (kind !== "object") {
    throw new Error(`[Snapshot] Resource "${resourceName}" contains unsupported value at ${path}.`);
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    throw new Error(`[Snapshot] Resource "${resourceName}" contains a circular reference at ${path}.`);
  }
  if (value instanceof WeakMap || value instanceof WeakSet || value instanceof Promise) {
    throw new Error(`[Snapshot] Resource "${resourceName}" contains a non-serializable object at ${path}.`);
  }

  if (value instanceof Date || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return;
  if (!(Array.isArray(value) || value instanceof Map || value instanceof Set)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`[Snapshot] Resource "${resourceName}" contains a class instance at ${path}; use plain data.`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error(`[Snapshot] Resource "${resourceName}" contains symbol keys at ${path}.`);
    }
  }

  ancestors.add(objectValue);
  try {
    if (value instanceof Map) {
      let index = 0;
      for (const [key, entryValue] of value) {
        assertSnapshotValue(key, resourceName, `${path}.<key:${index}>`, ancestors);
        assertSnapshotValue(entryValue, resourceName, `${path}.<value:${index}>`, ancestors);
        index++;
      }
    } else if (value instanceof Set || Array.isArray(value)) {
      let index = 0;
      for (const entry of value) assertSnapshotValue(entry, resourceName, `${path}[${index++}]`, ancestors);
    } else {
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        assertSnapshotValue((value as Record<string, unknown>)[key], resourceName, `${path}.${key}`, ancestors);
      }
    }
  } finally {
    ancestors.delete(objectValue);
  }
}

/** Captures only explicitly registered resources; presentation and service resources stay outside snapshots. */
export function captureSnapshotResources(internal: InternalWorldAccess): SnapshotResourceState {
  const snapshotResourceKeys = Array.from(internal.snapshotResourceNames).sort();
  const snapshotResources: Record<string, unknown> = {};

  for (const name of snapshotResourceKeys) {
    if (!internal.resources.has(name)) continue;
    const value = internal.resources.get(name);
    assertSnapshotValue(value, name, name, new WeakSet<object>());
    snapshotResources[name] = ComponentCloner.cloneComponent(value);
  }

  return { snapshotResourceKeys, snapshotResources };
}

/** Restores the exact registered-resource set and its captured values. */
export function restoreSnapshotResources(
  internal: InternalWorldAccess,
  state: Partial<SnapshotResourceState>
): void {
  if (state.snapshotResourceKeys === undefined || state.snapshotResources === undefined) return;

  const keys = state.snapshotResourceKeys;
  const keySet = new Set<string>();
  for (const name of keys) {
    if (typeof name !== "string" || name.length === 0 || keySet.has(name)) {
      throw new Error("[Snapshot] Invalid or duplicate snapshot resource key.");
    }
    keySet.add(name);
  }

  for (const name of internal.snapshotResourceNames) {
    if (!keySet.has(name)) internal.resources.delete(name);
  }

  internal.snapshotResourceNames.clear();
  for (const name of keys) internal.snapshotResourceNames.add(name);

  for (const name of Object.keys(state.snapshotResources)) {
    if (!keySet.has(name)) {
      throw new Error(`[Snapshot] Resource value "${name}" is not present in snapshotResourceKeys.`);
    }
    const value = state.snapshotResources[name];
    assertSnapshotValue(value, name, name, new WeakSet<object>());
    internal.resources.set(name, ComponentCloner.cloneComponent(value));
  }

  for (const name of keys) {
    if (!Object.prototype.hasOwnProperty.call(state.snapshotResources, name)) {
      internal.resources.delete(name);
    }
  }
}
