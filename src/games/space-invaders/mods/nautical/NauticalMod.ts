import { createSpaceInvadersModFacade } from "../createVisualModFacade";
import { nauticalTheme } from "./NauticalTheme";
import { nauticalGameplayMod } from "./NauticalGameplayMod";

/** Legacy facade retained for existing imports of nauticalMod. */
export const nauticalMod = createSpaceInvadersModFacade(nauticalTheme, nauticalGameplayMod);
