import { createSpaceInvadersModFacade } from "../createVisualModFacade";
import { classicTheme } from "./ClassicTheme";
import { classicGameplayMod } from "./ClassicGameplayMod";

/** Legacy facade retained for existing imports of classicMod. */
export const classicMod = createSpaceInvadersModFacade(classicTheme, classicGameplayMod);
