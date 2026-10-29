/**
 * Renderer-neutral contracts for declarative level visuals.
 *
 * This module intentionally contains no renderer, ECS, asset-loader or DOM
 * dependencies. Authoring documents can be validated and resolved in tests or
 * tooling without decoding images.
 */

export type VisualCoordinateSpace = "world" | "screen" | "parallax";
export type VisualLayerRole =
  | "far-background"
  | "atmosphere"
  | "midground"
  | "settlement"
  | "foreground"
  | "effects";
export type VisualAnchor = "top-left" | "center" | "bottom-center";

export interface VisualPoint {
  x: number;
  y: number;
}

export interface VisualScale {
  x: number;
  y: number;
}

export interface VisualAssetDefinition {
  /** Stable semantic key resolved by the existing asset registry. */
  id: string;
  /** Optional source dimensions; informational, never duplicated per instance. */
  nominalSize?: { width: number; height: number };
  anchor?: VisualAnchor;
  tags?: readonly string[];
}

export interface VisualInstanceDefinition {
  id: string;
  asset: string;
  position: VisualPoint;
  space: VisualCoordinateSpace;
  scale?: VisualScale;
  rotation?: number;
  opacity?: number;
  flipX?: boolean;
}

export interface VisualPrefabDefinition {
  schemaVersion: 1;
  id: string;
  instances: readonly VisualInstanceDefinition[];
}

export interface VisualLayerDefinition {
  id: string;
  role: VisualLayerRole;
  order: number;
  space: VisualCoordinateSpace;
  /** Required for parallax layers; ignored for world and screen layers. */
  parallaxFactor?: number;
  instances?: readonly VisualInstanceDefinition[];
  prefab?: string;
  position?: VisualPoint;
}

export interface LevelVisualDefinition {
  schemaVersion: 1;
  id: string;
  theme: string;
  layers: readonly VisualLayerDefinition[];
}

export interface ResolvedVisualInstance {
  readonly id: string;
  readonly asset: string;
  readonly layerId: string;
  readonly layerRole: VisualLayerRole;
  readonly layerOrder: number;
  readonly instanceOrder: number;
  readonly space: VisualCoordinateSpace;
  /** Present for parallax instances; inherited from the containing layer. */
  readonly parallaxFactor?: number;
  readonly position: Readonly<VisualPoint>;
  readonly scale: Readonly<VisualScale>;
  readonly rotation: number;
  readonly opacity: number;
  readonly flipX: boolean;
  readonly anchor: VisualAnchor;
}

export interface ResolvedVisualScene {
  readonly schemaVersion: 1;
  readonly levelId: string;
  readonly themeId: string;
  /** Stable order: layer order, then authored order within the layer. */
  readonly instances: readonly ResolvedVisualInstance[];
}

export interface VisualCompositionIssue {
  readonly path: string;
  readonly message: string;
}

export type VisualCompositionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly VisualCompositionIssue[] };

export interface VisualAssetResolver {
  /** Returns metadata only; must not load/decode a resource. */
  getAsset(id: string): VisualAssetDefinition | undefined;
}

export interface VisualCompositionCatalog {
  readonly assets: VisualAssetResolver;
  readonly prefabs?: ReadonlyMap<string, VisualPrefabDefinition>;
}
