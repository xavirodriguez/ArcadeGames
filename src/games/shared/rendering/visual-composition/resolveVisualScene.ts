import {
  LevelVisualDefinition,
  ResolvedVisualInstance,
  ResolvedVisualScene,
  VisualAnchor,
  VisualAnchorPoint,
  VisualCompositionCatalog,
  VisualCompositionIssue,
  VisualCompositionResult,
  VisualCoordinateSpace,
  VisualInstanceDefinition,
  VisualLayerRole,
  VisualPrefabDefinition
} from "./VisualCompositionTypes";

const COORDINATE_SPACES = new Set<VisualCoordinateSpace>(["world", "screen", "parallax"]);
const LAYER_ROLES = new Set<VisualLayerRole>(["far-background", "atmosphere", "midground", "settlement", "foreground", "effects"]);
const ANCHORS = new Set<VisualAnchor>(["top-left", "center", "bottom-center"]);
const ROLE_DEPTH: Record<VisualLayerRole, number> = {
  "far-background": 0, atmosphere: 1, midground: 2, settlement: 3, foreground: 4, effects: 5
};
const LEVEL_KEYS = new Set(["schemaVersion", "id", "theme", "layers"]);
const LAYER_KEYS = new Set(["id", "role", "order", "space", "parallaxFactor", "items", "position"]);
const INSTANCE_KEYS = new Set(["id", "asset", "position", "scale", "rotation", "opacity", "flipX"]);
const POINT_KEYS = new Set(["x", "y"]);
const SCALE_KEYS = new Set(["x", "y"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function issue(issues: VisualCompositionIssue[], path: string, message: string): void {
  issues.push({ path, message });
}
function strictKeys(value: Record<string, unknown>, allowed: Set<string>, path: string, issues: VisualCompositionIssue[]): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) issue(issues, `${path}.${key}`, "unknown key");
}
function validatePoint(value: unknown, path: string, issues: VisualCompositionIssue[]): boolean {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object with finite x and y values");
    return false;
  }
  strictKeys(value, POINT_KEYS, path, issues);
  if (!finite(value.x) || !finite(value.y)) {
    issue(issues, path, "must contain finite numeric x and y values");
    return false;
  }
  return true;
}
function validateInstance(
  value: unknown, path: string, issues: VisualCompositionIssue[], seenIds: Set<string>, catalog: VisualCompositionCatalog
): value is VisualInstanceDefinition {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  strictKeys(value, INSTANCE_KEYS, path, issues);
  let valid = true;
  if (!nonEmpty(value.id)) {
    issue(issues, `${path}.id`, "must be a non-empty string"); valid = false;
  } else if (seenIds.has(value.id)) {
    issue(issues, `${path}.id`, `duplicate instance id "${value.id}" within prefab/layer`); valid = false;
  } else seenIds.add(value.id);
  if (!nonEmpty(value.asset)) {
    issue(issues, `${path}.asset`, "must be a non-empty semantic asset id"); valid = false;
  } else if (!catalog.assets.getAsset(value.asset)) {
    issue(issues, `${path}.asset`, `unknown asset "${value.asset}"`); valid = false;
  }
  if (!validatePoint(value.position, `${path}.position`, issues)) valid = false;
  if (value.scale !== undefined) {
    if (!isRecord(value.scale)) {
      issue(issues, `${path}.scale`, "must contain finite positive x and y values"); valid = false;
    } else {
      strictKeys(value.scale, SCALE_KEYS, `${path}.scale`, issues);
      if (!finite(value.scale.x) || !finite(value.scale.y) || value.scale.x <= 0 || value.scale.y <= 0) {
        issue(issues, `${path}.scale`, "must contain finite positive x and y values"); valid = false;
      }
    }
  }
  if (value.rotation !== undefined && !finite(value.rotation)) {
    issue(issues, `${path}.rotation`, "must be a finite number in radians"); valid = false;
  }
  if (value.opacity !== undefined && (!finite(value.opacity) || value.opacity < 0 || value.opacity > 1)) {
    issue(issues, `${path}.opacity`, "must be between 0 and 1 inclusive"); valid = false;
  }
  if (value.flipX !== undefined && typeof value.flipX !== "boolean") {
    issue(issues, `${path}.flipX`, "must be a boolean"); valid = false;
  }
  return valid;
}
function validatePrefab(prefab: VisualPrefabDefinition, key: string, catalog: VisualCompositionCatalog, issues: VisualCompositionIssue[]): void {
  const path = `prefabs.${key}`;
  if (prefab.id !== key) issue(issues, path, `map key "${key}" must match prefab.id "${prefab.id}"`);
  if (prefab.schemaVersion !== 1) issue(issues, `${path}.schemaVersion`, "unsupported schema version");
  if (!Array.isArray(prefab.instances)) {
    issue(issues, `${path}.instances`, "must be an array"); return;
  }
  const ids = new Set<string>();
  prefab.instances.forEach((instance, index) => validateInstance(instance, `${path}.instances[${index}]`, issues, ids, catalog));
}

