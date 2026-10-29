import { createOutrunVisualModFacade } from "../createVisualModFacade";
import { classicTheme } from "./ClassicTheme";
import { classicGameplayMod } from "./ClassicGameplayMod";

/** Legacy facade: existing ClassicMod imports continue to expose the same visual methods. */
export const classicMod = createOutrunVisualModFacade(classicTheme, classicGameplayMod);
