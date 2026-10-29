import { createAsteroidsVisualModFacade } from "../createVisualModFacade";
import { icebergGameplayMod } from "./IcebergGameplayMod";
import { icebergTheme } from "./IcebergTheme";

/** Legacy compatibility facade; presentation and gameplay responsibilities are split. */
export const icebergMod = createAsteroidsVisualModFacade(icebergTheme, icebergGameplayMod);