export function validateVisualComposition(
  definition: unknown, catalog: VisualCompositionCatalog
): VisualCompositionResult<LevelVisualDefinition> {
  const issues: VisualCompositionIssue[] = [];
  if (!isRecord(definition)) return { ok: false, issues: [{ path: "$", message: "must be an object" }] };
  strictKeys(definition, LEVEL_KEYS, "$", issues);
  if (definition.schemaVersion !== 1) issue(issues, "schemaVersion", "unsupported schema version; expected 1");
  if (!nonEmpty(definition.id)) issue(issues, "id", "must be a non-empty string");
  if (!nonEmpty(definition.theme)) issue(issues, "theme", "must be a non-empty theme id");
  else if (!catalog.themes.has(definition.theme)) issue(issues, "theme", `unknown theme "${definition.theme}"`);
  if (!Array.isArray(definition.layers)) {
    issue(issues, "layers", "must be an array");
    return { ok: false, issues };
  }

  const layerIds = new Set<string>();
  const layersForDepth: Array<{ id: string; order: number; role: VisualLayerRole }> = [];
  const usedPrefabs = new Set<string>();
  definition.layers.forEach((rawLayer, index) => {
    const path = `layers[${index}]`;
    if (!isRecord(rawLayer)) { issue(issues, path, "must be an object"); return; }
    strictKeys(rawLayer, LAYER_KEYS, path, issues);
    if (!nonEmpty(rawLayer.id)) issue(issues, `${path}.id`, "must be a non-empty string");
    else if (layerIds.has(rawLayer.id)) issue(issues, `${path}.id`, `duplicate layer id "${rawLayer.id}"`);
    else layerIds.add(rawLayer.id);

    const roleValid = LAYER_ROLES.has(rawLayer.role as VisualLayerRole);
    if (!roleValid) issue(issues, `${path}.role`, "unsupported layer role");
    if (!finite(rawLayer.order)) issue(issues, `${path}.order`, "must be a finite number");
    else if (roleValid && nonEmpty(rawLayer.id)) layersForDepth.push({ id: rawLayer.id, order: rawLayer.order, role: rawLayer.role as VisualLayerRole });
    if (!COORDINATE_SPACES.has(rawLayer.space as VisualCoordinateSpace)) issue(issues, `${path}.space`, "unsupported coordinate space");
    if (rawLayer.space === "parallax" && (!finite(rawLayer.parallaxFactor) || rawLayer.parallaxFactor < 0)) {
      issue(issues, `${path}.parallaxFactor`, "parallax layers require a finite non-negative factor");
    } else if (rawLayer.space !== "parallax" && rawLayer.parallaxFactor !== undefined) {
      issue(issues, `${path}.parallaxFactor`, "is only valid for parallax layers");
    }
    if (rawLayer.position !== undefined) validatePoint(rawLayer.position, `${path}.position`, issues);
    if (!Array.isArray(rawLayer.items)) {
      issue(issues, `${path}.items`, "must be an ordered array of instance/prefab items");
      return;
    }
    const localIds = new Set<string>();
    rawLayer.items.forEach((rawItem, itemIndex) => {
      const itemPath = `${path}.items[${itemIndex}]`;
      if (!isRecord(rawItem)) { issue(issues, itemPath, "must be an object"); return; }
      if (rawItem.kind === "instance") {
        strictKeys(rawItem, new Set(["kind", "instance"]), itemPath, issues);
        validateInstance(rawItem.instance, `${itemPath}.instance`, issues, localIds, catalog);
      } else if (rawItem.kind === "prefab") {
        strictKeys(rawItem, new Set(["kind", "id", "prefab", "position"]), itemPath, issues);
        if (!nonEmpty(rawItem.id)) issue(issues, `${itemPath}.id`, "prefab placement requires a non-empty id");
        else if (localIds.has(rawItem.id)) issue(issues, `${itemPath}.id`, `duplicate layer item id "${rawItem.id}"`);
        else localIds.add(rawItem.id);
        if (!nonEmpty(rawItem.prefab)) issue(issues, `${itemPath}.prefab`, "must be a non-empty prefab id");
        else if (!catalog.prefabs?.has(rawItem.prefab)) issue(issues, `${itemPath}.prefab`, `unknown prefab "${rawItem.prefab}"`);
        else usedPrefabs.add(rawItem.prefab);
        if (rawItem.position !== undefined) validatePoint(rawItem.position, `${itemPath}.position`, issues);
      } else issue(issues, `${itemPath}.kind`, 'must be "instance" or "prefab"');
    });
  });

  const sortedLayers = [...layersForDepth].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = 1; i < sortedLayers.length; i++) {
    const previous = sortedLayers[i - 1];
    const current = sortedLayers[i];
    if (ROLE_DEPTH[current.role] < ROLE_DEPTH[previous.role]) {
      issue(issues, `layers.order`, `role/order conflict: "${current.id}" (${current.role}) is ordered behind "${previous.id}" (${previous.role})`);
    }
  }
  for (const prefabId of usedPrefabs) {
    const prefab = catalog.prefabs?.get(prefabId);
    if (prefab) validatePrefab(prefab, prefabId, catalog, issues);
  }
  if (issues.length) return { ok: false, issues };
  return { ok: true, value: definition as unknown as LevelVisualDefinition };
}

