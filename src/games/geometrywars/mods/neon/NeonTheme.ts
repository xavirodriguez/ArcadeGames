import type { GeometryWarsThemeModule } from "../types";
import { GEOMETRY_WARS_VISUAL_TOKENS } from "../../rendering/GeometryWarsVisualTokens";

/**
 * Default neon Geometry Wars aesthetic. Tokens only — drawers stay in rendering/.
 */
export const neonTheme: GeometryWarsThemeModule = {
  id: "neon",
  displayName: "Neon",
  tokens: GEOMETRY_WARS_VISUAL_TOKENS
};
