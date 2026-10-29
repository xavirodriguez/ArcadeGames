import type { HitAndRunThemeModule } from "../types";
import { FantasyTheme, FANTASY_PALETTE_TOKENS } from "../../rendering/theme/fantasy/FantasyTheme";

export const fantasyThemeModule: HitAndRunThemeModule = {
  id: "fantasy",
  displayName: "Dark Fantasy",
  palette: FANTASY_PALETTE_TOKENS,
  createTheme: () => new FantasyTheme()
};
