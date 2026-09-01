/**
 * Resource key string used to store and access the `Theme` instance in the `World`.
 * @public
 */
export const THEME_RESOURCE_KEY = "Theme";

/**
 * Interface representing visual skin, asset mappings, and narrative lore configuration
 * injected into the game world as a transversal ECS resource.
 *
 * @remarks
 * The `Theme` resource decouples asset keys, color palettes, and text strings from underlying
 * game systems and mechanics. Entity factories read from this resource to resolve `assetKey`,
 * `color`, and lore texts, allowing game reskinning without altering simulation code.
 *
 * To create a custom lore pack:
 * 1. Construct a `Theme` object with your custom `spriteMap`, `colorMap`, and optional `lore`.
 * 2. Pass it in `BaseGameConfig.theme` when creating a game session or set it directly on the `World`
 *    via `world.setResource("Theme", customTheme)`.
 *
 * @public
 */
export interface Theme {
  /**
   * Mapping of logical entity roles (e.g., `"player-ship"`, `"enemy-basic"`, `"bullet"`)
   * to actual asset keys registered in the asset provider.
   */
  spriteMap: Record<string, string>;

  /**
   * Mapping of logical entity roles or theme color keys (e.g., `"player"`, `"primary"`, `"accent"`)
   * to color hexadecimal strings or color tokens.
   */
  colorMap: Record<string, string>;

  /**
   * Optional lore or narrative HUD texts indexed by logical key (e.g., `"title"`, `"subtitle"`).
   */
  lore?: Record<string, string>;
}
