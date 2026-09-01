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
/**
 * Generic base role keys shared across games.
 * @public
 */
export type CommonRoleKey = "primary" | "secondary" | "accent" | "player" | "enemy" | "bullet" | "boss" | "shield";

/**
 * Role keys for Asteroids.
 * @public
 */
export type AsteroidsRoleKey = CommonRoleKey | "player-ship" | "player-bullet" | "asteroid" | "asteroid-large" | "asteroid-medium" | "asteroid-small";

/**
 * Role keys for Space Invaders.
 * @public
 */
export type SpaceInvadersRoleKey = CommonRoleKey | "invader" | "invader_commander" | "invader_scout" | "commander" | "scout" | "ufo";

/**
 * Role keys for Pong.
 * @public
 */
export type PongRoleKey = CommonRoleKey | "ball" | "paddle" | "left" | "right";

/**
 * Role keys for Flappy Bird.
 * @public
 */
export type FlappyBirdRoleKey = CommonRoleKey | "bird" | "pipe" | "ground";

/**
 * Role keys for Platformer.
 * @public
 */
export type PlatformerRoleKey = CommonRoleKey | "sentinel" | "hopper" | "charger" | "fragment" | "coin" | "goal" | "tilemap";

/**
 * Role keys for Geometry Wars.
 * @public
 */
export type GeometryWarsRoleKey = CommonRoleKey | "chaser" | "evader" | "grunt" | "seeker" | "fast_seeker";

/**
 * Union of all valid role keys across supported games.
 * @public
 */
export type GameRoleKey =
  | AsteroidsRoleKey
  | SpaceInvadersRoleKey
  | PongRoleKey
  | FlappyBirdRoleKey
  | PlatformerRoleKey
  | GeometryWarsRoleKey;

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
 * @typeParam TRole - Specific role key union for strict colorMap and spriteMap typing.
 *
 * @public
 */
export interface Theme<TRole extends string = string> {
  /**
   * Mapping of logical entity roles (e.g., `"player-ship"`, `"enemy-basic"`, `"bullet"`)
   * to actual asset keys registered in the asset provider.
   */
  spriteMap: Partial<Record<TRole, string>>;

  /**
   * Mapping of logical entity roles or theme color keys (e.g., `"player"`, `"primary"`, `"accent"`)
   * to color hexadecimal strings or color tokens.
   */
  colorMap: Partial<Record<TRole, string>>;

  /**
   * Optional lore or narrative HUD texts indexed by logical key (e.g., `"title"`, `"subtitle"`).
   */
  lore?: Record<string, string>;
}

/**
 * Resolves an entity's color from the active `Theme` resource registered in `world`.
 * Evaluates candidate role keys in priority order until a match is found.
 *
 * @param world - The ECS `World` instance containing the `Theme` resource.
 * @param roles - Priority list of role keys to evaluate in `colorMap`.
 * @returns Resolved color string or `undefined` if not found.
 *
 * @public
 */
export function resolveThemeColor<TRole extends string = GameRoleKey>(world: { getResource: <T>(key: string) => T | undefined }, ...roles: TRole[]): string | undefined {
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  if (theme && theme.colorMap) {
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      if (role && theme.colorMap[role] !== undefined) {
        return theme.colorMap[role];
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[resolveThemeColor] None of the specified roles [${roles.join(", ")}] were found in active theme colorMap.`);
  }

  return undefined;
}

/**
 * Resolves an entity's color from the active `Theme` resource registered in `world`.
 * Evaluates candidate role keys in priority order until a match is found, falling back to a default color.
 *
 * @param world - The ECS `World` instance containing the `Theme` resource.
 * @param fallbackColor - Hardcoded or default token color to return if no role matches.
 * @param roles - Priority list of role keys to evaluate in `colorMap`.
 * @returns Resolved color string.
 *
 * @public
 */
export function resolveThemeColorWithFallback<TRole extends string = GameRoleKey>(world: { getResource: <T>(key: string) => T | undefined }, fallbackColor: string, ...roles: TRole[]): string {
  const resolved = resolveThemeColor(world, ...roles);
  return resolved ?? fallbackColor;
}
