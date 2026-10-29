import type { HitAndRunThemeModule } from "../types";
import { SumiETheme, SUMI_E_PALETTE } from "../../rendering/theme/sumi-e/SumiETheme";

export const sumiEThemeModule: HitAndRunThemeModule = {
  id: "sumi-e",
  displayName: "Ukiyo-e Sumi-e",
  palette: SUMI_E_PALETTE,
  createTheme: () => new SumiETheme()
};
