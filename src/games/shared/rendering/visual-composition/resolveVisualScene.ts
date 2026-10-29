import {
  LevelVisualDefinition,
  ResolvedVisualInstance,
  ResolvedVisualScene,
  VisualAnchor,
  VisualCompositionCatalog,
  VisualCompositionIssue,
  VisualCompositionResult,
  VisualCoordinateSpace,
  VisualInstanceDefinition,
  VisualLayerRole,
  VisualPrefabDefinition
} from "./VisualCompositionTypes";

const COORDINATE_SPACES = new Set<VisualCoordinateSpace>(["world", "screen", "parallax"]);
const LAYER_ROLES = new Set<VisualLayerRole>([
  "far-background", "atmosphere", "midground", "settlement", "foreground", "effects"
]);
const ANCHORS = new Set<VisualAnchor>(["top-left", "center", "bottom-center"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function issue(issues: VisualCompositionIssue[], path: string, message: string): void {
  issues.push({ path, message });
}
function validatePoint(value: unknown, path: string, issues: VisualCompositionIssue[]): boolean {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    issue(issues, path, "must contain finite numeric x and y values");
    return false;
  }
  return true;
}

function validateInstance(
  value: unknown,
  path: string,
  issues: VisualCompositionIssue[],
  seenIds: Set<string>,
  catalog: VisualCompositionCatalog
): value is VisualInstanceDefinition {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  let valid = true;
  if (!isNonEmptyString(value.id)) {
    issue(issues, `${path}.id`, "must be a non-empty string");
    valid = false;
  } else if (seenIds.has(value.id)) {
    issue(issues, `${path}.id`, `duplicate instance id "${value.id}"`);
    valid = false;
  } else seenIds.add(value.id);

  if (!isNonEmptyString(value.asset)) {
    issue(issues, `${path}.asset`, "must be a non-empty semantic asset id");
    valid = false;
  } else if (!catalog.assets.getAsset(value.asset)) {
    issue(issues, `${path}.asset`, `unknown asset "${value.asset}"`);
    valid = false;
  }
  if (!COORDINATE_SPACES.has(value.space as VisualCoordinateSpace)) {
    issue(issues, `${path}.space`, 'must be "world", "screen" or "parallax"');
    valid = false;
  }
  if (!validatePoint(value.position, `${path}.position`, issues)) valid = false;
  if (value.scale !== undefined &&
    (!isRecord(value.scale) || !isFiniteNumber(value.scale.x) || !isFiniteNumber(value.scale.y)
      || value.scale.x <= 0 || value.scale.y <= 0)) {
    issue(issues, `${path}.scale`, "must contain finite positive x and y values");
    valid = false;
  }
  if (value.rotation !== undefined && !isFiniteNumber(value.rotation)) {
    issue(issues, `${path}.rotation`, "must be a finite number in radians");
    valid = false;
  }
  if (value.opacity !== undefined && (!isFiniteNumber(value.opacity) || value.opacity < 0 || value.opacity > 1)) {
    issue(issues, `${path}.opacity`, "must be between 0 and 1 inclusive");
    valid = false;
  }
  if (value.flipX !== undefined && typeof value.flipX !== "boolean") {
    issue(issues, `${path}.flipX`, "must be a boolean");
    valid = false;
  }
  return valid;
}

function validatePrefab(
  prefab: VisualPrefabDefinition,
  catalog: VisualCompositionCatalog,
  issues: VisualCompositionIssue[]
): void {
  if (prefab.schemaVersion !== 1) issue(issues, `prefabs.${prefab.id}.schemaVersion`, "unsupported schema version");
  if (!Array.isArray(prefab.instances)) {
    issue(issues, `prefabs.${prefab.id}.instances`, "must be an array");
    return;
  }
  const ids = new Set<string>();
  prefab.instances.forEach((instance, index) =>
    validateInstance(instance, `prefabs.${prefab.id}.instances[${index}]`, issues, ids, catalog)
  );
}

/** Validate an authoring document and all references without loading any asset. */
export function validateVisualComposition(
  definition: unknown,
  catalog: VisualCompositionCatalog
): VisualCompositionResult<LevelVisualDefinition> {
  const issues: VisualCompositionIssue[] = [];
  if (!isRecord(definition)) {
    return { ok: false, issues: [{ path: "$", message: "must be an object" }] };
  }
  if (definition.schemaVersion !== 1) issue(issues, "schemaVersion", "unsupported schema version; expected 1");
  if (!isNonEmptyString(definition.id)) issue(issues, "id", "must be a non-empty string");
  if (!isNonEmptyString(definition.theme)) issue(issues, "theme", "must be a non-empty theme id");
  if (!Array.isArray(definition.layers)) {
    issue(issues, "layers", "must be an array");
    return { ok: false, issues };
  }

  const prefabIds = new Set(catalog.prefabs?.keys() ?? []);
  const layerIds = new Set<string>();
  const instanceIds = new Set<string>();
  definition.layers.forEach((rawLayer, index) => {
    const path = `layers[${index}]`;
    if (!isRecord(rawLayer)) {
      issue(issues, path, "must be an object");
      return;
    }
    if (!isNonEmptyString(rawLayer.id)) issue(issues, `${path}.id`, "must be a non-empty string");
    else if (layerIds.has(rawLayer.id)) issue(issues, `${path}.id`, `duplicate layer id "${rawLayer.id}"`);
    else layerIds.add(rawLayer.id);

    if (!LAYER_ROLES.has(rawLayer.role as VisualLayerRole)) issue(issues, `${path}.role`, "unsupported layer role");
    if (!isFiniteNumber(rawLayer.order)) issue(issues, `${path}.order`, "must be a finite number");
    if (!COORDINATE_SPACES.has(rawLayer.space as VisualCoordinateSpace)) issue(issues, `${path}.space`, "unsupported coordinate space");
    if (rawLayer.space === "parallax" &&
      (!isFiniteNumber(rawLayer.parallaxFactor) || rawLayer.parallaxFactor < 0)) {
      issue(issues, `${path}.parallaxFactor`, "parallax layers require a finite non-negative factor");
    }
    if (rawLayer.position !== undefined) validatePoint(rawLayer.position, `${path}.position`, issues);
    if (rawLayer.instances !== undefined && !Array.isArray(rawLayer.instances)) {
      issue(issues, `${path}.instances`, "must be an array");
    }
    if (rawLayer.prefab !== undefined) {
      if (!isNonEmptyString(rawLayer.prefab)) issue(issues, `${path}.prefab`, "must be a non-empty prefab id");
      else if (!prefabIds.has(rawLayer.prefab)) issue(issues, `${path}.prefab`, `unknown prefab "${rawLayer.prefab}"`);
    }
    if (rawLayer.instances !== undefined && Array.isArray(rawLayer.instances)) {
      rawLayer.instances.forEach((instance, instanceIndex) =>
        validateInstance(instance, `${path}.instances[${instanceIndex}]`, issues, instanceIds, catalog)
      );
    }
  });
  for (const prefab of catalog.prefabs?.values() ?? []) validatePrefab(prefab, catalog, issues);

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: definition as unknown as LevelVisualDefinition };
}

