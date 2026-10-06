import { colors } from "./colors";

/**
 * Shared semantic color mapping where colors reflect explicit gameplay roles.
 * @public
 */
export const GAMEPLAY_COLOR_MAP = {
  Player: "#00E5FF",           // Player Cyan
  Enemy: "#FF2A6D",            // Enemy Magenta / Pink
  PlayerProjectile: "#FFE600", // Player Projectile Yellow
  EnemyProjectile: "#FF5A5A",  // Enemy Projectile Red
  Pickup: "#00FF41",           // Pickup / Buff Green
  Boss: "#FFD700",             // Boss Gold
  Hit: "#FFFFFF",              // Hit / Flash White
  Warning: "#FF9B3D",          // Warning / Threat Orange
} as const;

export type GameplayColorRole = keyof typeof GAMEPLAY_COLOR_MAP;

/**
 * Role lookup priority mapping for resolving role keys against active ECS `Theme` resource.
 */
const ROLE_THEME_KEYS: Record<GameplayColorRole, string[]> = {
  Player: ["player", "player-ship", "primary"],
  Enemy: ["enemy", "asteroid", "boss", "accent"],
  PlayerProjectile: ["player-bullet", "bullet", "secondary"],
  EnemyProjectile: ["enemy-bullet", "bullet", "accent"],
  Pickup: ["shield", "buff", "primary"],
  Boss: ["boss", "enemy", "accent"],
  Hit: ["white", "primary"],
  Warning: ["warning", "accent"],
};

/**
 * Resolves a semantic gameplay color role from the active ECS world theme or fallback `GAMEPLAY_COLOR_MAP`.
 *
 * @param role - Semantic gameplay color role.
 * @param world - Optional ECS world instance to resolve theme overrides.
 * @returns Hex color string corresponding to the gameplay role.
 * @public
 */
export function getGameplayColor(
  role: GameplayColorRole,
  world?: { getResource: <T>(key: string) => T | undefined }
): string {
  if (world) {
    const theme = world.getResource<{ colorMap?: Record<string, string> }>("Theme");
    if (theme && theme.colorMap) {
      const keys = ROLE_THEME_KEYS[role] ?? [role.toLowerCase()];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key && theme.colorMap[key] !== undefined) {
          return theme.colorMap[key];
        }
      }
    }
  }
  return GAMEPLAY_COLOR_MAP[role];
}