export function resolveVisualScene(
  definition: LevelVisualDefinition, catalog: VisualCompositionCatalog
): VisualCompositionResult<ResolvedVisualScene> {
  const validation = validateVisualComposition(definition, catalog);
  if (!validation.ok) return validation;
  const resolved: ResolvedVisualInstance[] = [];
  const resolutionIssues: VisualCompositionIssue[] = [];
  const resolvedIds = new Set<string>();
  let resolvedInstanceOrder = 0;
  const layers = [...definition.layers].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (const layer of layers) {
    layer.items.forEach((item, itemIndex) => {
      if (item.kind === "instance") {
        const instance = item.instance;
        const asset = catalog.assets.getAsset(instance.asset);
        const resolvedId = `${layer.id}/${instance.id}`;
        if (resolvedIds.has(resolvedId)) {
          issue(resolutionIssues, `layers.${layer.id}.items[${itemIndex}].instance.id`, `resolved ID collision "${resolvedId}"`);
          return;
        }
        if (!asset) {
          issue(resolutionIssues, `layers.${layer.id}.items[${itemIndex}].instance.asset`, `unknown asset "${instance.asset}" after validation`);
          return;
        }
        if (asset.anchor !== undefined && !ANCHORS.has(asset.anchor)) {
          issue(resolutionIssues, `assets.${asset.id}.anchor`, `unsupported anchor "${String(asset.anchor)}"`);
          return;
        }
        resolvedIds.add(resolvedId);
        resolved.push(resolveInstance(instance, resolvedId, layer.id, layer.role, layer.order, resolvedInstanceOrder++, layer.space, layer.parallaxFactor, layer.position, asset.anchor ?? "bottom-center"));
      } else {
        const prefab = catalog.prefabs?.get(item.prefab);
        if (!prefab) {
          issue(resolutionIssues, `layers.${layer.id}.items[${itemIndex}].prefab`, `unknown prefab "${item.prefab}" after validation`);
          return;
        }
        prefab.instances.forEach((instance, prefabIndex) => {
          const asset = catalog.assets.getAsset(instance.asset);
          const resolvedId = `${layer.id}/${item.id}/${instance.id}`;
          if (resolvedIds.has(resolvedId)) {
            issue(resolutionIssues, `layers.${layer.id}.items[${itemIndex}].prefab`, `resolved ID collision "${resolvedId}"`);
            return;
          }
          if (!asset) {
            issue(resolutionIssues, `prefabs.${prefab.id}.instances[${prefabIndex}].asset`, `unknown asset "${instance.asset}" after validation`);
            return;
          }
          if (asset.anchor !== undefined && !ANCHORS.has(asset.anchor)) {
            issue(resolutionIssues, `assets.${asset.id}.anchor`, `unsupported anchor "${String(asset.anchor)}"`);
            return;
          }
          resolvedIds.add(resolvedId);
          const position = { x: instance.position.x + (item.position?.x ?? 0), y: instance.position.y + (item.position?.y ?? 0) };
          resolved.push(resolveInstance({ ...instance, position }, resolvedId, layer.id, layer.role, layer.order, resolvedInstanceOrder++, layer.space, layer.parallaxFactor, layer.position, asset.anchor ?? "bottom-center"));
        });
      }
    });
  }
  if (resolutionIssues.length) return { ok: false, issues: resolutionIssues };
  return { ok: true, value: { schemaVersion: 1, levelId: definition.id, themeId: definition.theme, instances: resolved } };
}

function toNormalizedAnchor(anchor: VisualAnchor): VisualAnchorPoint {
  switch (anchor) {
    case "top-left": return { x: 0, y: 0 };
    case "center": return { x: 0.5, y: 0.5 };
    case "bottom-center": return { x: 0.5, y: 1 };
  }
}

function resolveInstance(
  instance: VisualInstanceDefinition, id: string, layerId: string, layerRole: VisualLayerRole, layerOrder: number,
  instanceOrder: number, space: VisualCoordinateSpace, parallaxFactor: number | undefined,
  layerPosition: { x: number; y: number } | undefined, anchor: VisualAnchor
): ResolvedVisualInstance {
  return {
    id, asset: instance.asset, layerId, layerRole, layerOrder, instanceOrder, space,
    ...(space === "parallax" ? { parallaxFactor } : {}),
    position: { x: instance.position.x + (layerPosition?.x ?? 0), y: instance.position.y + (layerPosition?.y ?? 0) },
    scale: { x: instance.scale?.x ?? 1, y: instance.scale?.y ?? 1 },
    rotation: instance.rotation ?? 0, opacity: instance.opacity ?? 1, flipX: instance.flipX ?? false, anchor: toNormalizedAnchor(anchor)
  };
}
