import type { ArkanoidThemeModule } from "../types";
import { ROW_GRADIENT_PALETTE } from "../../rendering/ArkanoidPalette";

export const classicTheme: ArkanoidThemeModule = {
  id: "classic",
  displayName: "Synthwave",
  tokens: { rowGradient: ROW_GRADIENT_PALETTE }
};
