/**
 * Renderer-neutral contracts for declarative level visuals.
 * This module has no renderer, ECS, asset-loader or DOM dependencies.
 */
export type VisualCoordinateSpace = "world" | "screen" | "parallax";
export type VisualLayerRole = "far-background" | "atmosphere" | "midground" | "settlement" | "foreground" | "effects";
export type VisualAnchor = "top-left" | "center" | "bottom-center";
export interface VisualPoint { x: number; y: number }
/** Normalized destination anchor: (0,0) top-left, (0.5,0.5) center, (0.5,1) feet. */
export interface VisualAnchorPoint { readonly x: number; readonly y: number }
export interface VisualScale { x: number; y: number }
export interface VisualAssetDefinition {
  id: string;
  nominalSize?: { width: number; height: number };
  anchor?: VisualAnchor;
  tags?: readonly string[];
}
export interface VisualInstanceDefinition {
  id: string;
  asset: string;
  position: VisualPoint;
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
export type VisualLayerItemDefinition =
  | { kind: "instance"; instance: VisualInstanceDefinition }
  | { kind: "prefab"; id: string; prefab: string; position?: VisualPoint };
export interface VisualLayerDefinition {
  id: string;
  role: VisualLayerRole;
  order: number;
  space: VisualCoordinateSpace;
  /** Parallax convention: 0 is camera-fixed; 1 moves at world-camera speed. */
  parallaxFactor?: number;
  /** One ordered list permits direct instances and prefab placements to interleave. */
  items: readonly VisualLayerItemDefinition[];
  /** Applied to every item in the layer, including prefab placements. */
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
  readonly parallaxFactor?: number;
  readonly position: Readonly<VisualPoint>;
  readonly scale: Readonly<VisualScale>;
  readonly rotation: number;
  readonly opacity: number;
  readonly flipX: boolean;
  readonly anchor: VisualAnchorPoint;
}
export interface ResolvedVisualScene {
  readonly schemaVersion: 1;
  readonly levelId: string;
  readonly themeId: string;
  readonly instances: readonly ResolvedVisualInstance[];
}
export interface VisualCompositionIssue { readonly path: string; readonly message: string }
export type VisualCompositionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly VisualCompositionIssue[] };
export interface VisualAssetResolver {
  /** Metadata lookup only; must not load or decode a resource. */
  getAsset(id: string): VisualAssetDefinition | undefined;
}
export interface VisualCompositionCatalog {
  readonly assets: VisualAssetResolver;
  readonly themes: ReadonlySet<string>;
  readonly prefabs?: ReadonlyMap<string, VisualPrefabDefinition>;
}
