import { createAsteroidsVisualModFacade } from "../createVisualModFacade";
import { classicGameplayMod } from "./ClassicGameplayMod";
import { classicTheme } from "./ClassicTheme";

/** Legacy compatibility facade; new code should depend on classicTheme or classicGameplayMod. */
export const classicMod = createAsteroidsVisualModFacade(classicTheme, classicGameplayMod);