/**
 * Resolve fixed placements into renderer-neutral data. No ECS entities, asset
 * loads, image decoding, Canvas or Skia objects are created here.
 */
export function resolveVisualScene(
  definition: LevelVisualDefinition,
  catalog: VisualCompositionCatalog
): VisualCompositionResult<ResolvedVisualScene> {
  const validation = validateVisualComposition(definition, catalog);
  if (!validation.ok) return validation;

  const resolved: ResolvedVisualInstance[] = [];
  const layers = [...definition.layers].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  for (const layer of layers) {
    const layerInstances: VisualInstanceDefinition[] = [...(layer.instances ?? [])];
    if (layer.prefab) {
      const prefab = catalog.prefabs?.get(layer.prefab);
      if (prefab) layerInstances.push(...prefab.instances.map(instance => ({
        ...instance,
        id: `${layer.id}/${instance.id}`,
        space: layer.space
      })));
    }
    layerInstances.forEach((instance, instanceOrder) => {
      const asset = catalog.assets.getAsset(instance.asset);
      // Validation above guarantees the asset exists; keep this guard for adapters
      // whose registry may change between validation and resolution.
      if (!asset) return;
      resolved.push({
        id: instance.id,
        asset: instance.asset,
        layerId: layer.id,
        layerRole: layer.role,
        layerOrder: layer.order,
        instanceOrder,
        space: layer.space,
        position: {
          x: instance.position.x + (layer.position?.x ?? 0),
          y: instance.position.y + (layer.position?.y ?? 0)
        },
        scale: { x: instance.scale?.x ?? 1, y: instance.scale?.y ?? 1 },
        rotation: instance.rotation ?? 0,
        opacity: instance.opacity ?? 1,
        flipX: instance.flipX ?? false,
        anchor: asset.anchor && ANCHORS.has(asset.anchor) ? asset.anchor : "bottom-center"
      });
    });
  }
  return {
    ok: true,
    value: { schemaVersion: 1, levelId: definition.id, themeId: definition.theme, instances: resolved }
  };
}
